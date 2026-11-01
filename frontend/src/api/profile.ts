import { request } from './client';
import type { Profile, ProfileUpdate } from '../types/profile';

export function getProfile() {
  return request<Profile>('/profile/me');
}

export function updateProfile(payload: ProfileUpdate) {
  return request<Profile>('/profile/me', 'PATCH', payload);
}
