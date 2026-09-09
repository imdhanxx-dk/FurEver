import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { applyIntent, initialState } from '../lib/game/engine';
import { DEFAULT_CONFIG } from '../lib/game/catalog';
import type { GameResult, PlayerState } from '../lib/game/types';
const db = new PGlite();
let uid: string;
before(async () => {
  await db.exec(
    'create role anon; create role authenticated; create role service_role;',
  );
  for (const f of [
    '001_initial.sql',
    '002_integrations.sql',
    '003_notifications.sql',
    '20260909200208_furever_security_hardening.sql',
  ])
    await db.exec(
      await readFile(new URL(`../db/migrations/${f}`, import.meta.url), 'utf8'),
    );
  const r = await db.query<{ id: string }>(
    'select public.upsert_identity($1,$2,$3,$4,$5::jsonb) as id',
    [
      '123456789012345678',
      'tester',
      'Test Friend',
      null,
      JSON.stringify(initialState(Date.now())),
    ],
  );
  uid = r.rows[0].id;
});
after(() => db.close());
test('Mora requests and support notifications are queued exactly once per request', async () => {
  const params = [
    uid,
    7,
    70,
    'club transfer',
    'mora-atomic',
    '123456789012345678',
    'tester',
  ];
  const results = await Promise.all([
    db.query<{ id: string }>(
      'select public.submit_mora($1,$2,$3,$4,$5,$6,$7) as id',
      params,
    ),
    db.query<{ id: string }>(
      'select public.submit_mora($1,$2,$3,$4,$5,$6,$7) as id',
      params,
    ),
  ]);
  assert.equal(results[0].rows[0].id, results[1].rows[0].id);
  assert.equal(
    (
      await db.query('select * from public.outbox where request_key=$1', [
        'mora:mora-atomic',
      ])
    ).rows.length,
    1,
  );
  const payload = JSON.stringify({ message: 'Please help with my companion.' });
  await Promise.all([
    db.query('select public.submit_support($1,$2,$3::jsonb)', [
      uid,
      'support-once',
      payload,
    ]),
    db.query('select public.submit_support($1,$2,$3::jsonb)', [
      uid,
      'support-once',
      payload,
    ]),
  ]);
  assert.equal(
    (
      await db.query('select * from public.outbox where request_key=$1', [
        'support:support-once',
      ])
    ).rows.length,
    1,
  );
});
const player = async () => {
  const r = await db.query<{ state: PlayerState; revision: number }>(
    'select state,revision from public.players where user_id=$1',
    [uid],
  );
  return r.rows[0];
};
const commit = (
  revision: number,
  key: string,
  result: GameResult,
  fingerprint = key,
) =>
  db.query<{ result: GameResult }>(
    'select public.commit_game($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,null,null) as result',
    [
      uid,
      revision,
      key,
      fingerprint,
      JSON.stringify(result.state),
      JSON.stringify(result.ledger),
      JSON.stringify(result),
    ],
  );
