import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import AuthShell, { AuthField, authInputClass } from '@/components/auth/AuthShell';
import CodeInput from '@/components/auth/CodeInput';
import { checkResetCode, changePasswordWithCode } from '@/services/auth.service';

/**
 * Code first, then the new password.
 *
 * Two steps on one screen rather than two routes, because the code is only
 * valid for a few minutes and a navigation in between is a chance to lose it.
 *
 * Checking the code is not a formality: that call is what returns the token
 * authorising the change. The previous platform skipped it — the verify
 * screen faked the check with a timer — so the change that followed had
 * nothing to authenticate with and the whole flow failed in production.
 */
const ResetPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email || '';
  const [step, setStep] = useState('code');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submitCode = async (event) => {
    event.preventDefault();
    if (code.length < 6) {
      setErrors({ code: t('auth.errors.codeRequired') });
      return;
    }

    setBusy(true);
    const result = await checkResetCode({ email, code });
    setBusy(false);

    if (!result.ok) {
      setErrors({ code: result.message });
      return;
    }
    setErrors({});
    setStep('password');
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    const found = {};
    if (password.length < 8) found.password = t('auth.errors.passwordShort');
    if (password !== confirm) found.confirm = t('auth.errors.passwordMismatch');
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    const result = await changePasswordWithCode({ password, confirmPassword: confirm });
    setBusy(false);

    if (!result.ok) {
      setErrors({ password: result.message });
      return;
    }

    toast({ title: t('auth.passwordChangedTitle'), description: t('auth.passwordChangedDesc') });
    navigate('/login', { replace: true });
  };

  return (
    <AuthShell
      title={t('auth.resetTitle')}
      subtitle={step === 'code' ? t('auth.resetCodeSubtitle', { email }) : t('auth.resetPasswordSubtitle')}
      footer={
        <Link to="/login" className="font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      {step === 'code' ? (
        <form onSubmit={submitCode} noValidate className="space-y-3.5">
          <AuthField id="reset-code" label={t('auth.code')} error={errors.code}>
            <CodeInput
              id="reset-code"
              value={code}
              onChange={(next) => {
                setCode(next);
                setErrors({});
              }}
              error={errors.code}
            />
          </AuthField>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            disabled={busy}
            className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('auth.continue')}
          </motion.button>
        </form>
      ) : (
        <form onSubmit={submitPassword} noValidate className="space-y-3.5">
          <AuthField id="reset-password" label={t('auth.newPassword')} error={errors.password}>
            <div className="relative">
              <input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${authInputClass(errors.password)} pr-10`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-content-faint hover:text-content-muted transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </AuthField>

          <AuthField id="reset-confirm" label={t('auth.confirmPassword')} error={errors.confirm}>
            <input
              id="reset-confirm"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={authInputClass(errors.confirm)}
            />
          </AuthField>

          <motion.button
            type="submit"
            whileTap={{ scale: 0.98 }}
            disabled={busy}
            className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('auth.changePassword')}
          </motion.button>
        </form>
      )}
    </AuthShell>
  );
};

export default ResetPassword;
