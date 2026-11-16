
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Landmark, CreditCard, CheckCircle, ChevronDown, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { createWithdrawal } from '@/services/account.service';
import { useAccount } from '@/context/AccountContext';
import { useAuth } from '@/context/AuthContext';

const EU_COUNTRIES = [
  'Austria', 'Belgium', 'Bulgaria', 'Croatia', 'Cyprus', 'Czech Republic', 'Denmark', 'Estonia',
  'Finland', 'France', 'Germany', 'Greece', 'Hungary', 'Ireland', 'Italy', 'Latvia', 'Lithuania',
  'Luxembourg', 'Malta', 'Netherlands', 'Poland', 'Portugal', 'Romania', 'Slovakia', 'Slovenia',
  'Spain', 'Sweden',
];

const CURRENCIES = [
  { code: 'USD', flag: '🇺🇸' },
  { code: 'EUR', flag: '🇪🇺' },
];

const Field = ({ label, children }) => (
  <div>
    <label className="text-[12px] font-medium text-content-muted">{label}</label>
    <div className="mt-1">{children}</div>
  </div>
);

const inputClass =
  'w-full h-10 px-3 bg-overlay border border-hairline rounded-lg text-[13px] text-content placeholder:text-content-faint focus:outline-none focus:border-yellow-500 transition-colors';
const selectClass = `${inputClass} appearance-none pr-8 bg-surface-raised`;

const CurrencySwitch = ({ value, onChange }) => (
  <div className="flex items-center rounded-lg bg-overlay border border-hairline p-1">
    {CURRENCIES.map((c) => (
      <motion.button
        key={c.code}
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => onChange(c.code)}
        className={`flex-1 h-8 rounded-md text-[12px] font-semibold transition-colors ${
          value === c.code ? 'bg-yellow-600 text-black' : 'text-content-muted hover:text-content'
        }`}
      >
        {c.flag} {c.code}
      </motion.button>
    ))}
  </div>
);

const SelectWithChevron = (props) => (
  <div className="relative">
    <select {...props} style={{ colorScheme: 'dark' }} className={selectClass} />
    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-faint pointer-events-none" />
  </div>
);

