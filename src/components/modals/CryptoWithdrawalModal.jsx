
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { createWithdrawal } from '@/services/account.service';
import { useAccount } from '@/context/AccountContext';

/**
 * Networks and their fees. Still local because the platform has no endpoint
 * describing them — but the withdrawable figure is no longer here: it is the
 * account's free margin, which only the server knows.
 */
const cryptos = {
  USDT: { name: 'Tether', icon: '₮', network: 'TRC20', fee: '1 USDT', time: '5-10 minutes', min: '10 USDT' },
  USDC: { name: 'USD Coin', icon: '$', network: 'ERC20', fee: '1 USDC', time: '10-15 minutes', min: '10 USDC' },
  SOL: { name: 'Solana', icon: '◎', network: 'Solana', fee: '0.01 SOL', time: '1-2 minutes', min: '0.1 SOL' },
};

const CryptoWithdrawalModal = ({ onBack, onSuccess }) => {
  const { t } = useTranslation();
  const { balance, refresh } = useAccount();
  const [selectedCrypto, setSelectedCrypto] = useState('USDT');
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  /**
   * What can actually leave is free margin, not the balance — money backing
   * an open position is not the client's to withdraw.
   */
  const available = Math.max(balance.freeMargin, 0);
  const coin = { ...cryptos[selectedCrypto], available };
  const canContinue = address.trim().length > 0 && parseFloat(amount) > 0 && parseFloat(amount) <= available;

  const selectCrypto = (key) => {
    setSelectedCrypto(key);
    setAmount('');
  };

  const handleWithdraw = async () => {
    setBusy(true);
    const result = await createWithdrawal('crypto', {
      name: cryptos[selectedCrypto].name,
      address: address.trim(),
      amount: String(amount ?? '').trim(),
      crypto_type: selectedCrypto,
      crypto_symbol: selectedCrypto,
      network: cryptos[selectedCrypto].network,
      method: 'crypto',
      type: 'withdrawal',
    });
    setBusy(false);

    if (!result.ok) {
      toast({ title: t('modals.common.failedTitle'), description: result.message, variant: 'destructive' });
      return;
    }

    await refresh();
    toast({ title: t('modals.cryptoWithdraw.submittedTitle'), description: t('modals.cryptoWithdraw.submittedDesc'), variant: 'pending' });
    onSuccess?.();
  };

  const renderStepOne = () => (
    <motion.div
      key="step1"
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 30 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2 h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="text-[15px] font-bold text-content">{t('modals.cryptoWithdraw.title')}</h3>
          <p className="text-[12px] text-content-faint">{t('modals.cryptoWithdraw.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 bg-overlay p-1 rounded-lg border border-hairline mb-3">
        {Object.keys(cryptos).map((key) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.94 }}
            onClick={() => selectCrypto(key)}
            className={`h-8 rounded-md text-[12px] font-semibold transition-colors ${
              selectedCrypto === key ? 'bg-yellow-600 text-black' : 'text-content-muted hover:text-content'
            }`}
          >
            {cryptos[key].icon} {key}
          </motion.button>
        ))}
      </div>

      <div className="bg-overlay p-3 rounded-lg border border-hairline mb-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[13px] font-semibold text-content">{coin.name} ({selectedCrypto})</p>
            <p className="text-[11px] text-content-faint">{t('modals.cryptoWithdraw.network')}: {coin.network} · {t('modals.cryptoWithdraw.fee')}: {coin.fee}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-content-faint">{t('modals.cryptoWithdraw.processing')}</p>
            <p className="text-[12px] font-semibold text-content">{coin.time}</p>
          </div>
        </div>
        <div className="border-t border-hairline my-2" />
        <p className="text-[11px] text-content-faint">{t('modals.cryptoWithdraw.minWithdrawal')}: <span className="font-semibold text-content-muted">{coin.min}</span></p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[12px] font-medium text-content-muted">{selectedCrypto} {t('modals.cryptoWithdraw.address')} ({coin.network})</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={t('modals.cryptoWithdraw.addressPlaceholder', { crypto: selectedCrypto })}
            className="w-full mt-1 h-10 px-3 bg-overlay border border-hairline rounded-lg text-[13px] text-content placeholder:text-content-faint focus:outline-none focus:border-yellow-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-content-muted">{t('modals.common.amount')}</label>
            <span className="text-[11px] text-content-faint">
              {t('modals.cryptoWithdraw.available')}: <span className="text-content-muted font-semibold font-mono">{coin.available} {selectedCrypto}</span>
            </span>
          </div>
          <div className="relative mt-1">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full h-10 pl-3 pr-14 bg-overlay border border-hairline rounded-lg text-[13px] text-content placeholder:text-content-faint focus:outline-none focus:border-yellow-500"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setAmount(String(coin.available))}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-yellow-600 dark:text-yellow-400 hover:text-yellow-700 dark:text-yellow-300 px-2 py-1"
            >
              {t('modals.common.max')}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <motion.div whileHover={canContinue ? { y: -1 } : {}} whileTap={canContinue ? { scale: 0.97 } : {}}>
          <Button
            onClick={() => setStep(2)}
            disabled={!canContinue}
            className="h-9 px-4 text-[13px] bg-yellow-600 hover:bg-yellow-700 text-black font-semibold disabled:opacity-40 disabled:pointer-events-none"
          >
            {t('modals.common.continue')}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  const renderStepTwo = () => (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center mb-4">
        <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="mr-2 h-8 w-8">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h3 className="text-[15px] font-bold text-content">{t('modals.bankWithdraw.confirmTitle')}</h3>
          <p className="text-[12px] text-content-faint">{t('modals.common.reviewBeforeSubmit')}</p>
        </div>
      </div>

      <div className="bg-overlay border border-hairline rounded-lg p-3 space-y-2">
        <div className="flex justify-between text-[13px]">
          <span className="text-content-faint">{t('modals.common.amount')}</span>
          <span className="font-semibold text-content font-mono">{amount} {selectedCrypto}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-content-faint">{t('modals.cryptoWithdraw.network')}</span>
          <span className="font-semibold text-content">{coin.network}</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-content-faint">{t('modals.cryptoWithdraw.fee')}</span>
          <span className="font-semibold text-content">{coin.fee}</span>
        </div>
        <div className="border-t border-hairline pt-2">
          <p className="text-content-faint text-[11px] mb-1">{t('modals.cryptoWithdraw.destinationAddress')}</p>
          <p className="font-mono text-[12px] text-content break-all">{address}</p>
        </div>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
        <h4 className="font-semibold text-yellow-600 dark:text-yellow-400 text-[12px]">{t('modals.cryptoWithdraw.doubleCheckTitle')}</h4>
        <ul className="list-disc list-inside text-[12px] text-content-muted mt-1.5 space-y-0.5">
          <li>{t('modals.cryptoWithdraw.irreversibleNotice')}</li>
          <li>{t('modals.cryptoWithdraw.networkSupportNotice', { network: coin.network })}</li>
        </ul>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <motion.div whileTap={{ scale: 0.97 }}>
          <Button variant="ghost" onClick={() => setStep(1)} className="h-9 px-4 text-[13px]">{t('modals.common.cancel')}</Button>
        </motion.div>
        <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={handleWithdraw}
            disabled={busy}
            className="h-9 px-4 text-[13px] bg-yellow-600 hover:bg-yellow-700 text-black font-semibold disabled:opacity-60"
          >
            {t('modals.cryptoWithdraw.withdrawCrypto', { crypto: selectedCrypto })}
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );

  return <AnimatePresence mode="wait">{step === 1 ? renderStepOne() : renderStepTwo()}</AnimatePresence>;
};

export default CryptoWithdrawalModal;
