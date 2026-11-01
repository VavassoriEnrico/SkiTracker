import { request } from './client';
import type { SkiAbility } from '../types/ability';

export function getAbility(levelId: number, abilityNumber: number) {
  return request<SkiAbility>(`/level_ability?level_id=${levelId}&ability_number=${abilityNumber}`);
}
