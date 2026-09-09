import test from 'node:test';
import assert from 'node:assert/strict';
import { applyIntent, initialState, GameError } from '../lib/game/engine';
import { DEFAULT_CONFIG } from '../lib/game/catalog';
import { levelBottleXp, progress, xpForLevel } from '../lib/game/progression';
import type { Context, Intent, PlayerState } from '../lib/game/types';
import { verifyStripe } from '../lib/server/payments';
import {
  constantEqual,
  assertOrigin,
  assertCsrf,
  requireAdmin,
} from '../lib/server/security';
import type { Session } from '../lib/server/security';
import { validateConfig } from '../lib/server/admin';
let clock = Date.parse('2026-09-09T12:00:00Z');
const context = (overrides: Partial<Context> = {}): Context => ({
  now: clock,
  random: () => 0.5,
  id: () => crypto.randomUUID(),
  admin: false,
  config: structuredClone(DEFAULT_CONFIG),
  ...overrides,
});
function starter() {
  return applyIntent(
    initialState(clock),
    {
      action: 'create_pet',
      name: 'Mochi',
      species: 'cat',
      personality: 'Curious',
    },
    context(),
  ).state;
}
function run(s: PlayerState, b: Intent, c: Partial<Context> = {}) {
  clock += 60000;
  return applyIntent(s, b, context(c));
}
test('progression caps at 100 and uses integer fractional level bottles', () => {
  assert.equal(progress(xpForLevel(100)).level, 100);
  assert.equal(levelBottleXp(xpForLevel(100)), xpForLevel(100));
  for (let i = 1; i < 99; i++) {
    const start =
      xpForLevel(i) + Math.floor((xpForLevel(i + 1) - xpForLevel(i)) * 0.9);
    const next = levelBottleXp(start);
    assert.ok(Number.isSafeInteger(next));
    assert.equal(progress(next).level, i + 2);
    assert.ok(next <= xpForLevel(100));
  }
});
test('EXP bottle adds exactly 620 and consumes ownership once', () => {
  let s = starter();
  s.inventory.exp_bottle = 1;
  const before = s.xp;
  s = run(s, { action: 'use_item', itemId: 'exp_bottle' }).state;
  assert.equal(s.xp, before + 620);
  assert.equal(s.inventory.exp_bottle, 0);
  assert.throws(
    () => run(s, { action: 'use_item', itemId: 'exp_bottle' }),
    /need more/,
  );
});
test('shop ignores client prices, balances and levels', () => {
  const s = starter(),
    r = run(s, {
      action: 'buy',
      itemId: 'food',
      quantity: 2,
      price: 1,
      coins: 9999999,
      level: 100,
    });
  assert.equal(r.state.coins, s.coins - 50);
  assert.equal(r.state.xp, s.xp);
  assert.equal(r.state.inventory.food, s.inventory.food + 2);
  assert.throws(
    () => run(s, { action: 'buy', itemId: 'ticket', quantity: 1 }),
    /not for sale/,
  );
  assert.throws(
    () => run(s, { action: 'buy', itemId: 'food', quantity: -1 }),
    /valid amount/,
  );
});
test('daily chest needs every quest and cannot be claimed twice', () => {
  let s = starter();
  assert.throws(() => run(s, { action: 'claim_daily' }), /Complete all/);
  s.daily.tasks = [
    'feed',
    'groom',
    'minigame',
    'battle',
    'explore',
    'exp',
    'bond',
  ];
  const before = s.coins;
  s = run(s, { action: 'claim_daily' }).state;
  assert.equal(s.coins, before + 200);
  assert.equal(s.inventory.level_bottle, 4);
  assert.throws(() => run(s, { action: 'claim_daily' }), /already/);
});
test('normal players cannot invoke admin adjustments or internal credits', () => {
  const s = starter();
  for (const action of ['admin_grant', 'external_credit'])
    assert.throws(
      () => run(s, { action, amount: 100, currency: 'PC' }),
      (e: unknown) => e instanceof GameError && e.status === 403,
    );
});
test('unlocked regions are checked on the server', () => {
  const s = starter();
  assert.throws(
    () => run(s, { action: 'explore_start', location: 10 }),
    /higher level/,
  );
  assert.throws(
    () => run(s, { action: 'battle_start', location: 10 }),
    /still locked/,
  );
  const r = run(s, { action: 'explore_start', location: 1 });
  assert.equal(r.state.pet!.energy, 85);
});
test('exploration advances in timed steps, loot can only be awarded once', () => {
  let s = run(starter(), { action: 'explore_start', location: 1 }).state;
  const id = s.expedition!.id;
  assert.throws(
    () => applyIntent(s, { action: 'explore_step', id }, context()),
    /moment/,
  );
  for (let i = 0; i < 3; i++) s = run(s, { action: 'explore_step', id }).state;
  assert.equal(s.stats.expeditions, 1);
  assert.equal(s.expedition, null);
  assert.throws(() => run(s, { action: 'explore_step', id }), /no longer/);
});
test('battle winner is computed by server and rewards cannot replay', () => {
  let s = run(starter(), { action: 'battle_start', location: 1 }).state;
  const id = s.battle!.id;
  assert.throws(
    () => run(s, { action: 'battle_action', id, move: 'ultimate' }),
    /charging/,
  );
  for (let i = 0; i < 40 && !s.battle!.finished; i++)
    s = run(
      s,
      { action: 'battle_action', id, move: 'attack' },
      { now: clock + 1000 },
    ).state;
  assert.equal(s.battle!.enemyHp, 0);
  assert.equal(s.stats.battles, 1);
  assert.throws(
    () => run(s, { action: 'battle_action', id, move: 'attack' }),
    /ended/,
  );
});
test('minigame enforces nonce, sequence, timing, one-time reward and daily cap', () => {
  let s = starter();
  for (let n = 0; n < 5; n++) {
    s = run(s, { action: 'minigame_start', kind: 'grooming' }).state;
    const g = s.challenge!;
    assert.throws(
      () =>
        run(s, {
          action: 'minigame_hit',
          id: g.id,
          nonce: 'fake',
          step: 0,
          target: 4,
        }),
      /not yours/,
    );
    for (let step = 0; step < 10; step++) {
      clock += 600;
      s = applyIntent(
        s,
        { action: 'minigame_hit', id: g.id, nonce: g.nonce, step, target: 4 },
        context(),
      ).state;
    }
    assert.equal(s.challenge, null);
    assert.throws(
      () =>
        run(s, {
          action: 'minigame_hit',
          id: g.id,
          nonce: g.nonce,
          step: 9,
          target: 4,
        }),
      /not yours/,
    );
  }
  assert.equal(s.daily.grooming, 5);
  assert.throws(
    () => run(s, { action: 'minigame_start', kind: 'grooming' }),
    /complete/,
  );
});
test('gacha honors every pity tier and accepts gameplay tickets only', () => {
  let s = starter();
  s.inventory.ticket = 100;
  for (let i = 0; i < 100; i++) {
    const r = run(s, { action: 'gacha', count: 1 }, { random: () => 0 });
    s = r.state;
    if ((i + 1) % 10 === 0) assert.notEqual(r.rewards![0].rarity, 'Common');
    if ((i + 1) % 50 === 0)
      assert.ok(['Legendary', 'Mythic'].includes(r.rewards![0].rarity));
    if (i === 99) assert.equal(r.rewards![0].rarity, 'Mythic');
  }
  assert.equal(s.inventory.ticket, 0);
  assert.throws(() => run(s, { action: 'gacha', count: 1 }), /need more/);
});
test('avatar and fusion generation enforce five reservations server-side', () => {
  for (const kind of ['avatar', 'fusion']) {
    let s = starter();
    s.xp = xpForLevel(10);
    s = run(s, { action: 'generation_open', kind }).state;
    const id = s.generations[0].id;
    for (let i = 0; i < 5; i++) {
      clock += 400000;
      s = run(s, {
        action: 'generation_reserve',
        sessionId: id,
        candidateId: String(i),
        prompt: 'A friendly companion',
      }).state;
      s = run(s, {
        action: 'generation_finish',
        sessionId: id,
        candidateId: String(i),
        success: false,
      }).state;
    }
    assert.throws(
      () =>
        run(s, {
          action: 'generation_reserve',
          sessionId: id,
          candidateId: 'six',
          prompt: 'Another',
        }),
      /five attempts/,
    );
    assert.equal(
      run(
        s,
        {
          action: 'generation_reserve',
          sessionId: id,
          candidateId: 'six',
          prompt: 'Another',
        },
        { admin: true },
      ).state.generations[0].attempts,
      6,
    );
  }
});
test('private-zone reactions award no PC, XP, inventory or achievement', () => {
  const s = starter();
  s.stats.battles = 1;
  s.achievements = [];
  const r = run(s, { action: 'boundary' });
  assert.equal(r.state.coins, s.coins);
  assert.equal(r.state.xp, s.xp);
  assert.deepEqual(r.state.achievements, []);
  assert.deepEqual(r.state.inventory, s.inventory);
  assert.equal(r.state.pet!.bond, s.pet!.bond - 1);
  assert.equal(r.ledger.length, 0);
});
test('server date controls login streaks and daily reset', () => {
  const s = starter();
  const now = Date.parse('2026-09-10T12:00:00Z');
  const r = applyIntent(
    s,
    { action: 'login', date: '2099-01-01' },
    context({ now }),
  );
  assert.equal(r.state.streak.day, '2026-09-10');
  assert.equal(r.state.daily.day, '2026-09-10');
  assert.equal(
    applyIntent(r.state, { action: 'login' }, context({ now })).ledger.length,
    0,
  );
});
test('CSRF requires exact origin and server session token; admin uses immutable Discord ID', () => {
  const s = {
    csrf: 'valid-token',
    users: { discord_id: '123456789012345678' },
  } as Session;
  assert.throws(() =>
    assertCsrf(
      new Request('https://game.test/api/action', {
        method: 'POST',
        headers: { origin: 'https://evil.test', 'x-csrf-token': 'valid-token' },
      }),
      s,
      { APP_ORIGIN: 'https://game.test' },
    ),
  );
  assert.throws(() =>
    assertCsrf(
      new Request('https://game.test/api/action', {
        method: 'POST',
        headers: { origin: 'https://game.test', 'x-csrf-token': 'wrong' },
      }),
      s,
      { APP_ORIGIN: 'https://game.test' },
    ),
  );
  assert.doesNotThrow(() =>
    requireAdmin(s, { ADMIN_DISCORD_ID: '123456789012345678' }),
  );
  assert.throws(() => requireAdmin(s, { ADMIN_DISCORD_ID: 'another' }));
  assert.ok(!constantEqual('a', 'aa'));
  assert.ok(constantEqual('abc', 'abc'));
});
test('Stripe signature validates raw body, timestamp and every v1 signature', async () => {
  const secret = 'whsec_test',
    raw = '{"type":"checkout.session.completed"}',
    now = Date.now(),
    t = String(Math.floor(now / 1000));
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = Buffer.from(
    await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(`${t}.${raw}`),
    ),
  ).toString('hex');
  await verifyStripe(raw, `t=${t},v1=invalid,v1=${sig}`, secret, now);
  await assert.rejects(() =>
    verifyStripe(raw + ' ', `t=${t},v1=${sig}`, secret, now),
  );
  await assert.rejects(() =>
    verifyStripe(raw, `t=${t},v1=${sig}`, secret, now + 301000),
  );
  await assert.rejects(() => verifyStripe(raw, `t=${t},v1=bad`, secret, now));
});
test('configuration cannot sell gacha tickets or secretly invalidate published odds', () => {
  const c = structuredClone(DEFAULT_CONFIG);
  assert.doesNotThrow(() => validateConfig(c));
  c.prices.ticket = 1;
  assert.throws(() => validateConfig(c), /standard shop/);
  delete c.prices.ticket;
  c.gachaWeights = [45, 30, 15, 8, 20];
  assert.throws(() => validateConfig(c), /total 100/);
});
