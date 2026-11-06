import { request } from './client';
import type { SkiLesson, LessonDraft } from '../types/lesson';

export function getInstructorLessons() {
  return request<SkiLesson[]>('/ski_lesson/instructor/me');
}

export function getLesson(id: number) {
  return request<SkiLesson>(`/ski_lesson/${id}`);
}

export function createLesson(payload: LessonDraft) {
  return request<SkiLesson>('/ski_lesson', 'POST', payload);
}

export function deleteLesson(id: number) {
  return request<void>(`/ski_lesson/${id}`, 'DELETE');
}
