import assert from 'node:assert/strict';
import { test } from 'node:test';
import { angleDelta, LEVEL_STEP, levelAtRotation } from '../src/utils/levelDial.ts';

test('selects all seven levels and wraps in either direction', () => {
  for (let step = 0; step < 7; step++) {
    assert.equal(levelAtRotation(step * LEVEL_STEP), step + 1);
  }
  assert.equal(levelAtRotation(7 * LEVEL_STEP), 1);
  assert.equal(levelAtRotation(-LEVEL_STEP), 7);
  assert.equal(levelAtRotation(-7 * LEVEL_STEP), 1);
  assert.equal(levelAtRotation(14 * LEVEL_STEP), 1);
});

test('crossing the angular seam preserves gesture direction', () => {
  assert.equal(angleDelta(-179, 179), 2);
  assert.equal(angleDelta(179, -179), -2);
  assert.equal(angleDelta(75, 30), 45);
  assert.equal(angleDelta(30, 75), -45);
});

test('snaps to the nearest level around a step boundary', () => {
  assert.equal(levelAtRotation(LEVEL_STEP * 0.49), 1);
  assert.equal(levelAtRotation(LEVEL_STEP * 0.51), 2);
  assert.equal(levelAtRotation(-LEVEL_STEP * 0.51), 7);
});
