import React, { useState } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { getDeskRef, clearDeskRef } from '@/lib/deskRef';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

/**
 * Google sign-in, only rendered when a client id is configured.
 *
 * The previous app fell back to a hardcoded id checked into source. An empty
 * value here simply hides the button, so a misconfigured environment cannot
 * send people through someone else's Google project.
 */
const GoogleSignIn = ({ onSuccess }) => {
  const { t } = useTranslation();
  const { loginWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!CLIENT_ID) return null;

  const handleCredential = async (response) => {
    const credential = response?.credential;
    if (!credential) return;

    setBusy(true);
    try {
      const info = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${credential}`);
      if (!info.ok) throw new Error('tokeninfo');
      const userData = await info.json();
      const deskRef = getDeskRef();
      const payload = deskRef ? { ...userData, desk_ref: deskRef } : userData;

      const result = await loginWithGoogle(payload);
      if (!result.ok) {
        toast({ title: t('auth.signInFailed'), description: result.message, variant: 'destructive' });
        return;
      }
      clearDeskRef();
      onSuccess?.(result);
    } catch {
      toast({
        title: t('auth.signInFailed'),
        description: t('auth.googleFailed'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="space-y-3.5">
        <div className="relative flex items-center gap-3">
          <span className="flex-1 h-px bg-hairline" />
          <span className="text-[11px] uppercase tracking-wider text-content-faint">{t('auth.or')}</span>
          <span className="flex-1 h-px bg-hairline" />
        </div>

        <div className="relative flex justify-center min-h-[40px]">
          {busy && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface/80 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-content-faint" />
            </div>
          )}
          <GoogleLogin
            onSuccess={handleCredential}
            onError={() =>
              toast({
                title: t('auth.signInFailed'),
                description: t('auth.googleFailed'),
                variant: 'destructive',
              })
            }
            theme="filled_black"
            size="large"
            width="352"
            text="continue_with"
          />
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default GoogleSignIn;
