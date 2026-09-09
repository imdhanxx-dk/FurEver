import { DEFAULT_CONFIG, ITEMS } from '../game/catalog';
import type { GameConfig } from '../game/types';
import { ensure, intValue, textValue } from '../game/engine';
import { Database } from './database';
import { transact } from './game-service';
import { requireAdmin, type Session } from './security';
export function validateConfig(raw: unknown): GameConfig {
  ensure(raw && typeof raw === 'object', 'Invalid configuration.');
  const c = raw as GameConfig;
  textValue(c.name, 40);
  ensure(typeof c.maintenance === 'boolean', 'Invalid maintenance setting.');
  for (const key of [
    'expBottle',
    'dailyCoins',
    'dailyXp',
    'groomCoins',
    'playCoins',
    'minigameLimit',
    'moraRate',
  ] as const)
    intValue(c[key], 1, key === 'minigameLimit' ? 20 : 10000);
  ensure(c.prices && typeof c.prices === 'object', 'Invalid prices.');
  for (const [id, price] of Object.entries(c.prices)) {
    ensure(
      ITEMS.some((i) => i.id === id && i.price > 0),
      'Only standard shop items can be sold.',
    );
    intValue(price, 1, 100000);
  }
  ensure(
    Array.isArray(c.gachaWeights) && c.gachaWeights.length === 5,
    'Five rarity weights are required.',
  );
  c.gachaWeights.forEach((v) => intValue(v, 0, 100));
  ensure(
    c.gachaWeights.reduce((a, b) => a + b, 0) === 100,
    'Gacha weights must total 100.',
  );
  intValue(c.pity.epic, 1, 10);
  intValue(c.pity.legendary, c.pity.epic, 50);
  intValue(c.pity.mythic, c.pity.legendary, 100);
  textValue(c.event.id, 80);
  textValue(c.event.name, 60);
  textValue(c.event.lore, 500);
  textValue(c.event.featured, 60);
  ensure(
    Number.isFinite(Date.parse(c.event.starts)) &&
      Date.parse(c.event.ends) > Date.parse(c.event.starts),
    'Event dates are invalid.',
  );
  ensure(
    Array.isArray(c.packages) && c.packages.length <= 10,
    'Too many packages.',
  );
  const ids = new Set<string>();
  for (const p of c.packages) {
    textValue(p.id, 40);
    ensure(
      /^[a-z0-9_-]+$/.test(p.id) && !ids.has(p.id),
      'Invalid or duplicate package ID.',
    );
    ids.add(p.id);
    textValue(p.name, 60);
    intValue(p.coins, 1, 1000000);
    intValue(p.amount, 50, 1000000);
    ensure(
      /^[a-z]{3}$/.test(p.currency) && typeof p.enabled === 'boolean',
      'Invalid package.',
    );
  }
  return {
    name: c.name,
    maintenance: c.maintenance,
    prices: c.prices,
    expBottle: c.expBottle,
    dailyCoins: c.dailyCoins,
    dailyXp: c.dailyXp,
    groomCoins: c.groomCoins,
    playCoins: c.playCoins,
    minigameLimit: c.minigameLimit,
    moraRate: c.moraRate,
    gachaWeights: c.gachaWeights,
    pity: c.pity,
    event: c.event,
    packages: c.packages,
  };
}
export async function adminRead(
  db: Database,
  s: Session,
  section: string,
  search: string,
) {
  requireAdmin(s, db.env);
  const allowed: Record<string, string> = {
    players:
      'users?select=id,discord_id,display_name,username,suspended,created_at&order=created_at.desc&limit=50',
    economy: 'economy_ledger?select=*&order=created_at.desc&limit=100',
    payments: 'payments?select=*&order=created_at.desc&limit=100',
    mora: 'mora_requests?select=*,users(display_name,discord_id)&order=created_at.desc&limit=100',
    security: 'security_events?select=*&order=created_at.desc&limit=100',
    audit: 'audit_logs?select=*&order=created_at.desc&limit=100',
    configuration: 'game_config?id=eq.main&select=*',
    outbox:
      'outbox?select=id,kind,delivered_at,attempts,created_at&order=created_at.desc&limit=100',
  };
  ensure(allowed[section], 'Unknown admin page.', 404);
  let path = allowed[section];
  if (section === 'players' && search) {
    const safe = search.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60);
    if (safe) path += `&username=ilike.*${safe}*`;
  }
  const rows = await db.request(path);
  return {
    rows,
    defaults: section === 'configuration' ? DEFAULT_CONFIG : undefined,
  };
}
export async function adminAction(
  db: Database,
  s: Session,
  b: Record<string, unknown>,
  key: string,
) {
  requireAdmin(s, db.env);
  const action = textValue(b.action);
  if (action === 'grant') {
    const target = textValue(b.userId, 36);
    ensure(/^[a-f0-9-]{36}$/.test(target), 'Invalid player.');
    return transact(
      db,
      target,
      {
        action: 'admin_grant',
        amount: b.amount,
        currency: b.currency,
        itemId: b.itemId,
      },
      `admin:${s.user_id}:${key}`,
      true,
      s.user_id,
    );
  }
  if (action === 'suspend') {
    const uid = textValue(b.userId, 36);
    ensure(
      /^[a-f0-9-]{36}$/.test(uid) &&
        uid !== s.user_id &&
        typeof b.suspended === 'boolean',
      'Choose another player.',
    );
    await db.rpc('suspend_player', {
      p_actor: s.user_id,
      p_user: uid,
      p_suspend: b.suspended,
    });
    return { message: 'Player access updated and audited.' };
  }
  if (action === 'configure') {
    await db.rpc('set_config', {
      p_actor: s.user_id,
      p_value: validateConfig(b.config),
      p_revision: intValue(b.revision, 0, 100000000),
    });
    return { message: 'Configuration saved.' };
  }
  if (action === 'mora_approve') {
    const id = textValue(b.id, 36);
    ensure(/^[a-f0-9-]{36}$/.test(id), 'Invalid request.');
    const credited = await db.rpc('settle_credit', {
      p_kind: 'MORA',
      p_id: id,
      p_actor: s.user_id,
    });
    return {
      message: credited
        ? 'Mora approved and credited.'
        : 'This request was already approved.',
    };
  }
  if (action === 'mora_reject') {
    const id = textValue(b.id, 36);
    ensure(/^[a-f0-9-]{36}$/.test(id), 'Invalid request.');
    await db.rpc('resolve_mora', {
      p_actor: s.user_id,
      p_id: id,
      p_status: 'Rejected',
    });
    return { message: 'Request resolved.' };
  }
  throw new Error('Unknown admin action');
}
