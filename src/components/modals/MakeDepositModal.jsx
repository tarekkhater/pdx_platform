
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Bitcoin, ExternalLink, ShieldCheck, ChevronRight } from 'lucide-react';
import CardDepositModal from './CardDepositModal';
import CryptoDepositModal from './CryptoDepositModal';
import { fetchCardPaymentLink } from '@/services/account.service';

// The external card checkout link comes from the CRM (Settings → Custom Payment Link).

const MethodRow = ({ icon: Icon, name, desc, badge, onClick }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-overlay transition-colors text-left"
  >
    <span className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
      <Icon className="w-4 h-4 text-yellow-500" />
    </span>
    <span className="flex-1 min-w-0">
      <span className="flex items-center gap-2">
        <span className="font-semibold text-[13px] text-content">{name}</span>
        {badge && (
          <span className="text-[10px] font-semibold bg-emerald-500/15 text-gain px-1.5 py-0.5 rounded-full flex-shrink-0">
            {badge}
          </span>
        )}
      </span>
      <span className="block text-[11px] text-content-faint mt-0.5 truncate">{desc}</span>
    </span>
    <ChevronRight className="w-4 h-4 text-content-faint flex-shrink-0" />
  </motion.button>
);

const MakeDepositModal = ({ isOpen, setIsOpen }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState('methods'); // 'methods' | 'cardCheckout'
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isCryptoModalOpen, setIsCryptoModalOpen] = useState(false);
  const [cardLink, setCardLink] = useState('');

  // read the link each time the window opens, so a change in the CRM shows at once
  useEffect(() => {
    if (!isOpen) return undefined;
    let alive = true;
    fetchCardPaymentLink().then((url) => alive && setCardLink(url));
    return () => { alive = false; };
  }, [isOpen]);

  const resetStep = () => setStep('methods');

  const handleOpenChange = (open) => {
    setIsOpen(open);
    if (!open) setTimeout(resetStep, 200);
  };

  const openCardCheckout = () => setStep('cardCheckout');

  const openExternalCardPay = () => {
    if (!cardLink) return;
    window.open(cardLink, '_blank', 'noopener,noreferrer');
    handleOpenChange(false);
  };

  const openInternalCardPay = () => {
    handleOpenChange(false);
    setIsCardModalOpen(true);
  };

  const openCrypto = () => {
    handleOpenChange(false);
    setIsCryptoModalOpen(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-surface-raised border-hairline text-content max-w-sm p-4 rounded-2xl">
          <AnimatePresence mode="wait">
            {step === 'methods' && (
              <motion.div
                key="methods"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.18 }}
              >
                <DialogHeader className="space-y-0.5">
                  <DialogTitle className="text-[16px] font-bold text-content">{t('modals.deposit.title')}</DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-2 text-[11px] text-content-faint mt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  {t('modals.securedEncryption')}
                </div>

                <div className="space-y-1 mt-3">
                  <MethodRow
                    icon={CreditCard}
                    name={t('modals.deposit.card.name')}
                    desc={t('modals.deposit.card.desc')}
                    badge={t('modals.deposit.instant')}
                    onClick={openCardCheckout}
                  />
                  <MethodRow
                    icon={Bitcoin}
                    name={t('modals.deposit.crypto.name')}
                    desc={t('modals.deposit.crypto.desc')}
                    badge={t('modals.deposit.instant')}
                    onClick={openCrypto}
                  />
                </div>
              </motion.div>
            )}

            {step === 'cardCheckout' && (
              <motion.div
                key="cardCheckout"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                <div className="flex items-start gap-1.5">
                  <button
                    type="button"
                    onClick={resetStep}
                    className="mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center text-content-muted hover:bg-overlay transition-colors"
                    aria-label={t('modals.common.back')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <DialogHeader className="space-y-0.5 flex-1">
                    <DialogTitle className="text-[16px] font-bold text-content">
                      {t('modals.deposit.cardCheckout.title')}
                    </DialogTitle>
                    <p className="text-[12px] text-content-faint font-normal">
                      {t('modals.deposit.cardCheckout.subtitle')}
                    </p>
                  </DialogHeader>
                </div>

                <div className="space-y-1 mt-3">
                  {cardLink && <MethodRow
                    icon={ExternalLink}
                    name={t('modals.deposit.cardCheckout.external.name')}
                    desc={t('modals.deposit.cardCheckout.external.desc')}
                    badge={t('modals.deposit.instant')}
                    onClick={openExternalCardPay}
                  />}
                  <MethodRow
                    icon={CreditCard}
                    name={t('modals.deposit.cardCheckout.internal.name')}
                    desc={t('modals.deposit.cardCheckout.internal.desc')}
                    badge={t('modals.deposit.instant')}
                    onClick={openInternalCardPay}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
      <CardDepositModal isOpen={isCardModalOpen} setIsOpen={setIsCardModalOpen} />
      <CryptoDepositModal isOpen={isCryptoModalOpen} setIsOpen={setIsCryptoModalOpen} />
    </>
  );
};

export default MakeDepositModal;
