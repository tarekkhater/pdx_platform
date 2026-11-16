import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import AuthShell, { AuthField, authInputClass } from '@/components/auth/AuthShell';
import { requestPasswordReset } from '@/services/auth.service';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      setError(t('auth.errors.emailInvalid'));
      return;
    }

    setBusy(true);
    const result = await requestPasswordReset({ email: trimmed });
    setBusy(false);

    /**
     * The next screen opens whether or not the address is registered.
     *
     * Reporting "no such account" here would turn this form into a way to
     * find out which addresses hold accounts with the broker.
     */
    if (!result.ok && result.message?.toLowerCase().includes('network')) {
      setError(result.message);
      return;
    }

    navigate('/reset-password', { state: { email: trimmed } });
  };

  return (
    <AuthShell
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
      footer={
        <Link to="/login" className="font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-3.5">
        <AuthField id="forgot-email" label={t('auth.email')} error={error}>
          <input
            id="forgot-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className={authInputClass(error)}
          />
        </AuthField>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={busy}
          className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('auth.sendCode')}
        </motion.button>
      </form>
    </AuthShell>
  );
};

export default ForgotPassword;
