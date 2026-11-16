import axios from 'axios';
import Cookies from 'js-cookie';

/**
 * The single HTTP client. Every request to the platform API goes through it.
 *
 * Carried over from the previous frontend, which had two axios instances with
 * different interceptors — one of them shipping placeholder RapidAPI headers
 * on card deposits. There is one here, and there is no reason to add another:
 * anything that needs different behaviour needs a different config object,
 * not a different client.
 */

export const TOKEN_KEY = 'token';

/**
 * In development this is '/api' and Vite proxies it, so the browser makes a
 * same-origin request and CORS never applies. In production it is the real
 * origin from the environment.
 */
export const API_BASE_URL = import.meta.env.DEV
  ? '/api'
  : import.meta.env.VITE_API_BASE_URL || 'https://backend.hitomorrow.app/api';

/** Routes that render without a session. A 401 here is expected, not a signal. */
const PUBLIC_ROUTES = ['/login', '/register', '/onboarding', '/verify-email', '/forgot-password', '/reset-password'];

/**
 * Raised when the server rejects the session. AuthContext listens for it and
 * navigates.
 *
 * The previous app assigned to window.location here, which threw away the
 * React tree and reloaded the whole bundle just to show the login form — and
 * did it from inside an interceptor, so any component waiting on that request
 * was left suspended mid-update.
 */
export const AUTH_EXPIRED_EVENT = 'auth:expired';

export const readToken = () => Cookies.get(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;

export const writeToken = (token, { remember = false } = {}) => {
  Cookies.set(TOKEN_KEY, token, {
    path: '/',
    secure: window.location.protocol === 'https:',
    sameSite: 'Lax',
    ...(remember ? { expires: 30 } : {}),
  });
  // Mirrored so a token arriving in the URL survives before cookies settle.
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearToken = () => {
  Cookies.remove(TOKEN_KEY, { path: '/' });
  localStorage.removeItem(TOKEN_KEY);
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 25000,
  maxRedirects: 3,
});

api.interceptors.request.use((config) => {
  const token = readToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.metadata = { startTime: Date.now() };
  config.__retryCount = config.__retryCount || 0;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    /**
     * Retry transport failures only — never a response the server actually
     * sent. A 500 is the server's answer; repeating the request will not
     * change it, and on a non-idempotent call like trade/create it could
     * open the position twice.
     */
    const isTransportFailure =
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error';

    if (isTransportFailure && config && config.__retryCount < 2 && !config.__noRetry) {
      config.__retryCount += 1;
      const delay = Math.min(1000 * 2 ** (config.__retryCount - 1), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return api(config);
    }

    if (error.response?.status === 401) {
      clearToken();
      const path = window.location.pathname || '';
      if (!PUBLIC_ROUTES.some((route) => path.startsWith(route))) {
        window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
      }
    }

    return Promise.reject(error);
  }
);

/**
 * The message a Laravel error carries, in the order the backend uses it:
 * a 422 puts the useful text under `errors`, everything else under `message`.
 * Falls back to a generic string rather than surfacing "Request failed with
 * status code 500" to a client.
 */
export const apiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  const data = error?.response?.data;
  if (!data) return error?.message === 'Network Error' ? 'No connection to the server.' : fallback;
  if (data.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat()[0];
    if (first) return String(first);
  }
  return data.message || data.error || fallback;
};

export default api;
