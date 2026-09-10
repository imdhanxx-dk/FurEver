export type PetReaction =
  | 'idle'
  | 'pet'
  | 'tickle'
  | 'paw'
  | 'ear'
  | 'surprised'
  | 'defensive'
  | 'feed'
  | 'groom'
  | 'play'
  | 'rest'
  | 'train'
  | 'listen'
  | 'talk';
export type CareKind = 'feed' | 'pet' | 'groom' | 'play' | 'rest' | 'train';
export type PetCue = { kind: PetReaction; id: number };
export const REACTION_LENGTH: Record<PetReaction, number> = {
  idle: 0,
  pet: 3000,
  tickle: 3000,
  paw: 2300,
  ear: 1700,
  surprised: 1700,
  defensive: 3000,
  feed: 4500,
  groom: 4500,
  play: 5000,
  rest: 10000,
  train: 4400,
  listen: 8000,
  talk: 8000,
};
export const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

// Bone transforms are sampled from time, not accumulated per frame: low frame
// rates and returning from another tab cannot speed up or drift the animation.
export function sampleCompanionPose(
  kind: PetReaction,
  elapsed: number,
  time: number,
  look: { x: number; y: number },
  reduced = false,
) {
  const duration = REACTION_LENGTH[kind];
  const active = duration > 0 && elapsed >= 0 && elapsed < duration;
  const weight = active
    ? Math.min(1, elapsed / 180, (duration - elapsed) / 280)
    : 0;
  const t = elapsed / 1000;
  const wave = Math.sin(t * 7);
  const idle = reduced ? 0 : Math.sin(time / 1250);
  const pose = {
    x: 0,
    y: 0,
    body: 0,
    breath: idle * 0.012,
    head: reduced ? 0 : clamp(look.x, -1, 1) * 7 + idle * 1.2,
    headY: reduced ? 0 : clamp(look.y, -1, 1) * 7,
    leftArm: 6,
    rightArm: -6,
    leftFoot: 0,
    rightFoot: 0,
    tail: reduced ? 0 : Math.sin(time / 480) * 9,
    face: !reduced && time % 4700 > 4510 ? 2 : 0,
    eyeX: reduced ? 0 : clamp(look.x, -1, 1),
    eyeY: reduced ? 0 : clamp(look.y, -1, 1),
    active,
  };
  if (!active) return pose;
  switch (kind) {
    case 'pet':
    case 'groom':
      pose.head += (kind === 'groom' ? -10 : 10) * weight + wave * 3 * weight;
      pose.face = 1;
      pose.tail *= 1.5;
      break;
    case 'tickle':
      pose.face = 9;
      pose.body = wave * 4 * weight;
      pose.leftArm -= (25 + wave * 12) * weight;
      pose.rightArm += (25 - wave * 12) * weight;
      break;
    case 'paw':
      pose.face = 1;
      pose.rightArm -= (120 + wave * 8) * weight;
      pose.head -= 9 * weight;
      break;
    case 'ear':
      pose.head += wave * 8 * weight;
      pose.face = 3;
      break;
    case 'surprised':
    case 'defensive':
      pose.face = 3;
      pose.headY -= 12 * weight;
      pose.body -= 4 * weight;
      pose.leftArm -= 24 * weight;
      pose.rightArm += 24 * weight;
      break;
    case 'feed':
      pose.face = Math.sin(t * 10) > 0 ? 9 : 1;
      pose.headY += (10 + wave * 3) * weight;
      pose.leftArm -= 62 * weight;
      pose.rightArm += 62 * weight;
      break;
    case 'play':
    case 'train':
      pose.face = 9;
      pose.x = Math.sin(t * 4) * 24 * weight;
      pose.y =
        -Math.abs(Math.sin(t * 5)) * (kind === 'train' ? 65 : 28) * weight;
      pose.body = Math.sin(t * 4) * 7 * weight;
      pose.leftArm -= (25 + wave * 28) * weight;
      pose.rightArm += (25 - wave * 28) * weight;
      pose.leftFoot = wave * 10 * weight;
      pose.rightFoot = -wave * 10 * weight;
      break;
    case 'rest':
      pose.face = 8;
      pose.head += 16 * weight;
      pose.headY += 18 * weight;
      pose.body = 3 * weight;
      pose.tail *= 0.25;
      break;
    case 'listen':
      pose.head -= 12 * weight;
      pose.face = 0;
      break;
    case 'talk':
      pose.face = Math.sin(t * 16) > 0 ? 9 : 0;
      pose.head += wave * 3 * weight;
      pose.rightArm += 15 * weight;
      break;
  }
  if (reduced) {
    pose.x = pose.y = pose.body = pose.tail = pose.breath = 0;
    pose.head = 0;
    pose.headY = 0;
    pose.leftArm = 6;
    pose.rightArm = kind === 'paw' ? -126 : -6;
    pose.leftFoot = pose.rightFoot = 0;
  }
  return pose;
}

export function companionHit(x: number, y: number) {
  if (x < 0.18 || x > 0.88 || y < 0.1 || y > 0.91) return null;
  if (x > 0.73 && y > 0.45) return 'tail';
  if (y < 0.3) return 'ear';
  if (y < 0.54) return 'head';
  if (y < 0.6) return 'chin';
  if (y > 0.8 || x < 0.37 || x > 0.63) return 'paw';
  if (x > 0.44 && x < 0.56 && y > 0.74 && y < 0.8) return 'private';
  return 'belly';
}
