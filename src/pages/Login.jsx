import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import AuthShell, { AuthField, authInputClass } from '@/components/auth/AuthShell';
import GoogleSignIn from '@/components/auth/GoogleSignIn';
import { useAuth } from '@/context/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAuth();
  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  // Opened with a session already present — typically the CRM's "fast login"
  // link (/login?token=…), whose token was stored before render. Only then:
  // a sign-in from this form is routed by goAfterAuth instead.
  const [arrivedWithSession] = useState(() => status !== 'anonymous');
  if (arrivedWithSession && status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-dvh bg-surface">
        <Loader2 className="w-6 h-6 animate-spin text-content-faint" />
      </div>
    );
  }
  if (arrivedWithSession && status === 'authenticated') {
    return <Navigate to={location.state?.from || '/'} replace />;
  }

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!values.email.trim()) next.email = t('auth.errors.emailRequired');
    else if (!EMAIL_RE.test(values.email.trim())) next.email = t('auth.errors.emailInvalid');
    if (!values.password) next.password = t('auth.errors.passwordRequired');
    return next;
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    setBusy(true);
    const result = await login({
      email: values.email.trim(),
      password: values.password,
      remember,
    });
    setBusy(false);

    if (!result.ok) {
      toast({ title: t('auth.signInFailed'), description: result.message, variant: 'destructive' });
      return;
    }

    toast({ title: t('auth.welcomeBack'), description: t('auth.signedInAs', { email: values.email.trim() }) });
    goAfterAuth(result.user, values.email.trim());
  };

  const goAfterAuth = (user, email) => {
    /**
     * An account that has not confirmed its email, or has not been through
     * KYC, can hold a valid session and still not be finished signing up —
     * so the destination depends on the account, not just on the login
     * having succeeded. `from` is where the guard turned them away.
     */
    if (!user.verified) {
      navigate('/verify-email', { replace: true, state: { email } });
    } else if (!user.kycApproved) {
      navigate('/onboarding', { replace: true });
    } else {
      navigate(location.state?.from || '/', { replace: true });
    }
  };

  return (
    <AuthShell
      title={t('auth.logIn')}
      subtitle={t('auth.logInSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
            {t('auth.signUp')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-3.5">
        <AuthField id="login-email" label={t('auth.email')} error={errors.email}>
          <input
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={values.email}
            onChange={set('email')}
            className={authInputClass(errors.email)}
          />
        </AuthField>

        <AuthField id="login-password" label={t('auth.password')} error={errors.password}>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder={t('auth.passwordPlaceholder')}
              value={values.password}
              onChange={set('password')}
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

        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            onClick={() => setRemember((r) => !r)}
            className="flex items-center gap-2 text-[12.5px] text-content-muted hover:text-content transition-colors"
          >
            <span
              className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                remember ? 'bg-yellow-500 border-yellow-500' : 'border-hairline bg-surface'
              }`}
            >
              {remember && (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2 6.5L4.5 9L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            {t('auth.rememberMe')}
          </button>

          <Link
            to="/forgot-password"
            state={{ email: values.email.trim() }}
            className="text-[12.5px] text-yellow-500 hover:text-yellow-400 transition-colors"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={busy}
          className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('auth.logIn')}
        </motion.button>

        <GoogleSignIn
          onSuccess={(result) => {
            toast({ title: t('auth.welcomeBack'), description: t('auth.signedInAs', { email: result.user.email }) });
            goAfterAuth(result.user, result.user.email);
          }}
        />
      </form>
    </AuthShell>
  );
};

export default Login;
