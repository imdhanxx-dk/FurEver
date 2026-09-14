import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../lib/server/router';
import { DEFAULT_CONFIG } from '../lib/game/catalog';
import { initialState } from '../lib/game/engine';

test('the API withholds game state, assets, admin and mutations until approval, then immediately enforces revocation', async () => {
  const savedFetch = globalThis.fetch;
  const env = {
    APP_ORIGIN: 'https://beta.example.test',
    SUPABASE_URL: 'https://database.example.test',
    SUPABASE_SECRET_KEY: 'test-only',
    DISCORD_CLIENT_ID: 'test-only',
    DISCORD_CLIENT_SECRET: 'test-only',
    ADMIN_DISCORD_ID: '987654321987654321',
  };
  const previous = Object.fromEntries(
    Object.keys(env).map((k) => [k, process.env[k]]),
  );
  Object.assign(process.env, env);
  const guest = '123456789123456789';
  let approved: string[] = [];
  let mutations = 0;
  globalThis.fetch = (async (
    input: string | URL | Request,
    options?: RequestInit,
  ) => {
    const url = String(input);
    if (url.includes('/sessions?'))
      return Response.json([
        {
          user_id: 'test-user',
          csrf: 'test-csrf',
          users: { discord_id: guest, suspended: false },
          expires_at: new Date(Date.now() + 60_000).toISOString(),
        },
      ]);
    if (url.includes('/game_config?'))
      return Response.json([
        { value: { ...DEFAULT_CONFIG, betaDiscordIds: approved } },
      ]);
    if (url.includes('/players?'))
      return Response.json([{ state: initialState(Date.now()), revision: 4 }]);
    if (url.includes('/operations?')) return Response.json([]);
    if (url.endsWith('/rpc/commit_game') && approved.includes(guest)) {
      const args = JSON.parse(String(options?.body));
      return Response.json(args.p_response);
    }
    if (url.endsWith('/security_events'))
      return new Response(null, { status: 204 });
    if (options?.method === 'POST') mutations++;
    throw new Error('Unexpected data access');
  }) as typeof fetch;
  const call = (path: string, method = 'GET') =>
    handle(
      new Request(env.APP_ORIGIN + '/api/' + path, {
        method,
        headers: {
          Cookie: 'furever_session=' + 'a'.repeat(64),
          Origin: env.APP_ORIGIN,
          'x-csrf-token': 'test-csrf',
        },
      }),
    );
  try {
    const pending = await (await call('bootstrap')).json() as Record<string, unknown>;
    assert.equal(pending.betaPending, true);
    assert.equal('state' in pending, false);
    assert.equal('config' in pending, false);
    for (const [path, method] of [
      ['assets/00000000-0000-0000-0000-000000000000', 'GET'],
      ['admin/beta', 'GET'],
      ['action', 'POST'],
      ['generate', 'POST'],
      ['mora', 'POST'],
    ])
      assert.equal((await call(path, method)).status, 403);
    assert.equal(mutations, 0);
    approved = [guest];
    const allowed = await (await call('bootstrap')).json() as {authenticated:boolean;state:unknown;config:Record<string,unknown>};
    assert.equal(allowed.authenticated, true);
    assert.ok(allowed.state);
    assert.equal('betaDiscordIds' in allowed.config, false);
    approved = [];
    assert.equal((await call('action', 'POST')).status, 403);
    assert.equal(mutations, 0);
  } finally {
    globalThis.fetch = savedFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
