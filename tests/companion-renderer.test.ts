import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prepareCompanionAtlas } from '../lib/client/companion-renderer';

function fixture(transparent: boolean) {
  const width = 80,
    height = 60,
    data = new Uint8ClampedArray(width * height * 4);
  const pixel = (x: number, y: number, color: number[]) =>
    data.set(color, (y * width + x) * 4);
  if (!transparent)
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) pixel(x, y, [220, 220, 220, 255]);
  for (let i = 0; i < 12; i++) {
    const left = (i % 4) * 20,
      top = Math.floor(i / 4) * 20;
    for (let y = 5; y < 15; y++)
      for (let x = 5; x < 15; x++)
        pixel(left + x, top + y, [40, 130, 210, 255]);
    pixel(left + 10, top + 10, [255, 255, 255, 255]);
    if (transparent) pixel(left + 4, top + 10, [255, 255, 255, 255]);
  }
  const previous = globalThis.document;
  globalThis.document = {
    createElement: () => ({
      getContext: () => ({
        drawImage() {},
        getImageData: () => ({ data }),
        putImageData() {},
      }),
    }),
  } as unknown as Document;
  try {
    const atlas = prepareCompanionAtlas({
      naturalWidth: width,
      naturalHeight: height,
    } as HTMLImageElement);
    return {
      atlas,
      data,
      alpha: (x: number, y: number) => data[(y * width + x) * 4 + 3],
    };
  } finally {
    globalThis.document = previous;
  }
}

test('real alpha retains white fur at cutout edges', () => {
  const result = fixture(true);
  assert.equal(result.alpha(4, 10), 255);
  assert.equal(result.alpha(10, 10), 255);
  assert.equal(result.alpha(0, 0), 0);
  assert.equal(result.atlas.parts.length, 12);
});

test('opaque preview matte is removed without erasing interior highlights', () => {
  const result = fixture(false);
  assert.equal(result.alpha(0, 0), 0);
  assert.equal(result.alpha(10, 10), 255);
  assert.equal(result.atlas.parts[0].w, 10);
});
