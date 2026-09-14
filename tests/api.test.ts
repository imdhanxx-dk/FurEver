import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readApiResponse } from '../lib/client/api';
import { configured, databaseHeaders, studioEnabled } from '../lib/server/env';

test('creative studio stays disabled even with legacy API credentials', () => {
  assert.equal(studioEnabled({}), false);
  assert.equal(studioEnabled({ AI_PROVIDER_API_KEY: 'test-only' }), false);
  assert.equal(studioEnabled({ AI_STUDIO_ENABLED: 'true' }), false);
  assert.equal(
    studioEnabled({
      AI_PROVIDER_API_KEY: 'test-only',
      AI_STUDIO_ENABLED: 'false',
    }),
    false,
  );
  assert.equal(
    studioEnabled({
      AI_PROVIDER_API_KEY: 'test-only',
      AI_STUDIO_ENABLED: 'true',
    }),
    false,
  );
});

test('an HTML access page gives a recovery action instead of a JSON syntax error', async () => {
  await assert.rejects(
    readApiResponse(
      new Response('<!DOCTYPE html><title>Sign in</title>', {
        status: 401,
        headers: { 'Content-Type': 'text/html' },
      }),
    ),
    /site access has expired.*Reload FurEver/,
  );
});
test('an HTML gateway page never leaks its body into a game error', async () => {
  await assert.rejects(
    readApiResponse(
      new Response('<!DOCTYPE html>private diagnostic', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }),
    ),
    /unexpected page/,
  );
});
test('valid bootstrap JSON is preserved and malformed JSON can be retried', async () => {
  const data = { authenticated: false, setupRequired: true };
  assert.deepEqual(await readApiResponse(Response.json(data)), data);
  await assert.rejects(
    readApiResponse(
      new Response('{', { headers: { 'Content-Type': 'application/json' } }),
    ),
    /incomplete response/,
  );
  await assert.rejects(
    readApiResponse(Response.json(null)),
    /invalid response/,
  );
});
test('structured game errors retain their player-facing message', async () => {
  await assert.rejects(
    readApiResponse(
      Response.json({ error: 'Your companion needs a rest.' }, { status: 409 }),
    ),
    /needs a rest/,
  );
});
test('modern database secret keys authenticate without pretending to be JWTs', () => {
  const env = {
    SUPABASE_SECRET_KEY: 'sb_secret_test_only',
    SUPABASE_URL: 'https://example.supabase.co',
    DISCORD_CLIENT_ID: 'test',
    DISCORD_CLIENT_SECRET: 'test',
    APP_ORIGIN: 'https://example.test',
  };
  assert.equal(configured(env), true);
  assert.deepEqual(databaseHeaders(env), { apikey: 'sb_secret_test_only' });
  assert.deepEqual(
    databaseHeaders({ SUPABASE_SERVICE_ROLE_KEY: 'legacy-test' }),
    { apikey: 'legacy-test', Authorization: 'Bearer legacy-test' },
  );
});
