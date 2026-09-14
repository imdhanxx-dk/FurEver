import type { WorldProgress, PlayerState } from './types';

export const WORLD_LIMIT = 34;
export const PLAYER_RADIUS = 0.48;
export const WORLD_SPEED = 7;
export type Obstacle = { x: number; z: number; w: number; d: number };
export const BUILDINGS = [
  {
    x: -10,
    z: 11,
    w: 6,
    d: 6,
    color: '#efd9b4',
    roof: '#699799',
    name: 'Pip’s provisions',
  },
  {
    x: 11,
    z: 9,
    w: 6,
    d: 7,
    color: '#f1ddc5',
    roof: '#b87c73',
    name: 'Lantern cottage',
  },
  {
    x: -13,
    z: -4,
    w: 7,
    d: 6,
    color: '#e4ceb1',
    roof: '#77836a',
    name: 'The seed library',
  },
  {
    x: 13,
    z: -10,
    w: 6,
    d: 6,
    color: '#dacdd7',
    roof: '#6a7096',
    name: 'The observatory',
  },
] as const;
// Rendering and server validation share these footprints. Bridges are the only
// walkable crossings; canopies extend past their solid trunks for occlusion.
export const RIVER = { z: -14, depth: 4 } as const;
export const BRIDGES = [-18, 0, 24] as const;
export const TREES = [
  [-28, 26],
  [-21, 28],
  [-11, 29],
  [10, 29],
  [20, 29],
  [29, 27],
  [-29, 13],
  [-23, 5],
  [-29, -3],
  [-30, -24],
  [-26, -29],
  [-13, -29],
  [13, -28],
  [22, -28],
  [30, -29],
  [30, -18],
  [30, -6],
  [27, 5],
  [23, 12],
  [-20, 12],
  [-6, -6],
  [7, -3],
  [-6, 23],
  [7, 22],
  [-30, -38],
  [-20, -39],
  [-10, -39],
  [10, -39],
  [20, -39],
  [30, -38],
] as const;
export const OBSTACLES: Obstacle[] = [
  ...BUILDINGS,
  ...TREES.map(([x, z]) => ({ x, z, w: 1.2, d: 1.2 })),
  { x: 0, z: 0, w: 4, d: 4 },
  { x: -24, z: -18, w: 5, d: 6 },
  { x: 23, z: 20, w: 7, d: 4 },
];
export const WORLD_OBJECTS = [
  {
    id: 'edda',
    name: 'Edda · lantern keeper',
    x: 2,
    z: 12,
    kind: 'npc',
    stage: 0,
  },
  { id: 'pip', name: 'Pip · provisions', x: -9, z: 16, kind: 'shop', stage: 0 },
  { id: 'well', name: 'The Moonwell', x: 0, z: 3.8, kind: 'wish', stage: 0 },
  { id: 'seed-a', name: 'Humming seed', x: -17, z: 18, kind: 'seed', stage: 1 },
  { id: 'seed-b', name: 'Humming seed', x: 16, z: 18, kind: 'seed', stage: 1 },
  { id: 'seed-c', name: 'Humming seed', x: 19, z: 0, kind: 'seed', stage: 1 },
  {
    id: 'beacon',
    name: 'The quiet beacon',
    x: 0,
    z: -9,
    kind: 'beacon',
    stage: 1,
  },
  {
    id: 'vale',
    name: 'Vale · seed archivist',
    x: -13,
    z: 1,
    kind: 'npc',
    stage: 2,
  },
  {
    id: 'shard-a',
    name: 'Memory glass',
    x: -22,
    z: -7,
    kind: 'shard',
    stage: 2,
  },
  {
    id: 'shard-b',
    name: 'Memory glass',
    x: -19,
    z: -23,
    kind: 'shard',
    stage: 2,
  },
  {
    id: 'shard-c',
    name: 'Memory glass',
    x: -8,
    z: -22,
    kind: 'shard',
    stage: 2,
  },
  {
    id: 'cache',
    name: 'A hollow beneath the roots',
    x: 26,
    z: -23,
    kind: 'secret',
    stage: 0,
  },
  {
    id: 'observatory',
    name: 'The listening lens',
    x: 13,
    z: -5,
    kind: 'story',
    stage: 3,
  },
  {
    id: 'warden',
    name: 'The tangled echo',
    x: 0,
    z: -24,
    kind: 'challenge',
    stage: 4,
  },
  { id: 'tone-a', name: 'First echo', x: -6, z: -27, kind: 'tone', stage: 4 },
  { id: 'tone-b', name: 'Second echo', x: 6, z: -27, kind: 'tone', stage: 4 },
  { id: 'tone-c', name: 'Third echo', x: 0, z: -18, kind: 'tone', stage: 4 },
  {
    id: 'gate',
    name: 'The orchard gate',
    x: 0,
    z: -31,
    kind: 'gate',
    stage: 5,
  },
  {
    id: 'camp',
    name: 'Meadow checkpoint',
    x: -4,
    z: 15,
    kind: 'checkpoint',
    stage: 0,
  },
] as const;
export const CHAPTERS = [
  {
    title: 'A town without its song',
    objective: 'Meet Edda beside the arrival path.',
    detail:
      'The meadow’s lanterns have fallen silent. Edda thinks the town has forgotten how to listen.',
  },
  {
    title: 'Small things, bright voices',
    objective: 'Find three humming seeds, then restore the quiet beacon.',
    detail:
      'Humming seeds carry the sounds of places that care for them. Follow their golden glow through the village.',
  },
  {
    title: 'The seed library',
    objective:
      'Speak to Vale. Gather three pieces of memory glass in the western grove.',
    detail:
      'The beacon holds a message: the town once promised to leave room for the wild. Vale can piece it together.',
  },
  {
    title: 'A promise in the glass',
    objective: 'Bring the memory glass to the observatory.',
    detail:
      'The memories belong to the meadow itself. At the listening lens, fragments become a map of an old promise.',
  },
  {
    title: 'Untangle the echo',
    objective:
      'Meet the tangled echo. Touch its three tones within 45 seconds, then return.',
    detail:
      'The guardian is repeating a warning nobody heard. Answer each tone with a gentle paw.',
  },
  {
    title: 'The way grows back',
    objective: 'Open the orchard gate beyond the echo garden.',
    detail:
      'The town’s song returns when its creatures make space for one another. The orchard remembers your kindness.',
  },
  {
    title: 'Keeper of the meadow',
    objective:
      'Chapter complete. Explore the orchard, find secrets, and build your friendship.',
    detail:
      'Edda names you a keeper. In the restored orchard, a distant lantern answers: somewhere, another town is listening.',
  },
] as const;
export function newWorld(now: number): WorldProgress {
  return {
    position: [0, 16],
    updated: now,
    stage: 0,
    collected: [],
    discovered: ['meadow'],
    quests: [],
    secrets: [],
    checkpoint: 'camp',
    challenge: null,
    history: [],
  };
}
export function isWalkable(x: number, z: number, stage = 0) {
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(z) ||
    Math.abs(x) > WORLD_LIMIT ||
    z > WORLD_LIMIT ||
    z < (stage >= 6 ? -44 : -32)
  )
    return false;
  if (
    Math.abs(z - RIVER.z) < RIVER.depth / 2 + PLAYER_RADIUS &&
    !BRIDGES.some((bridge) => Math.abs(x - bridge) <= 2.2 - PLAYER_RADIUS)
  )
    return false;
  return !OBSTACLES.some(
    (o) =>
      Math.abs(x - o.x) < o.w / 2 + PLAYER_RADIUS &&
      Math.abs(z - o.z) < o.d / 2 + PLAYER_RADIUS,
  );
}
export function segmentWalkable(
  a: readonly number[],
  b: readonly number[],
  stage = 0,
) {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.2),
  );
  if (steps > 100) return false;
  for (let i = 1; i <= steps; i++)
    if (
      !isWalkable(
        a[0] + ((b[0] - a[0]) * i) / steps,
        a[1] + ((b[1] - a[1]) * i) / steps,
        stage,
      )
    )
      return false;
  return true;
}
export function slideMove(
  position: [number, number],
  dx: number,
  dz: number,
  stage: number,
): [number, number] {
  let [x, z] = position;
  if (segmentWalkable([x, z], [x + dx, z], stage)) x += dx;
  if (segmentWalkable([x, z], [x, z + dz], stage)) z += dz;
  return [x, z];
}
export function accessoryBonus(s: PlayerState) {
  const e = s.pet?.equipped || [];
  return {
    speed: e.includes('moon_collar') ? 1.1 : 1,
    friendship: e.includes('ribbon') ? 1 : 0,
    attack: e.includes('star_crown') ? 4 : 0,
    reward: e.includes('moon_fox') ? 1.1 : 1,
  };
}

