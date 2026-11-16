import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AUTH_EXPIRED_EVENT, readToken, clearToken } from '@/lib/api';
import * as authService from '@/services/auth.service';
import { joinOnlineChannel, leaveOnlineChannel } from '@/lib/realtime/socketPusher';
import { pingPresence, PRESENCE_PING_INTERVAL_MS } from '@/services/presence.service';

const AuthContext = createContext(null);

/**
 * Who is signed in, and the only place that changes.
 *
 * `status` is three-valued on purpose. A boolean cannot tell "no session"
 * apart from "we have not checked yet", and a route guard reading that
 * boolean would bounce every returning user to the login screen for the one
 * render before their token was verified.
 */
export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (readToken() ? 'loading' : 'anonymous'));

  /**
   * A token in the browser is a claim, not proof — it may have been revoked
   * or expired since it was stored. Fetching the profile is what settles it.
   */
  useEffect(() => {
    if (!readToken()) return undefined;

    let cancelled = false;
    (async () => {
      const result = await authService.fetchProfile();
      if (cancelled) return;
      if (result.ok) {
        setUser(result.profile);
        setStatus('authenticated');
      } else {
        clearToken();
        setStatus('anonymous');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The API client raises this when the server refuses the session
   * mid-session. The token is already gone by the time it fires; this drops
   * the user object with it and sends them to the login screen without
   * reloading the app.
   */
  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      setStatus('anonymous');
      navigate('/login', { replace: true });
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [navigate]);

  // While signed in, this page holds the client's online channel; the CRM sees
  // them as online until the last tab closes or they sign out.
  const userId = user?.id ?? null;
  useEffect(() => {
    if (userId == null) return undefined;
    joinOnlineChannel(userId);

    // Background tabs are throttled to about one timer a minute, which is
    // why the backend allows a few minutes without a ping before offline.
    pingPresence();
    const timer = setInterval(pingPresence, PRESENCE_PING_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') pingPresence();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      leaveOnlineChannel();
    };
  }, [userId]);

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials);
    if (result.ok) {
      setUser(result.user);
      setStatus('authenticated');
    }
    return result;
  }, []);

  const loginWithGoogle = useCallback(async (payload) => {
    const result = await authService.loginWithGoogle(payload);
    if (result.ok) {
      setUser(result.user);
      setStatus('authenticated');
    }
    return result;
  }, []);

  const register = useCallback(async (payload) => {
    const result = await authService.register(payload);
    if (result.ok && result.token) {
      setUser(result.user);
      setStatus('authenticated');
    }
    return result;
  }, []);

  const logout = useCallback(async () => {
    // Cleared first so the interface cannot keep rendering account data while
    // the revoke request is still in flight.
    setUser(null);
    setStatus('anonymous');
    await authService.logout();
  }, []);

  const refreshUser = useCallback(async () => {
    const result = await authService.fetchProfile();
    if (result.ok) setUser(result.profile);
    return result;
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      login,
      loginWithGoogle,
      register,
      logout,
      refreshUser,
      setUser,
    }),
    [user, status, login, loginWithGoogle, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside an AuthProvider');
  return ctx;
};
