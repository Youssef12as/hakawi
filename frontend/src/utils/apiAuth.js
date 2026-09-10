import { supabase } from './supabaseClient';

/**
 * Build request headers including the current Supabase access token.
 * supabase-js auto-refreshes the token, so calling getSession() at request
 * time always returns a fresh token.
 */
export async function getAuthHeaders(extra = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { ...extra };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }
  return headers;
}

/**
 * Handle a 401 from the backend: the session is gone/expired.
 * Sign out locally and bounce to the login page.
 */
export async function handleUnauthorized() {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('signOut failed:', e);
  }
  window.location.href = '/login';
}
