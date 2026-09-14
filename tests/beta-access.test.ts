import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  betaApproved,
  hasBetaAccess,
  publicConfig,
} from '../lib/server/beta-access';
import { DEFAULT_CONFIG } from '../lib/game/catalog';
import { Database } from '../lib/server/database';
import type { Session } from '../lib/server/security';
const owner = '987654321987654321',
  guest = '123456789123456789';
test('beta defaults to owner-only; usernames, malformed IDs, and numeric lookalikes cannot authorize', () => {
  assert.equal(betaApproved(owner, owner, undefined), true);
  for (const list of [undefined, null, [], [Number(guest)], { [guest]: true }])
    assert.equal(betaApproved(guest, owner, list), false);
  assert.equal(betaApproved('tester', owner, ['tester']), false);
  assert.equal(betaApproved(guest, owner, [guest]), true);
  assert.equal(betaApproved(guest, undefined, []), false);
});
test('revocation is checked afresh for an existing session and the list is not public', async () => {
  let ids = [guest];
  const db = new Database({ ADMIN_DISCORD_ID: owner });
  db.request = async <T>() =>
    [{ value: { ...DEFAULT_CONFIG, betaDiscordIds: ids } }] as T;
  const s = { users: { discord_id: guest } } as Session;
  assert.equal(await hasBetaAccess(db, s), true);
  ids = [];
  assert.equal(await hasBetaAccess(db, s), false);
  assert.equal(
    'betaDiscordIds' in
      publicConfig({ ...DEFAULT_CONFIG, betaDiscordIds: [guest] }),
    false,
  );
});
