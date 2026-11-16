import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import AuthShell, { AuthField } from '@/components/auth/AuthShell';
import CodeInput from '@/components/auth/CodeInput';
import { useAuth } from '@/context/AuthContext';
import { verifyEmail, resendCode } from '@/services/auth.service';

/** How long before another code can be requested. */
const RESEND_SECONDS = 60;

/**
 * Confirms the address the account was opened with.
 *
 * The previous platform had this screen and it never called the endpoint —
 * it ran a timer and navigated on regardless, so an unverified account
 * carried on as though it had been verified.
 */
const VerifyEmail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshUser, user } = useAuth();

  const email = location.state?.email || user?.email || '';
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const submit = async (event) => {
    event.preventDefault();
    if (code.length < 6) {
      setError(t('auth.errors.codeRequired'));
      return;
    }

    setBusy(true);
    const result = await verifyEmail({ email, code });
    setBusy(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    // The account's verified flag has just changed server-side; re-reading it
    // keeps the guard from bouncing the user straight back here.
    await refreshUser();
    toast({ title: t('auth.verifiedTitle'), description: t('auth.verifiedDesc') });
    navigate('/onboarding', { replace: true });
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setCooldown(RESEND_SECONDS);
    const result = await resendCode({ email });
    toast(
      result.ok
        ? { title: t('auth.codeSentTitle'), description: t('auth.codeSentDesc', { email }) }
        : { title: t('auth.signInFailed'), description: result.message, variant: 'destructive' }
    );
  };

  return (
    <AuthShell title={t('auth.verifyTitle')} subtitle={t('auth.verifySubtitle', { email })}>
      <form onSubmit={submit} noValidate className="space-y-3.5">
        <AuthField id="verify-code" label={t('auth.code')} error={error}>
          <CodeInput
            id="verify-code"
            value={code}
            onChange={(next) => {
              setCode(next);
              setError(null);
            }}
            error={error}
          />
        </AuthField>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={busy}
          className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('auth.verify')}
        </motion.button>

        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0}
          className="w-full text-[12.5px] text-yellow-500 hover:text-yellow-400 disabled:text-content-faint transition-colors"
        >
          {cooldown > 0 ? t('auth.resendIn', { seconds: cooldown }) : t('auth.resendCode')}
        </button>
      </form>
    </AuthShell>
  );
};

export default VerifyEmail;
