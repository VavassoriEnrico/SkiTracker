import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// On a physical iPhone, localhost would point to the phone, not to the Mac.
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL || `http://${expoHost || '127.0.0.1'}:8001`
).replace(/\/$/, '');

export async function request<T>(path: string, method: 'GET' | 'PATCH' | 'POST' = 'GET', payload?: unknown): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Please sign in again.');

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    response = await fetch(`${apiUrl}${path}`, {
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
    const detail = body.detail;
    const message = Array.isArray(detail) ? detail.map(item => `${item.loc?.at(-1) || 'Field'}: ${item.msg}`).join('\n') : detail;
    throw new Error(typeof message === 'string' ? message : 'Unable to load or save data.');
  }
  return body;
}

