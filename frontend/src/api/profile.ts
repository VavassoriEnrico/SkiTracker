import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';
import type { Profile, ProfileUpdate } from '../types/profile';

// On a physical iPhone, localhost would point to the phone, not to the Mac.
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL || `http://${expoHost || '127.0.0.1'}:8001`
).replace(/\/$/, '');

async function request(method: 'GET' | 'PATCH', payload?: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Please sign in again.');

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    response = await fetch(`${apiUrl}/profile/me`, {
      method,
      headers: {
        Authorization: `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: controller.signal,
    });
  } catch {
    throw new Error('Cannot reach SkiTracker. Check your Wi-Fi and try again.');
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json();
  if (!response.ok) {
    throw new Error(typeof body.detail === 'string' ? body.detail : 'Unable to save or load your profile.');
  }
  return body;
}

export function getProfile() {
  return request('GET');
}

export function updateProfile(payload: ProfileUpdate) {
  return request('PATCH', payload);
}
