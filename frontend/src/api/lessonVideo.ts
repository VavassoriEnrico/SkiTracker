import type { ImagePickerAsset } from 'expo-image-picker';
import { File } from 'expo-file-system';
import { request } from './client';
import type { LessonVideo } from '../types/lessonVideo';

export function getLessonVideos(lessonId: number) {
  return request<LessonVideo[]>(`/ski_videos?lesson_id=${lessonId}`);
}

export function uploadLessonVideo(lessonId: number, asset: ImagePickerAsset, customerId: string | null, comment: string) {
  const file = new File(asset.uri);
  if (!file.exists) throw new Error('This video is no longer available. Choose it again.');
  if (!file.size || file.size > 50 * 1024 * 1024) throw new Error('Choose a video smaller than 50 MB and not empty.');
  const form = new FormData();
  form.append('lesson_id', String(lessonId));
  if (customerId) form.append('customer_id', customerId);
  if (comment.trim()) form.append('comment', comment.trim());
  form.append('file', file);
  return request<LessonVideo>('/ski_videos/upload', 'POST', form, 180000);
}

export function updateLessonVideo(id: number, payload: Pick<LessonVideo, 'comment' | 'customer_id'>) {
  return request<LessonVideo>(`/ski_videos/${id}`, 'PATCH', payload);
}

export function deleteLessonVideo(id: number) {
  return request<void>(`/ski_videos/${id}`, 'DELETE');
}
