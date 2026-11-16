import api, { writeToken, clearToken, apiErrorMessage } from '@/lib/api';
import { toUser, toProfile } from '@/adapters/profile';

/**
 * Every call the sign-in flow makes. Each one returns either
 * `{ ok: true, ... }` or `{ ok: false, message }` — no throwing, because the
 * callers are form submit handlers and a rejected promise in one of those is
 * an unhandled rejection waiting to happen.
 */

/**
 * The login response puts the user's fields and the token side by side at the
 * top level of `data`, rather than nesting the user under its own key.
 */
const unwrap = (response) => response?.data?.data ?? response?.data ?? {};

export const login = async ({ email, password, remember = false }) => {
  try {
    const data = unwrap(await api.post('/users/Auth/login', { email, password }));
    const user = toUser(data);

    if (!data.token) return { ok: false, message: 'The server did not return a session.' };

    /**
     * A blocked account gets no token stored. The previous app wrote the
     * token first and checked afterwards, which left a usable session in the
     * browser for an account that had just been refused.
     */
    if (user.blocked) return { ok: false, reason: 'blocked', message: 'This account has been suspended.' };

    writeToken(data.token, { remember });
    return { ok: true, user, token: data.token };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'Incorrect email or password.') };
  }
};

export const loginWithGoogle = async (payload) => {
  try {
    const data = unwrap(await api.post('/users/Auth/register/google', payload));
    if (!data.token) return { ok: false, message: 'The server did not return a session.' };
    const user = toUser(data);
    if (user.blocked) return { ok: false, reason: 'blocked', message: 'This account has been suspended.' };
    writeToken(data.token, { remember: true });
    return { ok: true, user, token: data.token };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'Google sign-in failed.') };
  }
};

export const register = async (payload) => {
  try {
    const data = unwrap(await api.post('/users/Auth/register', payload));
    // Registration may or may not sign the user straight in, depending on
    // whether the backend requires email verification first.
    if (data.token) writeToken(data.token, { remember: true });
    return { ok: true, user: toUser(data), token: data.token ?? null };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'Could not create the account.') };
  }
};

export const verifyEmail = async ({ email, code }) => {
  try {
    const data = unwrap(await api.post('/users/Auth/verification', { email, code }));
    if (data.token) writeToken(data.token, { remember: true });
    return { ok: true, user: toUser(data), token: data.token ?? null };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'That code is not valid.') };
  }
};

export const resendCode = async ({ email }) => {
  try {
    await api.post('/users/Auth/resend', { email });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'Could not send a new code.') };
  }
};

export const requestPasswordReset = async ({ email }) => {
  try {
    await api.post('/users/Auth/forget/password', { email });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'Could not start a password reset.') };
  }
};

export const checkResetCode = async ({ email, code }) => {
  try {
    const data = unwrap(await api.post('/users/Auth/forget/password/check/code', { email, code }));
    /**
     * This step returns the token that authorises the change that follows.
     * In the previous app this call was never made — the verify screen faked
     * it with a timer — so the reset that came after it had nothing to
     * authenticate with and the whole flow was broken in production.
     */
    if (data.token) writeToken(data.token);
    return { ok: true, token: data.token ?? null };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'That code is not valid.') };
  }
};

export const changePasswordWithCode = async ({ password, confirmPassword }) => {
  try {
    await api.post('/users/Auth/forget/password/change', {
      password,
      confirm_password: confirmPassword,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'Could not change the password.') };
  }
};

export const fetchProfile = async () => {
  try {
    const data = unwrap(await api.get('/users/profile/index'));
    return { ok: true, profile: toProfile(data) };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error) };
  }
};

/**
 * Tells the server to revoke the token before dropping it locally.
 *
 * The previous app skipped this call entirely and only cleared the cookie,
 * which left every issued token valid server-side until it expired on its
 * own. The local clear happens either way — a failed logout request must not
 * leave the user still signed in.
 */
export const logout = async () => {
  try {
    await api.post('/users/Auth/logout', {}, { __noRetry: true });
  } catch {
    // Already invalid, or unreachable. Nothing useful to do.
  } finally {
    clearToken();
  }
  return { ok: true };
};
