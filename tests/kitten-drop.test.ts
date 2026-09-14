import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropKitten, type KittenRound } from '../lib/game/kitten-drop';
import { applyIntent, initialState } from '../lib/game/engine';
import { DEFAULT_CONFIG } from '../lib/game/catalog';
test('kitten physics replay is deterministic, merges equal cats and stays finite', () => {
  let r: KittenRound = {
    id: 'round',
    started: 0,
    updated: 0,
    drops: 0,
    next: 0,
    score: 0,
    merges: 0,
    balls: [],
    finished: false,
  };
  for (let i = 0; i < 20 && !r.finished; i++) {
    const a = dropKitten(r, 180),
      b = dropKitten(r, 180);
    assert.deepEqual(a, b);
    assert.equal(r.drops, i);
    r = a;
    for (const cat of r.balls)
      for (const k of ['x', 'y', 'vx', 'vy'] as const)
        assert.ok(Number.isFinite(cat[k]));
  }
  assert.ok(r.merges >= 4);
  assert.ok(r.score >= 120);
  assert.ok(r.balls.length < r.drops);
});
test('kitten reward ignores forged scores, rejects repeated drops and only pays once', () => {
  let now = 1_900_000_000_000;
  const ctx = () => ({
    now,
    random: () => 0,
    id: () => crypto.randomUUID(),
    admin: false,
    config: DEFAULT_CONFIG,
  });
  let s = applyIntent(
    initialState(now),
    {
      action: 'create_pet',
      name: 'Clover',
      species: 'cat',
      personality: 'Curious',
    },
    ctx(),
  ).state;
  s = applyIntent(s, { action: 'kitten_start' }, ctx()).state;
  const id = s.kittenRound!.id;
  for (let i = 0; i < 12; i++) {
    now += 1700;
    s = applyIntent(
      s,
      { action: 'kitten_drop', id, step: i, x: 180, score: 999999 },
      ctx(),
    ).state;
  }
  assert.throws(
    () =>
      applyIntent(s, { action: 'kitten_drop', id, step: 11, x: 180 }, ctx()),
    /already/,
  );
  assert.ok(s.kittenRound!.score < 999999);
  const result = applyIntent(
    s,
    { action: 'kitten_finish', id, score: 999999 },
    ctx(),
  );
  assert.equal(result.state.daily.play, 1);
  assert.equal(
    result.ledger.filter(
      (l) => l.kind === 'MINIGAME_REWARD' && l.currency === 'PC',
    )[0]?.amount,
    DEFAULT_CONFIG.playCoins,
  );
  assert.throws(
    () => applyIntent(result.state, { action: 'kitten_finish', id }, ctx()),
    /already/,
  );
});
