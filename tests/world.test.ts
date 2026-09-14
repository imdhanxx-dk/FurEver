import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyIntent, initialState } from '../lib/game/engine';
import { DEFAULT_CONFIG } from '../lib/game/catalog';
import {
  findWorldPath,
  segmentWalkable,
  WORLD_OBJECTS,
  newWorld,
  isWalkable,
} from '../lib/game/world';
import { projectWorld, unprojectWorld } from '../lib/client/world-projection';
import type { Context, Intent, PlayerState } from '../lib/game/types';
let time = 1_800_000_000_000;
const ctx = (): Context => ({
  now: time,
  random: () => 0.01,
  id: () => crypto.randomUUID(),
  admin: false,
  config: DEFAULT_CONFIG,
});
const start = () =>
  applyIntent(
    initialState(time),
    {
      action: 'create_pet',
      name: 'Clover',
      species: 'cat',
      personality: 'Curious',
    },
    ctx(),
  ).state;
test('water and tree trunks block movement; bridges cross water and angled pointer projection round-trips', () => {
  assert.equal(isWalkable(9, -14), false);
  assert.equal(segmentWalkable([0, -10], [0, -18]), true);
  assert.equal(segmentWalkable([9, -10], [9, -18]), false);
  assert.equal(isWalkable(-28, 26), false);
  const camera = [2, 12],
    point = [16, -22];
  const back = unprojectWorld(
    projectWorld(point, camera, 35, 390, 844),
    camera,
    35,
    390,
    844,
  );
  assert.ok(
    Math.abs(back[0] - point[0]) < 1e-8 && Math.abs(back[1] - point[1]) < 1e-8,
  );
});
function walk(s: PlayerState, id: string) {
  const object = WORLD_OBJECTS.find((o) => o.id === id)!;
  s.world ??= newWorld(time);
  const way = findWorldPath(
    s.world.position,
    [object.x, object.z],
    s.world.stage,
  );
  assert.ok(way.length, `path to ${id} exists`);
  const points: [number, number][] = [];
  let from = s.world.position;
  for (const to of way) {
    const count = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.5);
    for (let i = 1; i <= count; i++)
      points.push([
        from[0] + ((to[0] - from[0]) * i) / count,
        from[1] + ((to[1] - from[1]) * i) / count,
      ]);
    from = to;
  }
  time += Math.ceil(((points.length * 0.5) / 5) * 1000) + 500;
  return applyIntent(
    s,
    { action: 'world_interact', objectId: id, path: points },
    ctx(),
  );
}
test('the entire first chapter is reachable, rewards are once-only, and survives serialization', () => {
  let s = start();
  s = applyIntent(s, { action: 'world_sync', path: [] }, ctx()).state;
  for (const id of [
    'edda',
    'seed-a',
    'seed-b',
    'seed-c',
    'beacon',
    'vale',
    'shard-a',
    'shard-b',
    'shard-c',
    'observatory',
    'warden',
  ])
    s = walk(s, id).state;
  for (const id of ['tone-a', 'tone-b', 'tone-c', 'warden'])
    s = walk(s, id).state;
  assert.ok(s.world!.quests.includes('echo'));
  s = walk(s, 'gate').state;
  assert.equal(s.world!.stage, 6);
  assert.ok(s.inventory.star_crown);
  const saved = JSON.parse(JSON.stringify(s));
  assert.equal(saved.world.stage, 6);
  assert.equal(saved.pet.name, 'Clover');
  assert.throws(
    () =>
      applyIntent(
        saved,
        { action: 'world_interact', objectId: 'gate', path: [] },
        ctx(),
      ),
    /already open/,
  );
});
test('server rejects teleporting, wall crossing, remote collection and duplicate treasures', () => {
  let s = start();
  s.world = newWorld(time);
  assert.throws(
    () => applyIntent(s, { action: 'world_sync', path: [[30, 30]] }, ctx()),
    /obstacle/,
  );
  assert.throws(
    () =>
      applyIntent(
        s,
        { action: 'world_interact', objectId: 'cache', path: [] },
        ctx(),
      ),
    /closer/,
  );
  time += 1000;
  assert.throws(
    () =>
      applyIntent(s, { action: 'world_sync', path: [[Infinity, 1]] }, ctx()),
    /Invalid trail/,
  );
  assert.equal(segmentWalkable([-14, 11], [-6, 11]), false);
  s = walk(s, 'cache').state;
  assert.ok(s.inventory.moon_collar);
  const balance = s.coins;
  assert.throws(
    () =>
      applyIntent(
        s,
        { action: 'world_interact', objectId: 'cache', path: [] },
        ctx(),
      ),
    /already collected/,
  );
  assert.equal(s.coins, balance);
});
test('spending deducts for owners too, rejects forged cost and insufficient multi-pulls', () => {
  const s = start();
  s.coins = 1600;
  s.inventory.ticket = 0;
  const r = applyIntent(
    s,
    { action: 'gacha', count: 10, payment: 'coins', cost: 0 },
    { ...ctx(), admin: true },
  );
  assert.equal(
    r.ledger.filter((l) => l.amount < 0).reduce((n, l) => n + l.amount, 0),
    -1600,
  );
  assert.equal(r.rewards!.length, 10);
  assert.equal(r.state.gacha.history[0].cost, 160);
  assert.equal(
    r.state.coins,
    1600 +
      r.ledger
        .filter((l) => l.currency === 'PC')
        .reduce((n, l) => n + l.amount, 0),
  );
  assert.throws(
    () =>
      applyIntent(
        { ...s, coins: 1599 },
        { action: 'gacha', count: 10, payment: 'coins' },
        { ...ctx(), admin: true },
      ),
    /few more/,
  );
  assert.equal(s.coins, 1600);
  assert.equal(s.gacha.total, 0);
});
test('companion names persist independently without losing friendship or progress', () => {
  let s = start();
  const bond = s.pet!.bond;
  s = applyIntent(
    s,
    { action: 'companion_equip', designId: 'starlight' },
    ctx(),
  ).state;
  s = applyIntent(s, { action: 'rename_pet', name: 'Nova' }, ctx()).state;
  s = applyIntent(
    s,
    { action: 'companion_equip', designId: 'sunbeam' },
    ctx(),
  ).state;
  assert.equal(s.pet!.name, 'Clover');
  s = applyIntent(
    s,
    { action: 'companion_equip', designId: 'starlight' },
    ctx(),
  ).state;
  assert.equal(s.pet!.name, 'Nova');
  assert.equal(s.pet!.bond, bond);
});