const BankWithdrawalModal = ({ onBack, onSuccess }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { refresh } = useAccount();
  const [method, setMethod] = useState(null); // 'bank' | 'card'
  const [stage, setStage] = useState('select'); // 'select' | 'form' | 'confirm' | 'success'
  const [busy, setBusy] = useState(false);
  const [bankData, setBankData] = useState({
    currency: 'USD', country: '', amount: '', name: '',
    routingNumber: '', accountNumber: '', accountType: '', bic: '', iban: '',
  });
  const [cardData, setCardData] = useState({ currency: 'USD', amount: '', number: '', name: '', expiry: '' });

  /**
   * Both routes are wire withdrawals as far as the platform is concerned —
   * there is one endpoint, and the card form is a different way of naming the
   * destination rather than a different rail.
   *
   * The first and last name are split off the single name field the form
   * collects, because the endpoint wants them separately.
   */
  const submitWithdrawal = async (data, kind) => {
    setBusy(true);

    const [firstName = '', ...rest] = String(data.name || '').trim().split(/\s+/);

    const result = await createWithdrawal('bank', {
      amount: String(data.amount ?? '').trim(),
      currency: data.currency,
      country: data.country || (data.currency === 'EUR' ? 'DE' : 'US'),
      firstName,
      lastName: rest.join(' '),
      email: user?.email || '',
      accountType: data.accountType || 'individual',
      iban: kind === 'bank' ? data.iban || data.accountNumber || '' : String(data.number || '').replace(/\s/g, ''),
      bic: data.bic || '',
      routing_number: data.routingNumber || '',
      method: 'bank_transfer',
      type: 'withdrawal',
    });

    setBusy(false);

    if (!result.ok) {
      toast({ title: t('modals.common.failedTitle'), description: result.message, variant: 'destructive' });
      return;
    }

    // The card number was only ever held to name the destination.
    if (kind === 'card') setCardData((d) => ({ ...d, number: '' }));
    await refresh();
    setStage('success');
  };

  const selectMethod = (m) => {
    setMethod(m);
    setStage('form');
  };

  const goBack = () => {
    if (stage === 'confirm') setStage('form');
    else if (stage === 'form') {
      setMethod(null);
      setStage('select');
    } else onBack();
  };

  const headerCopy = {
    select: { title: t('modals.withdraw.title'), sub: t('modals.bankWithdraw.chooseMethod') },
    form: { title: t('modals.withdraw.title'), sub: method === 'bank' ? t('modals.bankWithdraw.bankDetails') : t('modals.bankWithdraw.cardDetails') },
    confirm: { title: t('modals.bankWithdraw.confirmTitle'), sub: t('modals.common.reviewBeforeSubmit') },
    success: { title: t('modals.withdraw.title'), sub: '' },
  }[stage];

  return (
    <div>
      <div className="flex items-center mb-4">
        {stage !== 'success' && (
          <Button variant="ghost" size="icon" onClick={goBack} className="mr-2 h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div>
          <h3 className="text-[15px] font-bold text-content">{headerCopy.title}</h3>
          {headerCopy.sub && <p className="text-[12px] text-content-faint">{headerCopy.sub}</p>}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {stage === 'select' && <MethodSelect key="select" onSelect={selectMethod} />}
        {stage === 'form' && method === 'bank' && (
          <BankForm key="bank-form" data={bankData} setData={setBankData} onSubmit={() => setStage('confirm')} />
        )}
        {stage === 'form' && method === 'card' && (
          <CardForm key="card-form" data={cardData} setData={setCardData} onSubmit={() => setStage('confirm')} />
        )}
        {stage === 'confirm' && method === 'bank' && (
          <BankConfirm key="bank-confirm" data={bankData} busy={busy} onConfirm={() => submitWithdrawal(bankData, 'bank')} />
        )}
        {stage === 'confirm' && method === 'card' && (
          <CardConfirm key="card-confirm" data={cardData} busy={busy} onConfirm={() => submitWithdrawal(cardData, 'card')} />
        )}
        {stage === 'success' && <SuccessView key="success" onSuccess={onSuccess} />}
      </AnimatePresence>
    </div>
  );
};

const MethodSelect = ({ onSelect }) => {
  const { t } = useTranslation();
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.2 }} className="space-y-2">
      <motion.button
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect('bank')}
        className="w-full flex items-center gap-3 p-3 rounded-lg border border-hairline hover:border-yellow-500/40 hover:bg-overlay transition-colors text-left"
      >
        <span className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
          <Landmark className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        </span>
        <span>
          <span className="block font-semibold text-[13px] text-content">{t('modals.bankWithdraw.bankWireIban')}</span>
          <span className="block text-[11px] text-content-faint">{t('modals.bankWithdraw.bankWireDesc')}</span>
        </span>
      </motion.button>
      <motion.button
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect('card')}
        className="w-full flex items-center gap-3 p-3 rounded-lg border border-hairline hover:border-yellow-500/40 hover:bg-overlay transition-colors text-left"
      >
        <span className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
          <CreditCard className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
        </span>
        <span>
          <span className="block font-semibold text-[13px] text-content">{t('modals.bankWithdraw.debitCard')}</span>
          <span className="block text-[11px] text-content-faint">{t('modals.bankWithdraw.debitCardDesc')}</span>
        </span>
      </motion.button>
    </motion.div>
  );
};

