import {
  BUILDINGS,
  TREES,
  RIVER,
  BRIDGES,
  WORLD_OBJECTS,
  slideMove,
  accessoryBonus,
  findWorldPath,
  isWalkable,
} from '../game/world';
import type { PlayerState } from '../game/types';
import {
  projectWorld,
  unprojectWorld,
  depthScale,
  GROUND_TILT,
  type Point,
} from './world-projection';
import { loadWorldSheet, drawSprite, type SpriteSheet } from './world-sprites';
import { loadCompanionAtlas } from './companion-assets';
import { drawCompanion } from './companion-renderer';
import { sampleCompanionPose } from './companion-motion';
export type MeadowControls = {
  x: number;
  z: number;
  run: boolean;
  jump: boolean;
  zoom: number;
  mood: 'idle' | 'sit' | 'sleep';
  blocked?: boolean;
  pointer?: Point;
  click?: boolean;
};
export type MeadowView = {
  position: Point;
  nearest: string | null;
  fps: number;
};
type Actor = {
  x: number;
  z: number;
  cell: number;
  size: number;
  sway?: boolean;
  label?: string;
};
export async function mountMeadow(
  host: HTMLElement,
  initial: PlayerState,
  controls: MeadowControls,
  onFrame: (v: MeadowView) => void,
  _onError: (m: string) => void,
) {
  const custom =
    initial.pet?.appearanceFormat === 'companion-atlas-v1' &&
    initial.pet.appearance.startsWith('/api/assets/');
  const [props, sunbeam, starlight, rig] = await Promise.all([
    loadWorldSheet('/assets/meadow-props-v1.webp'),
    loadWorldSheet('/assets/sunbeam-world-v1.webp', 8),
    loadWorldSheet('/assets/starlight-world-v1.webp', 8),
    custom
      ? loadCompanionAtlas(initial.pet!.appearance)
      : Promise.resolve(null),
  ]);
  const canvas = document.createElement('canvas'),
    ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw Error('Your browser could not start the meadow.');
  canvas.tabIndex = 0;
  canvas.setAttribute(
    'aria-label',
    'Whispering Meadow. Move with WASD or arrows, tap a path to walk, press E to interact.',
  );
  host.appendChild(canvas);
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = media.matches;
  const preference = () => {
    reduced = media.matches;
  };
  media.addEventListener('change', preference);
  let state = initial,
    position: Point = [...(initial.world?.position || [0, 16])],
    camera: Point = [...position],
    width = 0,
    height = 0,
    dpr = 1,
    scale = 35,
    zoom = 1,
    disposed = false,
    raf = 0,
    last = performance.now(),
    time = 0,
    report = 0,
    gait = 0,
    speed = 0,
    direction = 0,
    flip = false,
    previousCell = 24,
    blend = 1,
    cell = 24,
    jump = 0,
    vy = 0,
    reactUntil = 0,
    way: Point[] = [],
    target: Point | null = null;
  const resize = () => {
    width = host.clientWidth;
    height = host.clientHeight;
    dpr = Math.min(devicePixelRatio, width < 760 ? 1.5 : 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const actors: Actor[] = [
    ...BUILDINGS.map((b, i) => ({
      x: b.x,
      z: b.z + b.d / 2,
      cell: i,
      size: 11.5,
      label: b.name,
    })),
    ...TREES.map(([x, z], i) => ({
      x,
      z,
      cell: i % 4 === 0 ? 5 : 4,
      size: 8 + (i % 3) * 0.55,
      sway: true,
    })),
    { x: 0, z: 0, cell: 8, size: 7 },
    { x: -24, z: -18, cell: 7, size: 7 },
    { x: 23, z: 20, cell: 7, size: 8 },
  ];
  for (let i = 0; i < 70; i++) {
    const x = Math.sin(i * 127.1) * 32,
      z = Math.cos(i * 311.7) * 33;
    if (
      isWalkable(x, z, 6) &&
      Math.abs(x) > 4 &&
      Math.abs(z - 14) > 3 &&
      Math.abs(z + 2) > 3
    )
      actors.push({ x, z, cell: 6, size: 2.6, sway: true });
  }
  const motes = Array.from({ length: width < 760 ? 60 : 130 }, (_, i) => ({
    x: Math.sin(i * 131.4) * 34,
    z: Math.cos(i * 57.7) * 37,
    ox: 0,
    oz: 0,
    vx: 0,
    vz: 0,
    phase: i * 2.3,
  }));
  const footprints: { x: number; z: number; age: number }[] = [];
  let step = 0;
  const p = (x: number, z: number) =>
    projectWorld([x, z], camera, scale, width, height);
  const ellipse = (
    x: number,
    y: number,
    rx: number,
    ry: number,
    color: string,
  ) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const rect = (x: number, z: number, w: number, d: number, color: string) => {
    const a = p(x - w / 2, z - d / 2);
    ctx.fillStyle = color;
    ctx.fillRect(a[0], a[1], w * scale, d * scale * GROUND_TILT);
  };
  const ground = () => {
    ctx.fillStyle = '#69926e';
    ctx.fillRect(0, 0, width, height);
    const top = unprojectWorld([-50, -50], camera, scale, width, height),
      bottom = unprojectWorld(
        [width + 50, height + 50],
        camera,
        scale,
        width,
        height,
      );
    for (let z = Math.floor(top[1] / 2) * 2; z < bottom[1]; z += 2)
      for (let x = Math.floor(top[0] / 2) * 2; x < bottom[0]; x += 2) {
        const noise = Math.sin(x * 41 + z * 129) * 0.5 + 0.5,
          q = p(x, z);
        ellipse(
          q[0],
          q[1],
          scale * (0.4 + noise),
          scale * 0.35,
          noise > 0.5 ? '#7c9f731e' : '#2c6a5512',
        );
      }
    rect(0, -5, 5, 76, '#bbae87');
    rect(0, 14, 40, 4, '#bbae87');
    rect(0, -2, 36, 4, '#bbae87');
    for (const x of [-18, 24]) rect(x, -14, 4.4, 18, '#bbae87');
    ellipse(...p(0, 0), scale * 6.5, scale * 6.5 * GROUND_TILT, '#bbae87');
    rect(0, RIVER.z, 70, RIVER.depth + 1.1, '#aebd94');
    rect(0, RIVER.z, 70, RIVER.depth, '#428e9b');
    for (let i = 0; i < 70; i++) {
      const q = p(-35 + i, RIVER.z + Math.sin(i * 7) * 1.5);
      ctx.strokeStyle = '#a0e0d64a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const offset = reduced ? 0 : Math.sin(time + i) * 5;
      ctx.moveTo(q[0] + offset, q[1]);
      ctx.lineTo(q[0] + scale * 0.65 + offset, q[1]);
      ctx.stroke();
    }
    for (const x of BRIDGES) {
      const q = p(x, RIVER.z);
      drawSprite(ctx, props, 9, q[0], q[1] + scale * 0.25, scale * 8.8);
    }
    if ((state.world?.stage || 0) < 6) rect(0, -34.5, 70, 4, '#395e49');
    for (const f of footprints)
      ellipse(
        ...p(f.x, f.z),
        scale * 0.095,
        scale * 0.06,
        `rgba(64,71,44,${Math.max(0, 0.19 - f.age * 0.06)})`,
      );
  };
  const label = (text: string, x: number, y: number) => {
    ctx.font = '600 12px system-ui';
    ctx.textAlign = 'center';
    const w = ctx.measureText(text).width;
    ctx.fillStyle = '#203c37dc';
    ctx.beginPath();
    ctx.roundRect(x - w / 2 - 8, y - 16, w + 16, 23, 7);
    ctx.fill();
    ctx.fillStyle = '#fff2c9';
    ctx.fillText(text, x, y);
  };
  const drawActor = (a: Actor) => {
    const q = p(a.x, a.z),
      size = a.size * scale * depthScale(a.z, camera[1]);
    if (
      q[0] + size / 2 < 0 ||
      q[0] - size / 2 > width ||
      q[1] < -size * 0.4 ||
      q[1] - size > height
    )
      return;
    const petPoint = p(...position),
      overlap =
        q[1] > petPoint[1] &&
        q[1] - size * 0.65 < petPoint[1] &&
        Math.abs(q[0] - petPoint[0]) < size * 0.32;
    ellipse(
      q[0] + size * 0.065,
      q[1] + 2,
      size * 0.25,
      size * 0.055,
      '#213f3e32',
    );
    ctx.save();
    if (overlap) ctx.globalAlpha = 0.52;
    if (a.sway && !reduced) {
      ctx.translate(...q);
      ctx.transform(1, 0, Math.sin(time * 1.1 + a.x) * 0.012, 1, 0, 0);
      drawSprite(ctx, props, a.cell, 0, 0, size);
    } else drawSprite(ctx, props, a.cell, ...q, size);
    ctx.restore();
    if (a.label && Math.hypot(a.x - position[0], a.z - position[1]) < 9)
      label(a.label, q[0], q[1] - size * 0.64);
  };
  const drawPet = (
    sheet: SpriteSheet,
    x: number,
    z: number,
    frame: number,
    size: number,
    player = false,
  ) => {
    const q = p(x, z),
      s = size * scale * depthScale(z, camera[1]);
    ellipse(
      q[0] + 4,
      q[1] + 2,
      s * 0.19 * (1 - jump * 0.035),
      s * 0.048,
      '#173e3c45',
    );
    if (player && rig) {
      const pose = sampleCompanionPose(
          controls.mood === 'sleep'
            ? 'rest'
            : time < reactUntil
              ? 'pet'
              : 'idle',
          1500,
          time * 1000,
          { x: controls.x, y: controls.z },
          reduced,
        ),
        stride = Math.sin((gait * Math.PI) / 3) * Math.min(1, speed / 5);
      pose.leftArm += stride * 24;
      pose.rightArm -= stride * 24;
      pose.leftFoot = stride * 17;
      pose.rightFoot = -stride * 17;
      ctx.save();
      ctx.translate(q[0], q[1] - jump * scale);
      ctx.scale(s / 690, s / 690);
      ctx.translate(-500, -864);
      drawCompanion(ctx, rig, pose, state.pet?.equipped || []);
      ctx.restore();
      return;
    }
    if (player && blend < 1) {
      ctx.save();
      ctx.globalAlpha = 1 - blend;
      drawSprite(ctx, sheet, previousCell, q[0], q[1] - jump * scale, s, flip);
      ctx.restore();
    }
    ctx.save();
    if (player) ctx.globalAlpha = blend;
    drawSprite(
      ctx,
      sheet,
      frame,
      q[0],
      q[1] - (player ? jump * scale : 0),
      s,
      player && flip,
    );
    ctx.restore();
    if (player && controls.mood === 'sleep' && speed < 0.1)
      label('z z z', q[0] + 18, q[1] - s * 0.55);
  };
  const visibility = () => {
    last = performance.now();
    way = [];
    target = null;
    controls.x = controls.z = 0;
  };
  document.addEventListener('visibilitychange', visibility);
  const loop = (now: number) => {
    if (disposed) return;
    raf = requestAnimationFrame(loop);
    const elapsed = Math.max(0.001, (now - last) / 1000);
    const dt = Math.min(0.04, elapsed);
    last = now;
    if (document.hidden || !width || !height) return;
    time += dt;
    report += dt;
    zoom = Math.max(0.8, Math.min(1.35, zoom - controls.zoom * 0.015));
    controls.zoom = 0;
    scale = (width < 760 ? 29 : 38) * zoom;
    const stage = state.world?.stage || 0,
      pointer = controls.pointer
        ? unprojectWorld(
            [
              ((controls.pointer[0] + 1) * width) / 2,
              ((1 - controls.pointer[1]) * height) / 2,
            ],
            camera,
            scale,
            width,
            height,
          )
        : null;
    if (controls.click && pointer && !controls.blocked) {
      if (
        Math.hypot(pointer[0] - position[0], pointer[1] - position[1]) < 1.2
      ) {
        reactUntil = time + 1.7;
        way = [];
        target = null;
      } else {
        way = findWorldPath(position, pointer, stage);
        target = way.length ? pointer : null;
        controls.mood = 'idle';
      }
    }
    controls.click = false;
    let dx = controls.x,
      dz = controls.z;
    if (dx || dz) {
      way = [];
      target = null;
      controls.mood = 'idle';
    }
    if (controls.blocked) {
      dx = dz = 0;
      way = [];
      target = null;
    }
    while (
      way.length &&
      Math.hypot(way[0][0] - position[0], way[0][1] - position[1]) < 0.13
    )
      way.shift();
    if (way.length) {
      dx = way[0][0] - position[0];
      dz = way[0][1] - position[1];
    } else target = null;
    const mag = Math.hypot(dx, dz),
      desired =
        mag > 0.02 ? (controls.run ? 7 : 4.6) * accessoryBonus(state).speed : 0;
    speed += (desired - speed) * (1 - Math.exp(-dt * 16));
    if (mag > 0.02) {
      const distance = Math.min(speed * dt, way.length ? mag : Infinity);
      position = slideMove(
        position,
        (dx / mag) * distance,
        (dz / mag) * distance,
        stage,
      );
      flip = dx < -0.05;
      direction =
        Math.abs(dz) > Math.abs(dx) * 1.6
          ? dz < 0
            ? 1
            : 0
          : Math.abs(dx) > Math.abs(dz) * 1.6
            ? 2
            : dz < 0
              ? 1
              : 3;
      gait += distance * 2.2;
      step += distance;
      if (step > 0.85) {
        step = 0;
        footprints.push({
          x: position[0] + (Math.floor(gait) % 2 ? -0.16 : 0.16),
          z: position[1],
          age: 0,
        });
      }
    }
    footprints.forEach((f) => (f.age += dt));
    while (footprints.length && footprints[0].age > 3.2) footprints.shift();
    if (controls.jump && jump === 0 && !controls.blocked) {
      vy = 5;
      controls.mood = 'idle';
    }
    controls.jump = false;
    vy -= 15 * dt;
    jump = Math.max(0, jump + vy * dt);
    if (!jump) vy = 0;
    camera[0] +=
      (position[0] - camera[0]) * (1 - Math.exp(-dt * (reduced ? 40 : 7)));
    camera[1] +=
      (position[1] - camera[1]) * (1 - Math.exp(-dt * (reduced ? 40 : 7)));
    const moving = desired > 0,
      next = moving
        ? direction * 6 + (Math.floor(gait) % 6)
        : (time < reactUntil
            ? 36
            : controls.mood === 'sleep'
              ? 32
              : controls.mood === 'sit'
                ? 28
                : 24) + direction;
    if (next !== cell) {
      previousCell = cell;
      cell = next;
      blend = 0;
    }
    blend = Math.min(1, blend + dt * (moving ? 25 : 8));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ground();
    if (target) {
      ctx.strokeStyle = '#fff2b5b0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(
        ...p(...target),
        scale * 0.45,
        scale * 0.3,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    const visible = WORLD_OBJECTS.filter(
        (o) =>
          stage >= o.stage && !(state.world?.collected || []).includes(o.id),
      ),
      sorted: { z: number; draw: () => void }[] = actors.map((a) => ({
        z: a.z,
        draw: () => drawActor(a),
      }));
    sorted.push({
      z: position[1],
      draw: () =>
        drawPet(
          state.pet?.appearance.includes('starlight') ? starlight : sunbeam,
          ...position,
          cell,
          3.8,
          true,
        ),
    });
    const cells: Record<string, number> = {
      seed: 12,
      shard: 13,
      secret: 10,
      beacon: 14,
      tone: 15,
      challenge: 15,
      gate: 11,
      checkpoint: 14,
    };
    for (const o of visible) {
      if (['npc', 'shop'].includes(o.kind)) {
        sorted.push({
          z: o.z,
          draw: () => {
            drawPet(o.id === 'vale' ? starlight : sunbeam, o.x, o.z, 24, 3.4);
            const q = p(o.x, o.z);
            label(o.name.split(' · ')[0], q[0], q[1] - scale * 2.5);
          },
        });
        continue;
      }
      const c = cells[o.kind];
      if (c !== undefined)
        sorted.push({
          z: o.z,
          draw: () =>
            drawActor({
              x: o.x,
              z: o.z,
              cell: c,
              size:
                o.kind === 'gate'
                  ? 9
                  : ['tone', 'seed', 'shard'].includes(o.kind)
                    ? 3.3
                    : 4.2,
            }),
        });
    }
    sorted.sort((a, b) => a.z - b.z).forEach((o) => o.draw());
    let nearest: string | null = null,
      near = 3.3;
    for (const o of visible) {
      const d = Math.hypot(o.x - position[0], o.z - position[1]);
      if (d < near) {
        nearest = o.id;
        near = d;
      }
      const q = p(o.x, o.z);
      if (d < 11 && o.kind !== 'secret')
        ellipse(
          q[0],
          q[1] - scale * 2.5 + (reduced ? 0 : Math.sin(time * 2 + o.x) * 3),
          3,
          3,
          o.kind === 'seed' ? '#ffdb83' : '#e9efb0',
        );
    }
    if (nearest) {
      const o = visible.find((o) => o.id === nearest)!;
      ctx.strokeStyle = '#ffedb6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(...p(o.x, o.z), scale * 0.6, scale * 0.32, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (!reduced)
      for (const m of motes) {
        const wx = m.x + m.ox,
          wz = m.z + m.oz,
          d = pointer ? Math.hypot(wx - pointer[0], wz - pointer[1]) : 100,
          force = d < 3 ? (1 - d / 3) * 6 : 0;
        m.vx +=
          ((pointer ? ((wx - pointer[0]) / Math.max(0.1, d)) * force : 0) -
            m.ox * 2) *
          dt;
        m.vz +=
          ((pointer ? ((wz - pointer[1]) / Math.max(0.1, d)) * force : 0) -
            m.oz * 2) *
          dt;
        m.vx *= Math.exp(-dt * 3);
        m.vz *= Math.exp(-dt * 3);
        m.ox += m.vx * dt;
        m.oz += m.vz * dt;
        const q = p(wx, wz);
        ellipse(
          q[0] + Math.sin(time + m.phase) * 8,
          q[1] - 18 - Math.cos(time + m.phase) * 8,
          1.8,
          1.8,
          '#fff3b899',
        );
      }
    if (!reduced) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const glow = ctx.createRadialGradient(
        width * 0.18 - camera[0] * 3,
        height * 0.1,
        0,
        width * 0.18 - camera[0] * 3,
        height * 0.1,
        width * 0.8,
      );
      glow.addColorStop(0, '#ffeab83a');
      glow.addColorStop(1, '#b7d9f800');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
    if (report >= 0.1) {
      report = 0;
      onFrame({
        position: [...position],
        nearest,
        fps: Math.round(1 / elapsed),
      });
    }
  };
  raf = requestAnimationFrame(loop);
  return {
    update(next: PlayerState) {
      state = next;
    },
    reset(pos: Point) {
      position = [...pos];
      way = [];
      target = null;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      media.removeEventListener('change', preference);
      document.removeEventListener('visibilitychange', visibility);
      canvas.remove();
    },
  };
}
