import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validatePng } from '../lib/server/generation';
import { limitedBytes } from '../lib/server/security';
import { touchZone } from '../lib/game/zones';
test('safe PNG validator rejects bad signatures, oversized dimensions and truncated files', async () => {
  const bytes = new Uint8Array(
    await readFile(new URL('../public/icon-192.png', import.meta.url)),
  );
  assert.deepEqual(validatePng(bytes), { width: 192, height: 192 });
  assert.throws(() =>
    validatePng(new TextEncoder().encode('<svg onload="bad()"></svg>')),
  );
  const bad = bytes.slice();
  new DataView(bad.buffer).setUint32(16, 100000);
  assert.throws(() => validatePng(bad), /pixels/);
  assert.throws(() => validatePng(bytes.slice(0, -20)), /chunk|incomplete/);
});
test('streamed request body is bounded even without Content-Length', async () => {
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new Uint8Array(10));
      c.enqueue(new Uint8Array(20));
      c.close();
    },
  });
  const request = new Request('https://game.test/api/action', {
    method: 'POST',
    body: stream,
    duplex: 'half',
  } as RequestInit);
  await assert.rejects(() => limitedBytes(request, 15), /too large/);
});
test('private hit-zone classification remains separate from affection zones', () => {
  assert.equal(touchZone(0.5, 0.77), 'private');
  assert.equal(touchZone(0.5, 0.45), 'head');
  assert.equal(touchZone(0.8, 0.7), 'tail');
  assert.equal(touchZone(0.5, 0.85), 'paw');
});
