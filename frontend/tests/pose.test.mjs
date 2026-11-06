import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getPoseFrame, getVisiblePoints, POSE_CONNECTIONS } from '../src/utils/pose.ts';

test('overlay follows timestamps during playback, seeking and backward scrubbing', () => {
  const data = { frames: [0, 33, 67, 100].map((timestamp_ms, frame) => ({ frame, timestamp_ms, points: {} })) };
  for (const [seconds, expected] of [[0, 0], [0.033, 1], [0.066, 1], [0.067, 2], [0.1, 3], [1, 3], [0.033, 1]]) {
    assert.equal(getPoseFrame(data, seconds).frame, expected);
  }
  assert.equal(getPoseFrame({ frames: [] }, 0), undefined);
});

test('overlay hides missing, occluded and out-of-image points', () => {
  const point = { id: 25, image: { x: 0.5, y: 0.6, z: 0 }, visibility: 0.99, presence: 0.99 };
  assert.deepEqual(getVisiblePoints(), []);
  assert.deepEqual(getVisiblePoints({ points: {} }), []);
  assert.equal(getVisiblePoints({ points: {
    visible: point,
    occluded: { ...point, visibility: 0.1 },
    absent: { ...point, presence: 0.1 },
    outside: { ...point, image: { ...point.image, x: 1.1 } },
  } }).length, 1);
  assert.ok(POSE_CONNECTIONS.some(([a, b]) => a === 25 && b === 27));
});
