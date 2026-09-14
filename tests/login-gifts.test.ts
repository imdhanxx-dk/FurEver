import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyIntent, initialState } from '../lib/game/engine';
import { DEFAULT_CONFIG } from '../lib/game/catalog';
const start = Date.parse('2026-09-14T12:00:00Z');
const context = (now: number) => ({
  now,
  config: DEFAULT_CONFIG,
  admin: false,
  random: () => 0.5,
  id: () => crypto.randomUUID(),
});
test('new registration includes 1000 PC and accessories; seven separate visits award one Legendary gift', () => {
  let state = initialState(start);
  assert.equal(state.coins, 1000);
  assert.equal(state.inventory.ribbon, 1);
  assert.equal(state.inventory.moon_collar, 1);
  for (let d = 0; d < 7; d++) {
    const now = start + d * 2 * 86400_000;
    state = applyIntent(state, { action: 'login' }, context(now)).state;
    const once = structuredClone(state);
    state = applyIntent(state, { action: 'login' }, context(now)).state;
    assert.deepEqual(state, once);
    assert.equal(state.loginGifts?.days, d + 1);
    assert.equal(state.inventory.aurora || 0, d === 6 ? 1 : 0);
  }
  state = applyIntent(
    state,
    { action: 'login' },
    context(start + 15 * 86400_000),
  ).state;
  assert.equal(state.inventory.aurora, 1);
});
test('existing players receive the welcome top-up and accessories only once without resetting progress', () => {
  const old = initialState(start);
  delete old.welcomeGift;
  delete old.loginGifts;
  old.coins = 123;
  old.xp = 900;
  old.inventory.ribbon = 0;
  old.inventory.moon_collar = 0;
  const once = applyIntent(old, { action: 'login' }, context(start));
  assert.equal(
    once.ledger.filter((l) => l.kind === 'WELCOME_GIFT_UPGRADE').length,
    1,
  );
  assert.equal(once.state.xp, 900);
  assert.equal(once.state.inventory.ribbon, 1);
  const twice = applyIntent(
    once.state,
    { action: 'login' },
    context(start + 86400_000),
  );
  assert.equal(
    twice.ledger.some((l) => l.kind === 'WELCOME_GIFT_UPGRADE'),
    false,
  );
  assert.equal(twice.state.inventory.ribbon, 1);
});
