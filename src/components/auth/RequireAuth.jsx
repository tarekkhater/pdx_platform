import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Gate on every screen that shows account data.
 *
 * Until this existed, /wallets, /profile and /transactions rendered for
 * anyone who typed the URL — the app had no session to check, so it checked
 * nothing.
 *
 * Where the user was headed is kept in location state so signing in returns
 * them there instead of dropping everyone on the trade station.
 */
const RequireAuth = ({ children }) => {
  const { status } = useAuth();
  const location = useLocation();

  // A stored token has not been verified yet. Redirecting here would sign out
  // every returning visitor on load.
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-surface">
        <Loader2 className="w-6 h-6 animate-spin text-content-faint" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return children;
};

export default RequireAuth;
