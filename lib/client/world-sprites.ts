export type SpriteSheet = {
  image: HTMLImageElement;
  cell: number;
  columns: number;
  anchor: number;
};
const publicSheets = new Map<string, Promise<SpriteSheet>>();
export function loadWorldSheet(
  source: string,
  columns = 4,
): Promise<SpriteSheet> {
  let pending = publicSheets.get(source);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        resolve({
          image,
          cell: image.naturalWidth / columns,
          columns,
          anchor: columns === 8 ? 0.694 : 0.673,
        });
      image.onerror = () =>
        reject(
          new Error('The meadow artwork could not load. Please re-enter.'),
        );
      image.src = source;
    });
    publicSheets.set(source, pending);
    void pending.catch(() => publicSheets.delete(source));
  }
  return pending;
}
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  sheet: SpriteSheet,
  cell: number,
  x: number,
  y: number,
  size: number,
  flip = false,
) {
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(
    sheet.image,
    (cell % sheet.columns) * sheet.cell,
    Math.floor(cell / sheet.columns) * sheet.cell,
    sheet.cell,
    sheet.cell,
    -size / 2,
    -size * sheet.anchor,
    size,
    size,
  );
  ctx.restore();
}
