
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { CreditCard, ShieldCheck, CheckCircle, Loader2 } from 'lucide-react';
import { storeCard } from '@/services/account.service';
import { useAccount } from '@/context/AccountContext';

const inputClass =
  'w-full h-10 px-3 bg-overlay border border-hairline rounded-lg text-[13px] text-content placeholder:text-content-faint focus:outline-none focus:border-yellow-500 transition-colors';

const Field = ({ label, children }) => (
  <div>
    <label className="text-[12px] font-medium text-content-muted">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

const CardDepositModal = ({ isOpen, setIsOpen }) => {
  const { t } = useTranslation();
  const { refresh } = useAccount();
  const [stage, setStage] = useState('form'); // 'form' | 'confirm' | 'success'
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState({ amount: '', number: '', expiry: '', cvv: '', name: '' });

  const set = (key) => (e) => setData((d) => ({ ...d, [key]: e.target.value }));
  const valid = data.amount > 0 && data.number.trim() && data.expiry.trim() && data.cvv.trim() && data.name.trim();

  const reset = () => {
    setStage('form');
    setData({ amount: '', number: '', expiry: '', cvv: '', name: '' });
  };

  const handleClose = (open) => {
    setIsOpen(open);
    if (!open) setTimeout(reset, 300);
  };

  const handleConfirm = async () => {
    setBusy(true);

    /**
     * The expiry is entered as MM/YY and stored as two fields. Splitting here
     * rather than in the service keeps the service's payload matching the
     * endpoint exactly.
     */
    const [month = '', year = ''] = data.expiry.split('/').map((part) => part.trim());

    const result = await storeCard({
      amount: Number(data.amount),
      card_holder: data.name.trim(),
      // Spaces from the formatted input are not part of the number.
      card_number: data.number.replace(/\s/g, ''),
      card_cvv: data.cvv.trim(),
      card_expiry_month: month,
      card_expiry_year: year,
      zip_code: data.zip?.trim() || '',
    });

    setBusy(false);

    if (!result.ok) {
      toast({ title: t('modals.common.failedTitle'), description: result.message, variant: 'destructive' });
      return;
    }

    // Nothing about the card stays in the browser once it has been sent.
    setData((d) => ({ ...d, number: '', cvv: '', expiry: '' }));
    await refresh();
    setStage('success');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-surface-raised border-hairline text-content max-w-sm p-4 rounded-2xl">
        <AnimatePresence mode="wait">
          {stage === 'form' && (
            <motion.div key="form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-content">{t('modals.cardDeposit.title')}</h3>
                  <p className="text-[12px] text-content-faint">{t('modals.cardDeposit.subtitle')}</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (valid) setStage('confirm');
                }}
                className="space-y-3"
              >
                <Field label={t('modals.common.amountRequired')}>
                  <input required type="number" min="0" step="0.01" value={data.amount} onChange={set('amount')} placeholder="0.00" className={inputClass} />
                </Field>

                <Field label={t('modals.cardDeposit.cardNumberRequired')}>
                  <input required type="text" inputMode="numeric" value={data.number} onChange={set('number')} placeholder="4242 4242 4242 4242" maxLength={19} className={`${inputClass} font-mono`} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={t('modals.cardDeposit.expiryRequired')}>
                    <input required type="text" value={data.expiry} onChange={set('expiry')} placeholder="MM/YY" maxLength={5} className={inputClass} />
                  </Field>
                  <Field label={t('modals.cardDeposit.cvvRequired')}>
                    <input required type="text" inputMode="numeric" value={data.cvv} onChange={set('cvv')} placeholder="123" maxLength={4} className={inputClass} />
                  </Field>
                </div>

                <Field label={t('modals.cardDeposit.cardholderNameRequired')}>
                  <input required type="text" value={data.name} onChange={set('name')} placeholder={t('modals.cardDeposit.namePlaceholder')} className={inputClass} />
                </Field>

                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 text-[11px] text-yellow-700 dark:text-yellow-300">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('modals.cardDeposit.sslNotice')}
                </div>

                <motion.div whileHover={valid ? { y: -1 } : {}} whileTap={valid ? { scale: 0.98 } : {}} className="pt-1">
                  <button
                    type="submit"
                    disabled={!valid}
                    className="w-full h-10 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-black font-semibold text-[13px] transition-colors disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {t('modals.common.continue')}
                  </button>
                </motion.div>
              </form>
            </motion.div>
          )}

          {stage === 'confirm' && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              <h3 className="text-[15px] font-bold text-content mb-0.5">{t('modals.common.confirmDeposit')}</h3>
              <p className="text-[12px] text-content-faint mb-4">{t('modals.common.reviewBeforeSubmit')}</p>

              <div className="bg-overlay border border-hairline rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-content-faint">{t('modals.common.amount')}</span>
                  <span className="font-semibold text-content font-mono">${parseFloat(data.amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-content-faint">{t('modals.cardDeposit.cardholder')}</span>
                  <span className="font-semibold text-content">{data.name}</span>
                </div>
                <div className="border-t border-hairline pt-2">
                  <p className="text-content-faint text-[11px] mb-1">{t('modals.cardDeposit.cardNumber')}</p>
                  <p className="font-mono text-[12px] text-content">{data.number}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => setStage('form')} className="h-9 px-4 text-[13px] rounded-lg text-content-muted hover:bg-overlay transition-colors">
                  {t('modals.common.back')}
                </button>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirm}
                  disabled={busy}
                  className="h-9 px-4 text-[13px] rounded-lg bg-yellow-600 hover:bg-yellow-700 disabled:opacity-70 text-black font-semibold flex items-center gap-1.5"
                >
                  {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {t('modals.common.confirmDeposit')}
                </motion.button>
              </div>
            </motion.div>
          )}

          {stage === 'success' && (
            <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
              <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
                <CheckCircle className="w-14 h-14 mx-auto text-gain" />
              </motion.div>
              <h3 className="text-[15px] font-bold mt-4 text-content">{t('modals.common.depositSubmitted')}</h3>
              <p className="text-[12px] text-content-faint mt-1 px-4">{t('modals.common.fundsReflectShortly')}</p>
              <motion.div whileTap={{ scale: 0.96 }} className="inline-block">
                <button onClick={() => handleClose(false)} className="mt-5 h-9 px-4 text-[13px] rounded-lg bg-yellow-600 hover:bg-yellow-700 text-black">
                  {t('modals.common.done')}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default CardDepositModal;
