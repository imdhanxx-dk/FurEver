import { Database } from './database';
import { configured, required, type Env } from './env';
import {
  cookie,
  cookieValue,
  hash,
  token,
  rateLimit,
  assertOrigin,
  session,
  assertCsrf,
  secureResponse,
} from './security';
import { createIdentity, gameConfig, transact } from './game-service';
import { betaApproved } from './beta-access';
import { ensure } from '../game/engine';
export async function login(request: Request, env: Env) {
  const origin = env.APP_ORIGIN || new URL(request.url).origin;
  if (!configured(env))
    return Response.redirect(`${origin}/?notice=setup`, 302);
  const db = new Database(env);
  await rateLimit(
    db,
    `oauth:${await hash(request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'shared')}`,
    20,
    300,
  );
  const state = token();
  await db.insert('oauth_states', {
    state_hash: await hash(state),
    expires_at: new Date(Date.now() + 600_000).toISOString(),
  });
  const url = new URL('https://discord.com/oauth2/authorize');
  url.search = new URLSearchParams({
    client_id: required(env, 'DISCORD_CLIENT_ID'),
    redirect_uri: `${required(env, 'APP_ORIGIN')}/api/auth/callback`,
    response_type: 'code',
    scope: 'identify',
    state,
  }).toString();
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': cookie('furever_oauth', state, 600, env),
      'Cache-Control': 'no-store',
    },
  });
}
export async function callback(request: Request, env: Env) {
  const db = new Database(env),
    url = new URL(request.url),
    state = url.searchParams.get('state'),
    code = url.searchParams.get('code');
  ensure(
    state &&
      state === cookieValue(request, 'furever_oauth') &&
      /^[a-f0-9]{64}$/.test(state) &&
      code,
    'Discord sign-in could not be verified. Please try again.',
    400,
  );
  ensure(
    await db.rpc<boolean>('consume_oauth_state', { p_hash: await hash(state) }),
    'This sign-in link has expired.',
    400,
  );
  const tokens = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: required(env, 'DISCORD_CLIENT_ID'),
      client_secret: required(env, 'DISCORD_CLIENT_SECRET'),
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${required(env, 'APP_ORIGIN')}/api/auth/callback`,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  ensure(tokens.ok, 'Discord sign-in is temporarily unavailable.', 503);
  const access = (await tokens.json()) as { access_token: string };
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${access.access_token}` },
    signal: AbortSignal.timeout(15_000),
  });
  ensure(response.ok, 'Discord identity could not be verified.', 401);
  const user = (await response.json()) as {
    id: string;
    username: string;
    global_name?: string;
    avatar?: string;
  };
  ensure(
    /^\d{10,25}$/.test(user.id),
    'Discord returned an invalid identity.',
    401,
  );
  const uid = await createIdentity(db, user);
  const blocked = await db.request<{ suspended: boolean }[]>(
    `users?id=eq.${uid}&select=suspended`,
  );
  ensure(!blocked[0]?.suspended, 'This account is paused.', 403);
  const old = cookieValue(request, 'furever_session');
  if (old)
    await db.request(`sessions?token_hash=eq.${await hash(old)}`, {
      method: 'DELETE',
    });
  const sessionToken = token();
  await db.insert('sessions', {
    token_hash: await hash(sessionToken),
    user_id: uid,
    csrf: token(),
    expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
  });
  if (
    betaApproved(
      user.id,
      env.ADMIN_DISCORD_ID,
      (await gameConfig(db)).betaDiscordIds,
    )
  ) {
    await transact(
      db,
      uid,
      { action: 'login' },
      `login-beta:${new Date().toISOString().slice(0, 10)}`,
    );
  }
  const headers = new Headers({
    Location: `${required(env, 'APP_ORIGIN')}/home`,
    'Cache-Control': 'no-store',
  });
  headers.append(
    'Set-Cookie',
    cookie('furever_session', sessionToken, 604800, env),
  );
  headers.append('Set-Cookie', cookie('furever_oauth', '', 0, env));
  return new Response(null, { status: 302, headers });
}
export async function logout(request: Request, env: Env) {
  const db = new Database(env),
    s = await session(request, db);
  assertCsrf(request, s, env);
  await db.request(`sessions?token_hash=eq.${s.token_hash}`, {
    method: 'DELETE',
  });
  const response = secureResponse({ ok: true });
  response.headers.set('Set-Cookie', cookie('furever_session', '', 0, env));
  return response;
}
export async function rotateSession(request: Request, env: Env) {
  assertOrigin(request, env);
  const db = new Database(env),
    s = await session(request, db);
  assertCsrf(request, s, env);
  const next = token();
  await db.rpc('rotate_session', {
    p_old: s.token_hash,
    p_new: await hash(next),
  });
  const response = secureResponse({ ok: true });
  response.headers.set(
    'Set-Cookie',
    cookie(
      'furever_session',
      next,
      Math.max(0, Math.floor((Date.parse(s.expires_at) - Date.now()) / 1000)),
      env,
    ),
  );
  return response;
}
