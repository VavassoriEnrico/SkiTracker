import { request } from './client';
import type { SkiInstructor, SkiInstructorUpdate } from '../types/skiInstructor';

export function getSkiInstructor() {
  return request<SkiInstructor>('/ski_instructor/me');
}

export function updateSkiInstructor(payload: SkiInstructorUpdate) {
  return request<SkiInstructor>('/ski_instructor/me', 'PATCH', payload);
}
