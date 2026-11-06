import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// On a physical iPhone, localhost would point to the phone, not to the Mac.
const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
const apiUrl = (
  process.env.EXPO_PUBLIC_API_URL || `http://${expoHost || '127.0.0.1'}:8001`
).replace(/\/$/, '');

export async function request<T>(path: string, method: 'GET' | 'PATCH' | 'POST' | 'DELETE' = 'GET', payload?: unknown, timeoutMs = 15000): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error('Please sign in again.');

  let response: Response;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const isForm = payload instanceof FormData;
  try {
    try {
      response = await fetch(`${apiUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
          ...(!isForm && { 'Content-Type': 'application/json' }),
        },
        body: isForm ? payload : payload ? JSON.stringify(payload) : undefined,
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error(isForm ? 'Video upload timed out. Try again with a shorter video.' : 'The request timed out. Please try again.');
      }
      if (isForm) {
        console.warn('Video upload failed:', error instanceof Error ? error.message : String(error));
        throw new Error('Unable to send this video. Choose it again and retry.');
      }
      throw new Error('Cannot reach SkiTracker. Check your Wi-Fi and try again.');
    }

    if (response.status === 204) return undefined as T;

    const body = await response.json().catch(() => {
      throw new Error(controller.signal.aborted
        ? 'The request timed out. Please try again.'
        : 'Unable to read the server response. Please try again.');
    });
    if (!response.ok) {
      const detail = body.detail;
      const message = Array.isArray(detail) ? detail.map(item => `${item.loc?.at(-1) || 'Field'}: ${item.msg}`).join('\n') : detail;
      throw new Error(typeof message === 'string' ? message : 'Unable to load or save data.');
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}

