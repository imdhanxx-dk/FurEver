export type Kitten = {
  id: number;
  tier: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};
export type KittenRound = {
  id: string;
  started: number;
  updated: number;
  drops: number;
  next: number;
  score: number;
  merges: number;
  balls: Kitten[];
  finished: boolean;
};
export const KITTEN_RADII = [18, 23, 29, 36, 44, 53, 64];
export const BASKET_WIDTH = 360,
  BASKET_HEIGHT = 470,
  DROP_STEPS = 140;
/** Fixed-step authoritative physics. Browser replays this same simulation for
 * animation; only the server chooses the next kitten and awards currency. */
export function dropKitten(
  round: KittenRound,
  aim: number,
  snapshot?: (balls: Kitten[]) => void,
): KittenRound {
  const r: KittenRound = structuredClone(round),
    radius = KITTEN_RADII[r.next];
  r.balls.push({
    id: r.drops + 1,
    tier: r.next,
    x: Math.max(radius + 5, Math.min(BASKET_WIDTH - radius - 5, aim)),
    y: 55,
    vx: 0,
    vy: 0,
  });
  r.drops++;
  for (let tick = 0; tick < DROP_STEPS; tick++) {
    for (const a of r.balls) {
      const rad = KITTEN_RADII[a.tier];
      a.vy += 0.22;
      a.x += a.vx;
      a.y += a.vy;
      a.vx *= 0.985;
      if (a.x < rad + 4) {
        a.x = rad + 4;
        a.vx = Math.abs(a.vx) * 0.3;
      }
      if (a.x > BASKET_WIDTH - rad - 4) {
        a.x = BASKET_WIDTH - rad - 4;
        a.vx = -Math.abs(a.vx) * 0.3;
      }
      if (a.y > BASKET_HEIGHT - rad - 5) {
        a.y = BASKET_HEIGHT - rad - 5;
        a.vy = -Math.abs(a.vy) * 0.14;
        if (Math.abs(a.vy) < 0.4) a.vy = 0;
      }
    }
    for (let pass = 0; pass < 3; pass++)
      for (let i = 0; i < r.balls.length; i++)
        for (let j = i + 1; j < r.balls.length; j++) {
          const a = r.balls[i],
            b = r.balls[j],
            dx = b.x - a.x,
            dy = b.y - a.y,
            dist = Math.hypot(dx, dy),
            touch = KITTEN_RADII[a.tier] + KITTEN_RADII[b.tier];
          if (dist >= touch) continue;
          if (a.tier === b.tier && a.tier < 6) {
            a.tier++;
            a.x = (a.x + b.x) / 2;
            a.y = (a.y + b.y) / 2;
            a.vx = (a.vx + b.vx) / 2;
            a.vy = -0.6;
            r.score += 2 ** a.tier * 10;
            r.merges++;
            r.balls.splice(j, 1);
            j--;
            continue;
          }
          const nx = dist > 0.001 ? dx / dist : a.id < b.id ? 1 : -1,
            ny = dist > 0.001 ? dy / dist : 0,
            overlap = touch - dist;
          a.x -= nx * overlap * 0.51;
          a.y -= ny * overlap * 0.51;
          b.x += nx * overlap * 0.51;
          b.y += ny * overlap * 0.51;
          const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (relative < 0) {
            const impulse = relative * 0.52;
            a.vx += nx * impulse;
            a.vy += ny * impulse;
            b.vx -= nx * impulse;
            b.vy -= ny * impulse;
          }
        }
    snapshot?.(r.balls.map((b) => ({ ...b })));
  }
  // Tiny floating-point differences cannot accumulate into different saves.
  r.balls.forEach((b) => {
    for (const k of ['x', 'y', 'vx', 'vy'] as const)
      b[k] = Math.round(b[k] * 1000) / 1000;
  });
  r.finished =
    r.drops >= 30 || r.balls.some((b) => b.y - KITTEN_RADII[b.tier] < 52);
  return r;
}
