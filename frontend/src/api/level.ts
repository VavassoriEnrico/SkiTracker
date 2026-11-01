import { request } from './client';
import type { SkiLevel } from '../types/level';

export function getLevel(levelNumber: number) {
  return request<SkiLevel>(`/level?level_number=${levelNumber}`);
}
