/** Fixed, angled projection. Gameplay coordinates stay on a flat plane. */
export const GROUND_TILT = 0.68;
export type Point = [number, number];
export function projectWorld(
  point: readonly number[],
  camera: readonly number[],
  scale: number,
  width: number,
  height: number,
): Point {
  return [
    width / 2 + (point[0] - camera[0]) * scale,
    height * 0.56 + (point[1] - camera[1]) * scale * GROUND_TILT,
  ];
}
export function unprojectWorld(
  point: readonly number[],
  camera: readonly number[],
  scale: number,
  width: number,
  height: number,
): Point {
  return [
    camera[0] + (point[0] - width / 2) / scale,
    camera[1] + (point[1] - height * 0.56) / (scale * GROUND_TILT),
  ];
}
export function depthScale(z: number, cameraZ: number) {
  return Math.max(0.88, Math.min(1.08, 1 + (z - cameraZ) * 0.003));
}
