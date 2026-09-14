import { ensure } from '../game/engine';
// Only PNG uploads. Walk every chunk before accepting bytes; no SVG, URLs, or arbitrary formats.
export function validatePng(bytes: Uint8Array) {
  ensure(
    bytes.length >= 45 && bytes.length <= 4 * 1024 * 1024,
    'Upload a PNG no larger than 4 MB.',
  );
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  ensure(
    sig.every((b, i) => bytes[i] === b),
    'The upload must be a valid PNG.',
  );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  ensure(
    String.fromCharCode(...bytes.slice(12, 16)) === 'IHDR' &&
      view.getUint32(8) === 13,
    'Invalid PNG header.',
  );
  const width = view.getUint32(16),
    height = view.getUint32(20);
  ensure(
    width >= 64 && height >= 64 && width <= 2048 && height <= 2048,
    'Choose a PNG between 64 and 2048 pixels per side.',
  );
  let offset = 8,
    ended = false;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset);
    ensure(
      length <= bytes.length - offset - 12,
      'PNG contains an invalid chunk.',
    );
    const type = String.fromCharCode(...bytes.slice(offset + 4, offset + 8));
    ensure(type !== 'acTL', 'Animated PNG uploads are not supported.');
    offset += length + 12;
    if (type === 'IEND') {
      ensure(length === 0 && offset === bytes.length, 'Invalid PNG ending.');
      ended = true;
      break;
    }
  }
  ensure(ended, 'PNG is incomplete.');
  return { width, height };
}
