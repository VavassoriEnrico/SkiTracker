import type { PoseData, PoseFrame } from '../types/pose';

export const POINT_COLORS: string[] = [
  ...Array(11).fill('#FFFF00'), // Face: 0-10
  ...Array(2).fill('#0080FF'), // Shoulders: 11-12
  ...Array(10).fill('#00FF00'), // Arms and hands: 13-22
  ...Array(2).fill('#0080FF'), // Hips: 23-24
  ...Array(8).fill('#FF0000'), // Legs and feet: 25-32
];

export const POSE_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8], [9, 10],
  [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32],
];

export function getPoseFrame(data: PoseData, seconds: number) {
  if (!data.frames.length || !Number.isFinite(seconds)) return undefined;
  const timestamp = Math.round(seconds * 1000);
  let left = 0;
  let right = data.frames.length - 1;
  while (left < right) {
    const middle = Math.ceil((left + right) / 2);
    if (data.frames[middle].timestamp_ms <= timestamp) left = middle;
    else right = middle - 1;
  }
  return data.frames[left];
}

export function getVisiblePoints(frame?: PoseFrame) {
  return Object.values(frame?.points ?? {}).filter(point =>
    point.visibility >= 0.5 && point.presence >= 0.5 &&
    point.image.x >= 0 && point.image.x <= 1 && point.image.y >= 0 && point.image.y <= 1);
}
