export const LEVEL_COUNT = 7;
export const LEVEL_STEP = 360 / LEVEL_COUNT;

export function angleDelta(current: number, previous: number) {
  return ((current - previous + 540) % 360) - 180;
}

export function levelAtRotation(rotation: number) {
  const step = Math.round(rotation / LEVEL_STEP);
  return ((step % LEVEL_COUNT) + LEVEL_COUNT) % LEVEL_COUNT + 1;
}
