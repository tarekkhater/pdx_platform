import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { changePassword } from '@/services/profile.service';

const MIN_LENGTH = 8;
const BLANK = { current: '', next: '', confirm: '' };

// Label left, field right — the same row shape the profile and settings lists
// use, so the dialog needs no boxes of its own.
const Row = ({ id, label, value, onChange, autoFocus }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className="flex items-center gap-2 px-3.5 py-2">
      <label htmlFor={id} className="text-[13px] text-content-muted flex-shrink-0">
        {label}
      </label>
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-right text-[14px] text-content focus:outline-none"
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="flex-shrink-0 text-content-faint hover:text-content-muted transition-colors"
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
};

const ChangePasswordModal = ({ isOpen, setIsOpen }) => {
  const { t } = useTranslation();
  const [values, setValues] = useState(BLANK);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Never leave a typed password sitting in state behind a closed dialog.
  useEffect(() => {
    if (!isOpen) {
      setValues(BLANK);
      setError(null);
    }
  }, [isOpen]);

  const set = (key) => (v) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setError(null);
  };

  const validate = () => {
    const { current, next, confirm } = values;
    if (!current || !next || !confirm) return 'required';
    if (next.length < MIN_LENGTH) return 'tooShort';
    if (next !== confirm) return 'mismatch';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    const result = await changePassword({
      currentPassword: values.current,
      password: values.next,
      confirmPassword: values.confirm,
    });
    setBusy(false);

    if (!result.ok) {
      // The server's reason is shown verbatim — it knows things the form does
      // not, such as a password that has been used before.
      setError(null);
      toast({ title: t('changePassword.failedTitle'), description: result.message, variant: 'destructive' });
      return;
    }

    toast({
      title: t('changePassword.successTitle'),
      description: t('changePassword.successDesc'),
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[92vw] max-w-[340px] p-4 gap-0 rounded-2xl bg-surface-raised border-hairline text-content">
        <DialogTitle className="text-[17px] font-bold leading-tight pr-8">
          {t('changePassword.title')}
        </DialogTitle>
        <p className="text-[12px] text-content-muted mt-0.5">
          {t('changePassword.subtitle', { count: MIN_LENGTH })}
        </p>

        <form onSubmit={handleSubmit} className="mt-3">
          <div className="rounded-xl bg-surface border border-hairline divide-y divide-hairline overflow-hidden">
            <Row
              id="current-password"
              label={t('changePassword.current')}
              value={values.current}
              onChange={set('current')}
              autoFocus
            />
            <Row
              id="new-password"
              label={t('changePassword.new')}
              value={values.next}
              onChange={set('next')}
            />
            <Row
              id="confirm-password"
              label={t('changePassword.confirm')}
              value={values.confirm}
              onChange={set('confirm')}
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-[12px] text-loss"
            >
              {t(`changePassword.errors.${error}`, { count: MIN_LENGTH })}
            </motion.p>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 h-10 rounded-xl bg-overlay hover:bg-overlay-strong text-content font-semibold text-[14px] transition-colors"
            >
              {t('modals.common.cancel')}
            </button>
            <motion.button
              type="submit"
              whileTap={{ scale: 0.98 }}
              disabled={busy}
              className="flex-1 h-10 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2 transition-colors"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('changePassword.update')}
            </motion.button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePasswordModal;
