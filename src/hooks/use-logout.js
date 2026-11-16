import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * Signs the user out and returns them to the login screen.
 *
 * Every Log Out button in the app goes through this hook, which is why the
 * session teardown belongs here and not in the sheets that call it.
 *
 * `replace` is deliberate: after logging out, Back should not walk the user
 * straight into the account they just left.
 */
export const useLogout = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return useCallback(
    async (closeSheets) => {
      if (typeof closeSheets === 'function') closeSheets();
      // Navigates regardless of how the revoke request goes — a server that
      // is down must not leave the user staring at their own account.
      await logout();
      navigate('/login', { replace: true });
    },
    [logout, navigate]
  );
};

export default useLogout;
