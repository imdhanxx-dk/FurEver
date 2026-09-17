import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientAddress } from '../lib/server/security';
const withHeaders = (headers: Record<string, string>) =>
  new Request('https://furever.example/api/auth/login', { headers });
void test('the caller address is read from the header each host actually sets', () => {
  assert.equal(
    clientAddress(withHeaders({ 'cf-connecting-ip': '203.0.113.7' })),
    '203.0.113.7',
  );
  assert.equal(
    clientAddress(withHeaders({ 'x-vercel-forwarded-for': '203.0.113.8' })),
    '203.0.113.8',
  );
  assert.equal(
    clientAddress(withHeaders({ 'x-real-ip': '203.0.113.9' })),
    '203.0.113.9',
  );
});
void test('a forwarded chain resolves to the original caller, not an intermediate proxy', () => {
  assert.equal(
    clientAddress(
      withHeaders({
        'x-forwarded-for': '203.0.113.10, 70.41.3.18, 150.172.238.178',
      }),
    ),
    '203.0.113.10',
  );
  assert.equal(
    clientAddress(withHeaders({ 'x-forwarded-for': '  203.0.113.11  ' })),
    '203.0.113.11',
  );
});
void test('distinct callers never share a rate-limit key, and an absent address reports itself', () => {
  const first = clientAddress(
    withHeaders({ 'x-forwarded-for': '203.0.113.1' }),
  );
  const second = clientAddress(
    withHeaders({ 'x-forwarded-for': '203.0.113.2' }),
  );
  assert.notEqual(first, second);
  // Null is the signal for "no per-caller limit is possible", so the caller can
  // choose a coarse ceiling instead of silently sharing the per-caller one.
  assert.equal(clientAddress(withHeaders({})), null);
  assert.equal(clientAddress(withHeaders({ 'x-forwarded-for': '   ' })), null);
  assert.equal(clientAddress(withHeaders({ 'x-real-ip': '' })), null);
});
