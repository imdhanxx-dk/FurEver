import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  companionHit,
  REACTION_LENGTH,
  sampleCompanionPose,
  type PetReaction,
} from '../lib/client/companion-motion';
const look = { x: 0, y: 0 };

test('idle stays grounded while individual joints move', () => {
  const first = sampleCompanionPose('idle', 0, 0, look);
  const later = sampleCompanionPose('idle', 0, 1500, look);
  assert.equal(first.y, 0);
  assert.equal(later.y, 0);
  assert.notEqual(first.tail, later.tail);
  assert.notEqual(first.breath, later.breath);
});

test('reactions are time based and return to idle after tab suspension', () => {
  for (const kind of Object.keys(REACTION_LENGTH) as PetReaction[]) {
    const length = REACTION_LENGTH[kind];
    const pose = sampleCompanionPose(kind, 600, 900, look);
    for (let frame = 0; frame < 60; frame++)
      sampleCompanionPose(kind, frame * 16, frame * 16, look);
    assert.deepEqual(sampleCompanionPose(kind, 600, 900, look), pose);
    assert.deepEqual(
      sampleCompanionPose(kind, length + 10000, 16000, look),
      sampleCompanionPose('idle', 0, 16000, look),
    );
  }
});

test('high five lifts the paw outward and distinct care has distinct poses', () => {
  assert.ok(sampleCompanionPose('paw', 800, 1000, look).rightArm < -120);
  assert.equal(sampleCompanionPose('rest', 800, 1000, look).face, 8);
  assert.ok(sampleCompanionPose('train', 800, 1000, look).y < 0);
  assert.notEqual(
    sampleCompanionPose('feed', 800, 1000, look).leftArm,
    sampleCompanionPose('idle', 0, 1000, look).leftArm,
  );
});

test('reduced motion keeps expressions but removes looping and travel', () => {
  for (const kind of Object.keys(REACTION_LENGTH) as PetReaction[]) {
    const pose = sampleCompanionPose(kind, 800, 1000, { x: 5, y: -5 }, true);
    for (const joint of [
      'x',
      'y',
      'body',
      'head',
      'headY',
      'breath',
      'tail',
      'eyeX',
      'eyeY',
    ] as const)
      assert.equal(pose[joint], 0);
  }
  assert.equal(sampleCompanionPose('rest', 800, 1000, look, true).face, 8);
});

test('body hit zones reject the room and distinguish gentle and boundary touches', () => {
  assert.equal(companionHit(0.05, 0.5), null);
  assert.equal(companionHit(0.5, 0.98), null);
  assert.equal(companionHit(0.5, 0.4), 'head');
  assert.equal(companionHit(0.4, 0.2), 'ear');
  assert.equal(companionHit(0.5, 0.57), 'chin');
  assert.equal(companionHit(0.5, 0.66), 'belly');
  assert.equal(companionHit(0.34, 0.7), 'paw');
  assert.equal(companionHit(0.8, 0.6), 'tail');
  assert.equal(companionHit(0.5, 0.77), 'private');
});