/** Navigation grid over the same collision surface used by the server. Diagonal
 * edges cannot clip building corners. Used for tap-to-walk, never for rewards. */
export function findWorldPath(
  start: [number, number],
  target: [number, number],
  stage: number,
): [number, number][] {
  if (!isWalkable(...target, stage)) return [];
  if (segmentWalkable(start, target, stage)) return [target];
  const cell = 1.5,
    key = (x: number, z: number) => `${x},${z}`;
  const from: [number, number] = [
      Math.round(start[0] / cell),
      Math.round(start[1] / cell),
    ],
    end: [number, number] = [
      Math.round(target[0] / cell),
      Math.round(target[1] / cell),
    ];
  const origin = key(...from),
    finish = key(...end),
    open = new Map<string, { x: number; z: number; g: number; f: number }>(),
    closed = new Set<string>(),
    parent = new Map<string, string>();
  open.set(origin, { x: from[0], z: from[1], g: 0, f: 0 });
  for (let attempt = 0; open.size && attempt < 3000; attempt++) {
    let currentKey = '',
      current = { x: 0, z: 0, g: 0, f: Infinity };
    for (const [k, n] of open)
      if (n.f < current.f) {
        current = n;
        currentKey = k;
      }
    open.delete(currentKey);
    closed.add(currentKey);
    if (currentKey === finish) {
      const result: [number, number][] = [target];
      let k = currentKey;
      while (k !== origin) {
        const [x, z] = k.split(',').map(Number);
        result.unshift([x * cell, z * cell]);
        k = parent.get(k)!;
      }
      let prev = start;
      for (const p of result) {
        if (!segmentWalkable(prev, p, stage)) return [];
        prev = p;
      }
      return result;
    }
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dz) continue;
        const x = current.x + dx,
          z = current.z + dz,
          k = key(x, z);
        if (
          closed.has(k) ||
          !segmentWalkable(
            [current.x * cell, current.z * cell],
            [x * cell, z * cell],
            stage,
          )
        )
          continue;
        const g = current.g + Math.hypot(dx, dz);
        if ((open.get(k)?.g ?? Infinity) <= g) continue;
        parent.set(k, currentKey);
        open.set(k, { x, z, g, f: g + Math.hypot(x - end[0], z - end[1]) });
      }
  }
  return [];
}
