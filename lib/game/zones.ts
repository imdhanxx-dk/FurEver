export type TouchZone =
  | 'head'
  | 'ear'
  | 'chin'
  | 'back'
  | 'belly'
  | 'paw'
  | 'tail'
  | 'private';
// Normalized coordinates for the starter asset. Rigged species can supply their own atlas.
export function touchZone(x: number, y: number): TouchZone {
  if (y < 0.3) return 'ear';
  if (y < 0.57) return 'head';
  if (y < 0.65) return 'chin';
  if (x > 0.7) return 'tail';
  if (x > 0.44 && x < 0.56 && y > 0.74 && y < 0.8) return 'private';
  if (y > 0.8) return 'paw';
  return 'belly';
}