// Currency drives which fields show: USD withdrawals go through US bank rails
// (routing number, account number, account type, BIC) while EUR keeps the
// Country + IBAN pair, since that's what SEPA transfers actually need.
const BankForm = ({ data, setData, onSubmit }) => {
  const { t } = useTranslation();
  const set = (key) => (e) => setData((d) => ({ ...d, [key]: e.target.value }));
  const isUSD = data.currency === 'USD';
  const valid =
    data.amount > 0 &&
    data.name.trim() &&
    (isUSD
      ? data.routingNumber.trim() && data.accountNumber.trim() && data.accountType && data.bic.trim()
      : data.country && data.iban.trim());

  return (
    <motion.form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit();
      }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      <Field label={t('modals.bankWithdraw.currency')}>
        <CurrencySwitch value={data.currency} onChange={(v) => setData((d) => ({ ...d, currency: v }))} />
      </Field>

      <Field label={t('modals.common.amountRequired')}>
        <input required type="number" min="0" step="0.01" value={data.amount} onChange={set('amount')} placeholder="0.00" className={inputClass} />
      </Field>

      <Field label={t('modals.bankWithdraw.accountHolderRequired')}>
        <input required type="text" value={data.name} onChange={set('name')} placeholder={t('modals.bankWithdraw.accountHolderPlaceholder')} className={inputClass} />
      </Field>

      <AnimatePresence mode="wait">
        {isUSD ? (
          <motion.div key="usd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('modals.bankWithdraw.routingNumberRequired')}>
                <input required type="text" inputMode="numeric" value={data.routingNumber} onChange={set('routingNumber')} placeholder="e.g. 021000021" className={`${inputClass} font-mono`} />
              </Field>
              <Field label={t('modals.bankWithdraw.accountNumberRequired')}>
                <input required type="text" inputMode="numeric" value={data.accountNumber} onChange={set('accountNumber')} placeholder="e.g. 000123456789" className={`${inputClass} font-mono`} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('modals.bankWithdraw.accountTypeRequired')}>
                <SelectWithChevron required value={data.accountType} onChange={set('accountType')}>
                  <option value="" disabled>{t('modals.bankWithdraw.selectType')}</option>
                  <option>{t('modals.bankWithdraw.checking')}</option>
                  <option>{t('modals.bankWithdraw.savings')}</option>
                </SelectWithChevron>
              </Field>
              <Field label={t('modals.bankWithdraw.bicRequired')}>
                <input required type="text" value={data.bic} onChange={set('bic')} placeholder="e.g. BOFAUS3N" className={`${inputClass} font-mono uppercase`} />
              </Field>
            </div>
          </motion.div>
        ) : (
          <motion.div key="eur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-3">
            <Field label={t('modals.bankWithdraw.countryRequired')}>
              <SelectWithChevron required value={data.country} onChange={set('country')}>
                <option value="" disabled>{t('modals.bankWithdraw.selectCountry')}</option>
                {EU_COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </SelectWithChevron>
            </Field>
            <Field label={t('modals.bankWithdraw.ibanRequired')}>
              <input required type="text" value={data.iban} onChange={set('iban')} placeholder="e.g. DE89 3704 0044 0532 0130 00" className={`${inputClass} font-mono`} />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 text-[11px] text-yellow-700 dark:text-yellow-300">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
        {t('modals.bankWithdraw.processedNotice')}
      </div>

      <div className="pt-1 flex justify-end">
        <motion.div whileHover={valid ? { y: -1 } : {}} whileTap={valid ? { scale: 0.97 } : {}}>
          <Button
            type="submit"
            disabled={!valid}
            className="h-9 px-4 text-[13px] bg-yellow-600 hover:bg-yellow-700 text-black font-semibold disabled:opacity-40 disabled:pointer-events-none"
          >
            {t('modals.common.continue')}
          </Button>
        </motion.div>
      </div>
    </motion.form>
  );
};

// A card payout, not a card charge — so it asks for the card number and
// holder name only, never a CVV (that's for charging a card, not paying one).
const CardForm = ({ data, setData, onSubmit }) => {
  const { t } = useTranslation();
  const set = (key) => (e) => setData((d) => ({ ...d, [key]: e.target.value }));
  const valid = data.amount > 0 && data.number.trim() && data.name.trim() && data.expiry.trim();

  return (
    <motion.form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit();
      }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-3"
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('modals.common.amountRequired')}>
          <input required type="number" min="0" step="0.01" value={data.amount} onChange={set('amount')} placeholder="0.00" className={inputClass} />
        </Field>
        <Field label={t('modals.bankWithdraw.currency')}>
          <CurrencySwitch value={data.currency} onChange={(v) => setData((d) => ({ ...d, currency: v }))} />
        </Field>
      </div>

      <Field label={t('modals.cardDeposit.cardNumberRequired')}>
        <input required type="text" inputMode="numeric" value={data.number} onChange={set('number')} placeholder="4242 4242 4242 4242" maxLength={19} className={`${inputClass} font-mono`} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('modals.cardDeposit.cardholderNameRequired')}>
          <input required type="text" value={data.name} onChange={set('name')} placeholder={t('modals.cardDeposit.namePlaceholder')} className={inputClass} />
        </Field>
        <Field label={t('modals.cardDeposit.expiryRequired')}>
          <input required type="text" value={data.expiry} onChange={set('expiry')} placeholder="MM/YY" maxLength={5} className={inputClass} />
        </Field>
      </div>

      <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 text-[11px] text-yellow-700 dark:text-yellow-300">
        <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
        {t('modals.bankWithdraw.cardPayoutNotice')}
      </div>

      <div className="pt-1 flex justify-end">
        <motion.div whileHover={valid ? { y: -1 } : {}} whileTap={valid ? { scale: 0.97 } : {}}>
          <Button
            type="submit"
            disabled={!valid}
            className="h-9 px-4 text-[13px] bg-yellow-600 hover:bg-yellow-700 text-black font-semibold disabled:opacity-40 disabled:pointer-events-none"
          >
            {t('modals.common.continue')}
          </Button>
        </motion.div>
      </div>
    </motion.form>
  );
};

