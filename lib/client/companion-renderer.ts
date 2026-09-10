import type { sampleCompanionPose } from './companion-motion';
type Pose = ReturnType<typeof sampleCompanionPose>;
type Rect = { x: number; y: number; w: number; h: number };
export type CompanionAtlas = { image: HTMLCanvasElement; parts: Rect[] };

export function prepareCompanionAtlas(image: HTMLImageElement): CompanionAtlas {
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data,
    width = canvas.width,
    height = canvas.height;
  // Never key white fur from an atlas that already has real transparency.
  let hasAlpha = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 12) {
      hasAlpha = true;
      break;
    }
  }
  // Key the neutral preview matte at render time, only where connected to each
  // cell's border. Interior eye highlights and cream fur remain intact.
  const cw = width / 4,
    ch = height / 3;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const parts: Rect[] = [];
  for (let cell = 0; cell < 12; cell++) {
    const x0 = Math.round((cell % 4) * cw),
      y0 = Math.round(Math.floor(cell / 4) * ch);
    const x1 = Math.round(((cell % 4) + 1) * cw),
      y1 = Math.round((Math.floor(cell / 4) + 1) * ch);
    let first = 0,
      last = 0;
    const enqueue = (x: number, y: number) => {
      const i = y * width + x;
      if (visited[i]) return;
      visited[i] = 1;
      const p = i * 4,
        r = data[p],
        g = data[p + 1],
        b = data[p + 2];
      if (
        data[p + 3] < 12 ||
        (!hasAlpha &&
          Math.max(r, g, b) - Math.min(r, g, b) < 12 &&
          Math.min(r, g, b) > 160)
      ) {
        data[p + 3] = 0;
        queue[last++] = i;
      }
    };
    for (let x = x0; x < x1; x++) {
      enqueue(x, y0);
      enqueue(x, y1 - 1);
    }
    for (let y = y0; y < y1; y++) {
      enqueue(x0, y);
      enqueue(x1 - 1, y);
    }
    while (first < last) {
      const i = queue[first++],
        x = i % width,
        y = Math.floor(i / width);
      if (x > x0) enqueue(x - 1, y);
      if (x < x1 - 1) enqueue(x + 1, y);
      if (y > y0) enqueue(x, y - 1);
      if (y < y1 - 1) enqueue(x, y + 1);
    }
    let l = x1,
      t = y1,
      r = x0,
      b = y0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) {
        if (data[(y * width + x) * 4 + 3] > 30) {
          l = Math.min(l, x);
          t = Math.min(t, y);
          r = Math.max(r, x);
          b = Math.max(b, y);
        }
      }
    if (r - l < cw * 0.08 || b - t < ch * 0.08)
      throw new Error('Incomplete companion parts');
    parts.push({
      x: l,
      y: t,
      w: Math.max(1, r - l + 1),
      h: Math.max(1, b - t + 1),
    });
  }
  ctx.putImageData(pixels, 0, 0);
  return { image: canvas, parts };
}

export function drawCompanion(
  ctx: CanvasRenderingContext2D,
  atlas: CompanionAtlas,
  pose: Pose,
  equipped: string[],
) {
  const part = (
    index: number,
    x: number,
    y: number,
    w: number,
    h: number,
    angle = 0,
    ax = 0.5,
    ay = 0.5,
  ) => {
    const r = atlas.parts[index];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.drawImage(atlas.image, r.x, r.y, r.w, r.h, -w * ax, -h * ay, w, h);
    ctx.restore();
  };
  ctx.save();
  ctx.fillStyle = '#46362530';
  ctx.beginPath();
  ctx.ellipse(
    500,
    864,
    155 + pose.y * 0.2,
    21 + pose.y * 0.03,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.translate(pose.x, pose.y);
  ctx.translate(500, 850);
  ctx.rotate((pose.body * Math.PI) / 180);
  ctx.translate(-500, -850);
  if (equipped.includes('aurora')) {
    const glow = ctx.createRadialGradient(500, 540, 160, 500, 540, 360);
    glow.addColorStop(0, '#9fdcca00');
    glow.addColorStop(0.6, '#9fdcca33');
    glow.addColorStop(1, '#9fdcca00');
    ctx.fillStyle = glow;
    ctx.fillRect(100, 100, 800, 800);
  }
  part(7, 570, 780, 275, 355, pose.tail, 0.15, 0.86);
  part(10, 431, 835, 121, 140, pose.leftFoot, 0.5, 0.85);
  part(11, 560, 835, 121, 140, pose.rightFoot, 0.5, 0.85);
  part(
    4,
    500,
    779,
    298 * (1 + pose.breath),
    350 * (1 + pose.breath),
    0,
    0.5,
    0.95,
  );
  part(5, 399, 568, 103, 205, pose.leftArm, 0.5, 0.13);
  part(6, 599, 568, 103, 205, pose.rightArm, 0.5, 0.13);
  part(
    pose.face,
    500 + pose.eyeX * 5,
    546 + pose.headY,
    493,
    460,
    pose.head,
    0.5,
    0.92,
  );
  if (equipped.includes('star_crown')) {
    ctx.font = '80px Georgia';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#eeb749';
    ctx.fillText('♛', 500, 130);
  }
  if (equipped.includes('ribbon')) {
    ctx.font = '42px Georgia';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e18b89';
    ctx.fillText('✦', 500, 592);
  }
  ctx.restore();
}