test('PostgreSQL migrations and immutable Discord identity upsert', async () => {
  const r = await db.query<{ id: string }>(
    'select public.upsert_identity($1,$2,$3,$4,$5::jsonb) as id',
    [
      '123456789012345678',
      'new_username',
      'New Display',
      null,
      JSON.stringify(initialState(Date.now())),
    ],
  );
  assert.equal(r.rows[0].id, uid);
  assert.equal((await db.query('select * from public.users')).rows.length, 1);
});
test('concurrent retries commit one reward and one ledger entry', async () => {
  const row = await player();
  const result = applyIntent(
    row.state,
    { action: 'buy', itemId: 'food', quantity: 1 },
    {
      now: Date.now(),
      random: () => 0.5,
      id: () => crypto.randomUUID(),
      admin: false,
      config: DEFAULT_CONFIG,
    },
  );
  const results = await Promise.all([
    commit(row.revision, 'purchase-once', result),
    commit(row.revision, 'purchase-once', result),
    commit(row.revision, 'purchase-once', result),
  ]);
  assert.equal(results.length, 3);
  const after = await player();
  assert.equal(after.state.coins, row.state.coins - 25);
  assert.equal(Number(after.revision), Number(row.revision) + 1);
  assert.equal(
    (
      await db.query(
        'select * from public.economy_ledger where operation_key=$1',
        ['purchase-once'],
      )
    ).rows.length,
    1,
  );
  await assert.rejects(
    () => commit(row.revision, 'purchase-once', result, 'tampered'),
    /IDEMPOTENCY_MISMATCH/,
  );
});
test('different concurrent operations cannot overwrite newer state', async () => {
  const row = await player();
  const result = applyIntent(
    row.state,
    { action: 'buy', itemId: 'food', quantity: 1 },
    {
      now: Date.now(),
      random: () => 0.5,
      id: () => crypto.randomUUID(),
      admin: false,
      config: DEFAULT_CONFIG,
    },
  );
  await commit(row.revision, 'cas-first', result);
  await assert.rejects(
    () => commit(row.revision, 'cas-stale', result),
    /VERSION_CONFLICT/,
  );
  assert.equal(
    (
      await db.query('select * from public.operations where key=$1', [
        'cas-stale',
      ])
    ).rows.length,
    0,
  );
});
test('ledger constraint failures roll back item and balance changes', async () => {
  const row = await player();
  const result = applyIntent(
    row.state,
    { action: 'buy', itemId: 'food', quantity: 1 },
    {
      now: Date.now(),
      random: () => 0.5,
      id: () => crypto.randomUUID(),
      admin: false,
      config: DEFAULT_CONFIG,
    },
  );
  result.ledger[0].after = 999;
  await assert.rejects(() => commit(row.revision, 'rollback', result));
  assert.deepEqual(await player(), row);
  assert.equal(
    (
      await db.query('select * from public.operations where key=$1', [
        'rollback',
      ])
    ).rows.length,
    0,
  );
});
test('append-only ledger rejects modification and deletion', async () => {
  await assert.rejects(
    () => db.query('update public.economy_ledger set amount=999'),
    /Append-only/,
  );
  await assert.rejects(
    () => db.query('delete from public.economy_ledger'),
    /Append-only/,
  );
});
test('five payment webhooks credit one stored package, mismatches fail closed', async () => {
  const id = crypto.randomUUID();
  await db.query(
    'insert into public.payments(id,user_id,package_id,coins,amount,currency,request_key) values($1,$2,$3,500,299,$4,$5)',
    [id, uid, 'starter', 'usd', 'checkout-test'],
  );
  const before = (await player()).state.coins;
  await assert.rejects(
    () =>
      db.query('select public.settle_credit($1,$2,$3,$4,$5,$6,null)', [
        'PAYMENT',
        id,
        'evt_mismatch',
        'cs_test',
        1,
        'usd',
      ]),
    /PAYMENT_MISMATCH/,
  );
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      db.query<{ credited: boolean }>(
        'select public.settle_credit($1,$2,$3,$4,$5,$6,null) as credited',
        ['PAYMENT', id, `evt_test_${i}`, 'cs_test', 299, 'usd'],
      ),
    ),
  );
  assert.equal(results.filter((r) => r.rows[0].credited).length, 1);
  assert.equal((await player()).state.coins, before + 500);
  assert.equal(
    (await db.query('select * from public.payment_events')).rows.length,
    1,
  );
});
test('duplicate Mora approval credits once and records the admin', async () => {
  const r = await db.query<{ id: string }>(
    'insert into public.mora_requests(user_id,mora,coins,request_key) values($1,5,50,$2) returning id',
    [uid, 'mora-test'],
  );
  const id = r.rows[0].id,
    before = (await player()).state.coins;
  await Promise.all(
    Array.from({ length: 4 }, () =>
      db.query('select public.settle_credit($1,$2,null,null,null,null,$3)', [
        'MORA',
        id,
        uid,
      ]),
    ),
  );
  assert.equal((await player()).state.coins, before + 50);
  assert.equal(
    (
      await db.query(
        "select * from public.audit_logs where action->>'action'='mora_approve'",
      )
    ).rows.length,
    1,
  );
});
test('distributed rate limiting counts requests atomically', async () => {
  const r = await Promise.all(
    Array.from({ length: 8 }, () =>
      db.query<{ ok: boolean }>(
        'select public.take_rate_limit($1,3,60) as ok',
        ['same-user'],
      ),
    ),
  );
  assert.equal(r.filter((x) => x.rows[0].ok).length, 3);
});
test('OAuth state is short-lived and one-time', async () => {
  await db.query(
    "insert into public.oauth_states(state_hash,expires_at) values($1,now()+interval '10 minutes')",
    ['oauth-test'],
  );
  assert.equal(
    (
      await db.query<{ valid: boolean }>(
        'select public.consume_oauth_state($1) as valid',
        ['oauth-test'],
      )
    ).rows[0].valid,
    true,
  );
  assert.equal(
    (
      await db.query<{ valid: boolean }>(
        'select public.consume_oauth_state($1) as valid',
        ['oauth-test'],
      )
    ).rows[0].valid,
    false,
  );
  await db.query(
    "insert into public.oauth_states(state_hash,expires_at) values($1,now()-interval '10 minutes')",
    ['expired'],
  );
  assert.equal(
    (
      await db.query<{ valid: boolean }>(
        'select public.consume_oauth_state($1) as valid',
        ['expired'],
      )
    ).rows[0].valid,
    false,
  );
});
test('anonymous clients cannot read players or execute game mutations', async () => {
  await db.exec('set role anon;');
  try {
    await assert.rejects(
      () => db.query('select * from public.players'),
      /permission denied/,
    );
    await assert.rejects(
      () => db.query('select public.take_rate_limit($1,3,60)', ['forged']),
      /permission denied/,
    );
    await assert.rejects(
      () =>
        db.query('select public.settle_credit($1,$2,null,null,null,null,$3)', [
          'MORA',
          crypto.randomUUID(),
          uid,
        ]),
      /permission denied/,
    );
  } finally {
    await db.exec('reset role;');
  }
});
