import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import AuthShell, { AuthField, authInputClass } from '@/components/auth/AuthShell';
import GoogleSignIn from '@/components/auth/GoogleSignIn';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_LENGTH = 8;

// Length, mixed case, a digit, a symbol. Deliberately advisory: it colours the
// meter, and only the minimum length is actually enforced.
const scorePassword = (pw) => {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= MIN_LENGTH) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 4);
};

const STRENGTH = [
  { key: 'weak', bars: 1, bar: 'bg-loss', text: 'text-loss' },
  { key: 'fair', bars: 2, bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
  { key: 'good', bars: 3, bar: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
  { key: 'strong', bars: 4, bar: 'bg-gain', text: 'text-gain' },
];

const Register = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [values, setValues] = useState({ email: '', password: '', referral: '' });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  const score = scorePassword(values.password);
  const strength = score > 0 ? STRENGTH[score - 1] : null;

  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!values.email.trim()) next.email = t('auth.errors.emailRequired');
    else if (!EMAIL_RE.test(values.email.trim())) next.email = t('auth.errors.emailInvalid');
    if (!values.password) next.password = t('auth.errors.passwordRequired');
    else if (values.password.length < MIN_LENGTH) next.password = t('auth.errors.passwordShort', { count: MIN_LENGTH });
    if (!agreed) next.terms = t('auth.errors.termsRequired');
    return next;
  };

  const submit = (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    /**
     * No request yet. The registration endpoint needs a name, phone and
     * address that this form does not ask for — the questionnaire that
     * follows collects them, and it submits the account in one call at the
     * end.
     *
     * Creating the account here and completing it afterwards would leave a
     * half-filled account behind every prospect who closed the tab on the
     * second screen.
     */
    navigate('/onboarding', {
      state: { credentials: { email: values.email.trim(), password: values.password }, referral: values.referral.trim() },
    });
  };

  return (
    <AuthShell
      title={t('auth.createAccount')}
      subtitle={t('auth.createAccountSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/login" className="font-semibold text-yellow-500 hover:text-yellow-400 transition-colors">
            {t('auth.logIn')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-3.5">
        <AuthField id="register-email" label={t('auth.email')} error={errors.email}>
          <input
            id="register-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={values.email}
            onChange={set('email')}
            className={authInputClass(errors.email)}
          />
        </AuthField>

        <AuthField id="register-password" label={t('auth.password')} error={errors.password}>
          <div className="relative">
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder={t('auth.passwordCreatePlaceholder', { count: MIN_LENGTH })}
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

          {strength && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1 flex-1">
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i < strength.bars ? strength.bar : 'bg-overlay-strong'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-[11px] font-semibold ${strength.text}`}>
                {t(`auth.strength.${strength.key}`)}
              </span>
            </div>
          )}
        </AuthField>

        <AuthField id="register-referral" label={t('auth.referralOptional')}>
          <input
            id="register-referral"
            type="text"
            autoComplete="off"
            placeholder={t('auth.referralPlaceholder')}
            value={values.referral}
            onChange={set('referral')}
            className={authInputClass(false)}
          />
        </AuthField>

        <div>
          <button
            type="button"
            onClick={() => {
              setAgreed((a) => !a);
              setErrors((prev) => ({ ...prev, terms: undefined }));
            }}
            className="flex items-start gap-2 text-left text-[12.5px] text-content-muted"
          >
            <span
              className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded flex items-center justify-center border transition-colors ${
                agreed ? 'bg-yellow-500 border-yellow-500' : 'border-hairline bg-surface'
              }`}
            >
              {agreed && (
                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M2 6.5L4.5 9L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
            <span>{t('auth.agreeTerms')}</span>
          </button>
          {errors.terms && <p className="mt-1 text-[11.5px] text-loss">{errors.terms}</p>}
        </div>

        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          disabled={busy}
          className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('auth.signUp')}
        </motion.button>

        <GoogleSignIn
          onSuccess={(result) => {
            toast({ title: t('auth.accountCreated'), description: t('auth.accountCreatedDesc') });
            navigate(result.user.kycApproved ? '/' : '/onboarding', { replace: true });
          }}
        />
      </form>
    </AuthShell>
  );
};

export default Register;
