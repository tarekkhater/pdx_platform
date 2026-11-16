/**
 * A JWT arriving on the URL is how the CRM hands a client to this app.
 *
 * Captured before React mounts so the first request already carries it.
 * Stripped from the address bar immediately afterwards so a shared screenshot
 * of the trade station does not leak the session.
 */

import { writeToken } from '@/lib/api';

const TOKEN_QUERY_KEYS = ['token', 'access_token', 'jwt'];

const readTokenFromSearch = (search) => {
  if (search == null || typeof search !== 'string') return null;
  const normalized = search.startsWith('?') ? search : `?${search}`;
  try {
    const params = new URLSearchParams(normalized);
    for (const key of TOKEN_QUERY_KEYS) {
      const value = params.get(key);
      if (value?.trim()) return value.trim();
    }
  } catch {
    return null;
  }
  return null;
};

const readTokenFromHash = (hash) => {
  if (!hash || typeof hash !== 'string') return null;
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const qIndex = raw.indexOf('?');
  return readTokenFromSearch(qIndex === -1 ? raw : raw.slice(qIndex));
};

const stripTokenFromUrl = () => {
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of TOKEN_QUERY_KEYS) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState({}, '', url.pathname + (url.search || '') + (url.hash || ''));
    }
  } catch {
    /* ignore */
  }
};

/** Save a JWT from ?token= before anything renders. */
export const captureAuthToken = () => {
  const token =
    readTokenFromSearch(window.location.search) || readTokenFromHash(window.location.hash);
  if (!token) return null;
  writeToken(token, { remember: true });
  stripTokenFromUrl();
  return token;
};
