import { environment, configured, studioEnabled } from './env';
import { Database } from './database';
import {
  errorResponse,
  secureResponse,
  session,
  assertCsrf,
  body,
  limitedBytes,
  isAdmin,
  rateLimit,
  hash,
} from './security';
import { login, callback, logout, rotateSession } from './oauth';
import { gameConfig, publicState, readPlayer, transact } from './game-service';
import { GameError, ensure, textValue, intValue } from '../game/engine';
import type { Intent } from '../game/types';
import { webhook } from './payments';
import { generate, getAsset } from './generation';
import { adminRead, adminAction } from './admin';
import { deliverOutbox } from './discord';
const ACTIONS = new Set([
  'create_pet',
  'care',
  'boundary',
  'use_item',
  'buy',
  'equip',
  'companion_equip',
  'claim_daily',
  'explore_start',
  'explore_step',
  'explore_cancel',
  'battle_start',
  'battle_action',
  'minigame_start',
  'minigame_hit',
  'minigame_cancel',
  'gacha',
  'event_claim',
  'generation_open',
  'generation_select',
]);
export async function handle(request: Request) {
  let uid: string | undefined;
  let db: Database | undefined;
  try {
    const env = await environment(),
      url = new URL(request.url),
      path = url.pathname.replace(/^\/api\//, ''),
      method = request.method;
    db = new Database(env);
    if (path === 'health' && method === 'GET')
      return secureResponse({ ok: true, ready: configured(env) });
    if (path === 'auth/login' && method === 'GET')
      return await login(request, env);
    if (path === 'auth/callback' && method === 'GET')
      return await callback(request, env);
    if (path === 'payments/webhook' && method === 'POST')
      return secureResponse(await webhook(request, env));
    if (path === 'auth/logout' && method === 'POST')
      return await logout(request, env);
    if (path === 'auth/rotate' && method === 'POST')
      return await rotateSession(request, env);
    if (path === 'bootstrap' && !configured(env))
      return secureResponse({
        authenticated: false,
        setupRequired: true,
        capabilities: { ai: false, payments: false },
      });
    ensure(
      configured(env),
      'The sanctuary is being prepared. Please return soon.',
      503,
    );
    const s = await session(request, db);
    uid = s.user_id;
    const admin = isAdmin(s, env);
    if (method !== 'GET') {
      assertCsrf(request, s, env);
      await rateLimit(db, `write:${uid}`, 90, 60);
    }
    if (path === 'bootstrap' && method === 'GET') {
      const [row, config] = await Promise.all([
        readPlayer(db, uid),
        gameConfig(db),
      ]);
      return secureResponse({
        authenticated: true,
        user: { id: uid, ...s.users, admin },
        state: publicState(row.state),
        csrf: s.csrf,
        config,
        capabilities: {
          ai: studioEnabled(env),
          payments: false,
        },
      });
    }
    if (path.startsWith('assets/') && method === 'GET')
      return await getAsset(db, uid, path.slice(7));
    if (path.startsWith('admin/') && method === 'GET')
      return secureResponse(
        await adminRead(db, s, path.slice(6), url.searchParams.get('q') || ''),
      );
    if (path === 'mora' && method === 'GET')
      return secureResponse({
        rows: await db.request(
          `mora_requests?user_id=eq.${uid}&order=created_at.desc&limit=50`,
        ),
      });
    if (path === 'ledger' && method === 'GET')
      return secureResponse({
        rows: await db.request(
          `economy_ledger?user_id=eq.${uid}&order=created_at.desc&limit=50`,
        ),
      });
    ensure(method === 'POST', 'That path could not be found.', 404);
    const key = request.headers.get('idempotency-key');
    ensure(
      key && /^[a-zA-Z0-9:_-]{8,160}$/.test(key),
      'A unique request key is required.',
    );
    if (path === 'generate') {
      await rateLimit(db, `generation:${uid}`, admin ? 100 : 10, 3600);
      ensure(
        (Number(request.headers.get('content-length')) || 0) <= 4_300_000,
        'Image upload is too large.',
        413,
      );
      const bounded = await limitedBytes(request, 4_300_000);
      const data = await new Response(bounded, {
        headers: { 'Content-Type': request.headers.get('content-type') || '' },
      }).formData();
      const result = await generate(db, uid, data, key, admin);
      return secureResponse({ ...result, state: publicState(result.state) });
    }
    const b = await body(request, path === 'admin/action' ? 30000 : 12000);
    if (path === 'action') {
      const action = textValue(b.action);
      ensure(ACTIONS.has(action), 'Unknown action.');
      const config = await gameConfig(db);
      ensure(
        !config.maintenance || admin,
        'The sanctuary is resting for maintenance. Please come back soon.',
        503,
      );
      await rateLimit(
        db,
        `action:${uid}:${action}`,
        action === 'gacha' ? 10 : 60,
        60,
      );
      const result = await transact(db, uid, b as Intent, key, admin);
      return secureResponse({ ...result, state: publicState(result.state) });
    }
    if (path === 'payments/checkout') {
      throw new GameError(
        'Real-money purchases are closed. Use the Mora exchange.',
        410,
      );
    }
    if (path === 'admin/action')
      return secureResponse(await adminAction(db, s, b, key));
    if (path === 'mora') {
      await rateLimit(db, `mora:${uid}`, 3, 3600);
      const mora = intValue(b.mora, 1, 100000),
        reference =
          typeof b.reference === 'string' ? textValue(b.reference, 200, 0) : '';
      const config = await gameConfig(db);
      ensure(
        mora * config.moraRate <= 1000000,
        'This request exceeds the exchange limit.',
      );
      const id = await db.rpc<string>('submit_mora', {
        p_user: uid,
        p_mora: mora,
        p_coins: mora * config.moraRate,
        p_reference: reference,
        p_key: key,
        p_discord: s.users.discord_id,
        p_username: s.users.username,
      });
      await deliverOutbox(db).catch(() => undefined);
      return secureResponse({
        message:
          'Request submitted. Pet Coins arrive only after admin approval.',
        id,
      });
    }
    if (path === 'mora/cancel') {
      const id = textValue(b.id, 36);
      ensure(/^[a-f0-9-]{36}$/.test(id), 'Invalid request.');
      const rows = await db.request<{ user_id: string }[]>(
        `mora_requests?id=eq.${id}&select=user_id`,
      );
      ensure(rows[0]?.user_id === uid, 'That request is not yours.', 403);
      await db.rpc('resolve_mora', {
        p_actor: uid,
        p_id: id,
        p_status: 'Cancelled',
      });
      return secureResponse({ message: 'Request cancelled.' });
    }
    if (path === 'support') {
      await rateLimit(db, `support:${uid}`, 3, 3600);
      const category = textValue(b.category, 40),
        message = textValue(b.message, 1500, 10);
      const id = await db.rpc<string>('submit_support', {
        p_user: uid,
        p_key: key,
        p_payload: {
          discordId: s.users.discord_id,
          username: s.users.username,
          category,
          message,
          requestId:
            typeof b.requestId === 'string' ? b.requestId.slice(0, 100) : '',
        },
      });
      await deliverOutbox(db, id).catch(() => undefined);
      return secureResponse({
        message: 'Your message is safely queued for the club administrator.',
      });
    }
    if (path === 'admin/retry-notifications') {
      ensure(admin, 'That portal is not yours to enter.', 403);
      await deliverOutbox(db);
      return secureResponse({ message: 'Notification queue processed.' });
    }
    throw new GameError('That path could not be found.', 404);
  } catch (error) {
    if (
      db &&
      uid &&
      error instanceof GameError &&
      [403, 409, 429].includes(error.status)
    ) {
      await db
        .insert('security_events', {
          user_id: uid,
          kind: error.code,
          detail: error.message.slice(0, 200),
        })
        .catch(() => undefined);
    }
    if (
      new URL(request.url).pathname === '/api/bootstrap' &&
      error instanceof GameError &&
      error.status === 401
    )
      return secureResponse({ authenticated: false, setupRequired: false });
    return errorResponse(error);
  }
}
