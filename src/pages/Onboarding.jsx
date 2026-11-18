import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Check, ShieldCheck, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { BRAND } from '@/config/brand';
import {
  STEPS,
  OPTION_SETS,
  emptyAnswers,
  needsManualReview,
  toRegisterPayload,
  toProfileExtras,
} from '@/config/onboarding';
import { useAuth } from '@/context/AuthContext';
import { fetchCountries, fetchCurrencies } from '@/services/attributes.service';
import { updateProfile } from '@/services/profile.service';
import { getDeskRef, clearDeskRef } from '@/lib/deskRef';

const inputClass = (hasError) =>
  `w-full h-11 px-3 rounded-xl bg-surface border text-[14px] text-content placeholder:text-content-faint transition-colors focus:outline-none ${
    hasError ? 'border-loss focus:border-loss' : 'border-hairline focus:border-yellow-500'
  }`;

const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { register, user, refreshUser } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState(emptyAnswers);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  /**
   * The credentials from the sign-up form. An existing signed-in client who
   * has not completed onboarding reaches this screen without them — they
   * already have an account, so there is nothing to register and the answers
   * go straight to their profile.
   */
  const credentials = location.state?.credentials || null;
  const isExistingAccount = Boolean(user);

  // Countries and currencies come from the platform, not from the bundle.
  const [remoteOptions, setRemoteOptions] = useState({ countries: [], currencies: [], countryIds: {}, currencyIds: {} });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [countries, currencies] = await Promise.all([fetchCountries(), fetchCurrencies()]);
      if (cancelled) return;
      setRemoteOptions({
        countries: countries.countries.map((c) => ({ value: c.name, label: c.name })),
        currencies: currencies.currencies.map((c) => ({ value: c.code, label: `${c.code} — ${c.name}` })),
        // the form stores the country name and the currency code; registration needs their ids
        countryIds: Object.fromEntries(countries.countries.map((c) => [c.name, c.id])),
        currencyIds: Object.fromEntries(currencies.currencies.map((c) => [c.code, c.id])),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Static option sets and remote ones, resolved the same way by the form. */
  const optionsFor = (field) => {
    if (field.remote) return remoteOptions[field.options] || [];
    return (OPTION_SETS[field.options] || []).map((value) => ({
      value,
      label: t(`onboarding.options.${field.options}.${value}`),
    }));
  };

  const step = STEPS[stepIndex];
  const isReview = step.id === 'review';
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const set = (id) => (e) => {
    setAnswers((a) => ({ ...a, [id]: e.target.value }));
    setErrors((prev) => ({ ...prev, [id]: undefined }));
  };

  const validateStep = () => {
    const found = {};
    step.fields.forEach((f) => {
      if (f.required && !String(answers[f.id] || '').trim()) {
        found[f.id] = t('onboarding.required');
      }
    });
    return found;
  };

  const next = () => {
    const found = validateStep();
    setErrors(found);
    if (Object.keys(found).length) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const back = () => {
    if (stepIndex === 0) navigate('/register');
    else setStepIndex((i) => i - 1);
  };

  const submit = async () => {
    setBusy(true);

    /**
     * Creating the account and recording the suitability answers are two
     * calls because the registration endpoint has no fields for the second
     * set. The account is created first: if the extras fail, the client has
     * an account and support can fill in the rest, which is far better than
     * the reverse.
     */
    if (!isExistingAccount) {
      if (!credentials) {
        setBusy(false);
        navigate('/register', { replace: true });
        return;
      }

      const deskRef = getDeskRef();
      const countryId = remoteOptions.countryIds[answers.country];
      const currencyId = remoteOptions.currencyIds[answers.currency];
      const result = await register(toRegisterPayload({ answers, credentials, deskRef, countryId, currencyId }));

      if (!result.ok) {
        setBusy(false);
        toast({ title: t('onboarding.failedTitle'), description: result.message, variant: 'destructive' });
        return;
      }

      // The referral has done its job; keeping it would attribute the next
      // account opened in this browser to the same desk.
      clearDeskRef();
    }

    await updateProfile(toProfileExtras(answers));
    await refreshUser();
    setBusy(false);

    toast({
      title: t('onboarding.submittedTitle'),
      description: needsManualReview(answers) ? t('onboarding.submittedReview') : t('onboarding.submittedDesc'),
    });

    navigate('/', { replace: true });
  };

  // Only the questions that were actually answered, for the review list.
  const summary = useMemo(
    () =>
      STEPS.flatMap((s) => s.fields)
        .filter((f) => answers[f.id])
        .map((f) => ({
          id: f.id,
          label: t(`onboarding.fields.${f.id}`),
          // A remote option is already the value the client picked — running
          // a country name through the translation table prints the key.
          value: f.options && !f.remote ? t(`onboarding.options.${f.options}.${answers[f.id]}`) : answers[f.id],
        })),
    [answers, t]
  );

  return (
    <div className="min-h-[100dvh] bg-surface flex flex-col">
      <div className="w-full sm:max-w-[440px] sm:mx-auto flex-1 flex flex-col px-5 py-5 sm:py-8">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={back}
            aria-label={t('common.back')}
            className="w-8 h-8 -ml-1.5 flex items-center justify-center rounded-lg text-content-muted hover:text-content hover:bg-overlay transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-[13px] font-semibold text-content-muted">
            {t('onboarding.stepOf', { current: stepIndex + 1, total: STEPS.length })}
          </span>
          <span className="ml-auto text-[13px] font-bold text-content">{BRAND.name}</span>
        </div>

        {/* A bar rather than numbered circles — five labelled steps do not fit
            a phone, and the bar scales to however many steps a broker adds. */}
        <div className="h-1 rounded-full bg-overlay-strong overflow-hidden mb-6">
          <motion.div
            className="h-full bg-yellow-500 rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="flex-1"
          >
            <h1 className="text-[22px] font-bold tracking-tight text-content leading-tight">
              {t(`onboarding.steps.${step.id}.title`)}
            </h1>
            <p className="mt-1 text-[13px] text-content-muted">
              {t(`onboarding.steps.${step.id}.subtitle`)}
            </p>

            {isReview ? (
              <div className="mt-5 space-y-3">
                <div className="rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden">
                  {summary.map((row) => (
                    <div key={row.id} className="flex items-start gap-3 px-3.5 py-2">
                      <span className="text-[12.5px] text-content-muted flex-shrink-0">{row.label}</span>
                      <span className="ml-auto text-[13px] text-content text-right break-words">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {needsManualReview(answers) && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[12px] leading-relaxed text-yellow-700 dark:text-yellow-300">
                      {t('onboarding.manualReview')}
                    </p>
                  </div>
                )}

                <div className="flex items-start gap-2.5 rounded-xl bg-surface-raised border border-hairline p-3">
                  <ShieldCheck className="w-4 h-4 text-content-muted flex-shrink-0 mt-0.5" />
                  <p className="text-[11.5px] leading-relaxed text-content-muted">
                    {t('onboarding.riskNotice')}
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-3.5">
                {step.fields.map((field) => {
                  const error = errors[field.id];
                  const id = `onb-${field.id}`;
                  return (
                    <div key={field.id}>
                      <label htmlFor={id} className="block text-[12.5px] font-medium text-content-muted mb-1.5">
                        {t(`onboarding.fields.${field.id}`)}
                      </label>

                      {field.type === 'select' ? (
                        <select
                          id={id}
                          value={answers[field.id]}
                          onChange={set(field.id)}
                          className={`${inputClass(error)} appearance-none`}
                        >
                          <option value="">{t('onboarding.selectPlaceholder')}</option>
                          {optionsFor(field).map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id={id}
                          type={field.type}
                          autoComplete={field.autoComplete}
                          value={answers[field.id]}
                          onChange={set(field.id)}
                          className={inputClass(error)}
                        />
                      )}

                      {error && <p className="mt-1 text-[11.5px] text-loss">{error}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={isReview ? submit : next}
          disabled={busy}
          className="w-full h-11 mt-6 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {isReview && !busy && <Check className="w-4 h-4" />}
          {isReview ? t('onboarding.submit') : t('onboarding.continue')}
        </motion.button>
      </div>
    </div>
  );
};

export default Onboarding;