const ConfirmRow = ({ label, value, mono }) => (
  <div className="flex justify-between text-[13px] gap-3">
    <span className="text-content-faint flex-shrink-0">{label}</span>
    <span className={`font-semibold text-content text-right break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);

const ConfirmShell = ({ rows, warning, confirmLabel, onConfirm, busy }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
    <div className="bg-overlay border border-hairline rounded-lg p-3 space-y-2">{rows}</div>
    <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 text-[11px] text-yellow-700 dark:text-yellow-300 mt-3">
      <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
      {warning}
    </div>
    <div className="pt-4 flex justify-end">
      <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
        <Button
          onClick={onConfirm}
          disabled={busy}
          className="h-9 px-4 text-[13px] bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-black font-semibold"
        >
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
          )}
          {confirmLabel}
        </Button>
      </motion.div>
    </div>
  </motion.div>
);

const BankConfirm = ({ data, onConfirm, busy }) => {
  const { t } = useTranslation();
  const isUSD = data.currency === 'USD';
  return (
    <ConfirmShell
      onConfirm={onConfirm}
      busy={busy}
      confirmLabel={t('modals.bankWithdraw.confirmWithdrawal')}
      warning={isUSD ? t('modals.bankWithdraw.usdWarning') : t('modals.bankWithdraw.eurWarning')}
      rows={
        <>
          <ConfirmRow label={t('modals.common.amount')} value={`${isUSD ? '$' : '€'}${parseFloat(data.amount || 0).toFixed(2)}`} mono />
          <ConfirmRow label={t('modals.bankWithdraw.accountHolder')} value={data.name} />
          {isUSD ? (
            <>
              <ConfirmRow label={t('modals.bankWithdraw.accountType')} value={data.accountType} />
              <ConfirmRow label={t('modals.bankWithdraw.bic')} value={data.bic} mono />
              <div className="border-t border-hairline pt-2 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-content-faint text-[11px] mb-1">{t('modals.bankWithdraw.routingNumber')}</p>
                  <p className="font-mono text-[12px] text-content break-all">{data.routingNumber}</p>
                </div>
                <div>
                  <p className="text-content-faint text-[11px] mb-1">{t('modals.bankWithdraw.accountNumber')}</p>
                  <p className="font-mono text-[12px] text-content break-all">{data.accountNumber}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <ConfirmRow label={t('modals.bankWithdraw.country')} value={data.country} />
              <div className="border-t border-hairline pt-2">
                <p className="text-content-faint text-[11px] mb-1">{t('modals.bankWithdraw.iban')}</p>
                <p className="font-mono text-[12px] text-content break-all">{data.iban}</p>
              </div>
            </>
          )}
        </>
      }
    />
  );
};

const CardConfirm = ({ data, onConfirm, busy }) => {
  const { t } = useTranslation();
  return (
    <ConfirmShell
      onConfirm={onConfirm}
      busy={busy}
      confirmLabel={t('modals.bankWithdraw.confirmWithdrawal')}
      warning={t('modals.bankWithdraw.cardWarning')}
      rows={
        <>
          <ConfirmRow label={t('modals.common.amount')} value={`${data.currency === 'USD' ? '$' : '€'}${parseFloat(data.amount || 0).toFixed(2)}`} mono />
          <ConfirmRow label={t('modals.cardDeposit.cardholder')} value={data.name} />
          <ConfirmRow label={t('modals.bankWithdraw.expiry')} value={data.expiry} mono />
          <div className="border-t border-hairline pt-2">
            <p className="text-content-faint text-[11px] mb-1">{t('modals.cardDeposit.cardNumber')}</p>
            <p className="font-mono text-[12px] text-content">{data.number}</p>
          </div>
        </>
      }
    />
  );
};

const SuccessView = ({ onSuccess }) => {
  const { t } = useTranslation();
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
        <CheckCircle className="w-14 h-14 mx-auto text-gain" />
      </motion.div>
      <h3 className="text-[15px] font-bold mt-4 text-content">{t('modals.bankWithdraw.withdrawalSubmitted')}</h3>
      <p className="text-[12px] text-content-faint mt-1 px-4">{t('modals.bankWithdraw.withdrawalSuccessDesc')}</p>
      <motion.div whileTap={{ scale: 0.96 }} className="inline-block">
        <Button onClick={onSuccess} className="mt-5 h-9 px-4 text-[13px] bg-yellow-600 hover:bg-yellow-700 text-black">
          {t('modals.common.done')}
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default BankWithdrawalModal;
