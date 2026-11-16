
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShieldCheck, Landmark, Bitcoin, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CryptoWithdrawalModal from './CryptoWithdrawalModal';
import BankWithdrawalModal from './BankWithdrawalModal';

const WithdrawalMethodsModal = ({ isOpen, setIsOpen }) => {
  const { t } = useTranslation();
  const [view, setView] = useState('methods'); // 'methods', 'crypto', 'bank'

  const METHODS = [
    {
      key: 'crypto',
      icon: Bitcoin,
      name: t('modals.withdraw.cryptoWallet'),
      desc: t('modals.withdraw.cryptoFee'),
    },
    {
      key: 'bank',
      icon: Landmark,
      name: t('modals.withdraw.bankTransfer'),
      desc: t('modals.withdraw.bankFee'),
    },
  ];

  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setView('methods'), 300);
  };

  // Always start at the method picker, even if the dialog gets reopened
  // programmatically (e.g. the wallet page's Withdraw button) without going
  // through handleClose first.
  useEffect(() => {
    if (isOpen) setView('methods');
  }, [isOpen]);

  const renderContent = () => {
    switch (view) {
      case 'crypto':
        return <CryptoWithdrawalModal onBack={() => setView('methods')} />;
      case 'bank':
        return <BankWithdrawalModal onBack={() => setView('methods')} onSuccess={handleClose} />;
      case 'methods':
      default:
        return (
          <motion.div
            key="methods"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            transition={{ duration: 0.2 }}
          >
            <DialogHeader className="space-y-0.5">
              <DialogTitle className="text-[16px] font-bold text-content">{t('modals.withdraw.title')}</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-2 text-[11px] text-content-faint -mt-1 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              {t('modals.withdraw.verificationNotice')}
            </div>

            <div className="space-y-1">
              {METHODS.map((m) => (
                <motion.button
                  key={m.key}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setView(m.key)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-overlay transition-colors text-left"
                >
                  <span className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
                    <m.icon className="w-4 h-4 text-yellow-500" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-semibold text-[13px] text-content">{m.name}</span>
                    <span className="block text-[11px] text-content-faint mt-0.5 truncate">{m.desc}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-content-faint flex-shrink-0" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-surface-raised border-hairline text-content max-w-sm p-4 rounded-2xl">
        <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default WithdrawalMethodsModal;
