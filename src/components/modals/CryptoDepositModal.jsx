
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';
import { Bitcoin, Copy, Check, ShieldCheck, CheckCircle, Loader2 } from 'lucide-react';
import { fetchDepositWallets, createDeposit } from '@/services/account.service';
import { useAccount } from '@/context/AccountContext';

const inputClass =
  'w-full h-10 px-3 bg-overlay border border-hairline rounded-lg text-[13px] text-content placeholder:text-content-faint focus:outline-none focus:border-yellow-500 transition-colors';

const CryptoDepositModal = ({ isOpen, setIsOpen }) => {
  const { t } = useTranslation();
  const { refresh } = useAccount();
  const [stage, setStage] = useState('form'); // 'form' | 'confirm' | 'success'
  const [amount, setAmount] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  /**
   * Deposit addresses come from the platform, never from the bundle.
   *
   * They were two literals in this file. A wrong or stale address here sends
   * a client's money somewhere unrecoverable, and rotating one should not
   * require a front-end release.
   */
  const [wallets, setWallets] = useState([]);
  const [selectedCrypto, setSelectedCrypto] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;

    (async () => {
      const result = await fetchDepositWallets();
      if (cancelled) return;
      setWallets(result.wallets);
      setSelectedCrypto((current) => current ?? result.wallets[0]?.name ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const coin = wallets.find((w) => w.name === selectedCrypto) || null;

  const handleCopy = () => {
    if (!coin?.address) return;
    navigator.clipboard.writeText(coin.address);
    setCopied(true);
    toast({ title: t('modals.cryptoDeposit.copiedTitle'), description: t('modals.cryptoDeposit.copiedDesc') });
    setTimeout(() => setCopied(false), 1500);
  };

  const reset = () => {
    setStage('form');
    setAmount('');
  };

  const handleClose = (open) => {
    setIsOpen(open);
    if (!open) setTimeout(reset, 300);
  };

  const handleConfirm = async () => {
    if (!coin) return;
    setBusy(true);

    const result = await createDeposit('crypto', {
      amount: Number(amount),
      wallet_id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
      cryptocurrency: coin.name,
      address: coin.address,
      type: 'usdt',
    });

    setBusy(false);

    if (!result.ok) {
      toast({ title: t('modals.common.failedTitle'), description: result.message, variant: 'destructive' });
      return;
    }

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
                  <Bitcoin className="w-4 h-4 text-yellow-500" />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-content">{t('modals.cryptoDeposit.title')}</h3>
                  <p className="text-[12px] text-content-faint">{t('modals.cryptoDeposit.subtitle')}</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (amount > 0) setStage('confirm');
                }}
                className="space-y-3"
              >
                {/* The grid grows with however many networks the platform
                    supports, rather than assuming two. */}
                <div className="grid grid-cols-2 gap-1 bg-overlay p-1 rounded-lg border border-hairline">
                  {wallets.map((wallet) => (
                    <motion.button
                      key={wallet.id}
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={() => setSelectedCrypto(wallet.name)}
                      className={`h-8 rounded-md text-[12px] font-semibold transition-colors ${
                        selectedCrypto === wallet.name
                          ? 'bg-yellow-600 text-black'
                          : 'text-content-muted hover:text-content'
                      }`}
                    >
                      {wallet.name}
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 text-[11px] text-yellow-700 dark:text-yellow-300">
                  <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
                  {t('modals.cryptoDeposit.networkWarning', { crypto: selectedCrypto, network: coin?.symbol })}
                </div>

                <div>
                  <label className="text-[12px] font-medium text-content-muted">{t('modals.cryptoDeposit.depositAddress')}</label>
                  <div className="mt-1 flex items-center gap-2 bg-overlay border border-hairline rounded-lg p-3">
                    {/* Until the address has arrived there is nothing safe to
                        show — a placeholder here is money sent to nowhere. */}
                    <p className="flex-1 font-mono text-[12px] text-content break-all leading-relaxed">
                      {coin?.address || t('common.loading')}
                    </p>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={handleCopy}
                      className="flex-shrink-0 w-8 h-8 rounded-md bg-overlay hover:bg-overlay-strong flex items-center justify-center text-content-muted transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4 text-gain" /> : <Copy className="w-4 h-4" />}
                    </motion.button>
                  </div>
                </div>

                <div>
                  <label className="text-[12px] font-medium text-content-muted">{t('modals.common.amountRequired')}</label>
                  <input required type="number" min="0" step="0.00000001" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className={`${inputClass} mt-1`} />
                </div>

                <motion.div whileHover={amount > 0 ? { y: -1 } : {}} whileTap={amount > 0 ? { scale: 0.98 } : {}} className="pt-1">
                  <button
                    type="submit"
                    disabled={!(amount > 0)}
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
                  <span className="text-content-faint">{t('orderPanel.asset')}</span>
                  <span className="font-semibold text-content">{selectedCrypto}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-content-faint">{t('modals.cryptoDeposit.network')}</span>
                  <span className="font-semibold text-content">{coin?.symbol}</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-content-faint">{t('modals.common.amount')}</span>
                  {/* The unit is the wallet's own symbol — it used to be
                      hardcoded to BTC or ETH, which was wrong for any third
                      network the broker added. */}
                  <span className="font-semibold text-content font-mono">{amount} {coin?.symbol}</span>
                </div>
                <div className="border-t border-hairline pt-2">
                  <p className="text-content-faint text-[11px] mb-1">{t('modals.cryptoDeposit.depositAddress')}</p>
                  <p className="font-mono text-[12px] text-content break-all">{coin?.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 text-[11px] text-yellow-700 dark:text-yellow-300 mt-3">
                <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                {t('modals.cryptoDeposit.confirmNotice')}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button onClick={() => setStage('form')} className="h-9 px-4 text-[13px] rounded-lg text-content-muted hover:bg-overlay transition-colors">
                  {t('modals.common.back')}
                </button>
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirm}
                  disabled={busy || !coin}
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
              <p className="text-[12px] text-content-faint mt-1 px-4">{t('modals.cryptoDeposit.successDesc')}</p>
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

export default CryptoDepositModal;
