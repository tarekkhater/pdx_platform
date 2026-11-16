import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Settings, Check, History, Award, LogOut, ChevronRight } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import SettingsSheet from '@/components/SettingsSheet';
import { useTrading } from '@/context/TradingContext';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useLogout } from '@/hooks/use-logout';
import { accountTone } from '@/config/brand';
import { useAccount } from '@/context/AccountContext';

const SECTION = 'px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-faint';
const CARD = 'rounded-xl bg-surface border border-hairline divide-y divide-hairline overflow-hidden';

const fmt = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AccountSheet = ({ isOpen, onClose, account: override }) => {
  const { t } = useTranslation();
  // On a phone this is a sheet thrown up from the bottom edge; on a desktop it
  // is a menu dropped from the badge that opened it, in the top right. Same
  // content, but sliding a 400px panel up from the bottom of a 1500px window
  // reads as the wrong gesture entirely.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  // The live account comes from context so the badge, the sheet and the top
  // bar can never disagree about which account is open.
  const { account: contextAccount } = useTrading();
  const { balance: BALANCE } = useAccount();
  const account = override || contextAccount;
  const navigate = useNavigate();
  const logout = useLogout();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Which Settings screen to land on. Nothing here deep-links any more, but
  // SettingsSheet still takes the prop, so keep passing null for the top level.
  const [settingsPanel, setSettingsPanel] = useState(null);

  const goTo = (path) => () => {
    onClose();
    navigate(path);
  };

  const openSettings = (panel = null) => () => {
    setSettingsPanel(panel);
    setIsSettingsOpen(true);
  };

  const notImplemented = () =>
    toast({
      title: t('notifications.notImplementedTitle'),
      description: t('notifications.notImplementedDesc'),
    });

  // Trade Station, Trading History, Market, and Wallets already live one tap
  // away in the bottom nav, and My Profile lives inside Settings — only the
  // two pages without another mobile entry point stay listed here.
  const stats = [
    {
      id: 'pnl',
      label: t('wallets.pnl'),
      value: fmt(BALANCE.pnl),
      tone: BALANCE.pnl > 0 ? 'text-gain' : BALANCE.pnl < 0 ? 'text-loss' : 'text-content-muted',
    },
    { id: 'margin', label: t('wallets.margin'), value: fmt(BALANCE.margin) },
    { id: 'freeMargin', label: t('wallets.freeMargin'), value: fmt(BALANCE.freeMargin) },
    { id: 'freeMarginPercent', label: t('wallets.freeMarginPercent'), value: `${BALANCE.freeMarginPercent.toFixed(2)}%` },
    { id: 'equity', label: t('wallets.equity'), value: fmt(BALANCE.equity) },
    { id: 'credit', label: t('wallets.credit'), value: fmt(BALANCE.credit) },
  ];

  const menu = [
    { id: 'transactions', label: t('accountSheet.transactionsHistory'), icon: History, onClick: goTo('/transactions') },
    { id: 'certificates', label: t('accountSheet.certificates'), icon: Award, onClick: goTo('/certificates') },
    { id: 'settings', label: t('accountSheet.settings'), icon: Settings, onClick: openSettings() },
  ];

  const panelMotion = isDesktop
    ? {
        hidden: { opacity: 0, scale: 0.96, y: -10 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: {
            type: 'spring',
            stiffness: 480,
            damping: 34,
            staggerChildren: 0.035,
            delayChildren: 0.04,
          },
        },
        exit: { opacity: 0, scale: 0.97, y: -8, transition: { duration: 0.15 } },
      }
    : {
        hidden: { y: '100%' },
        visible: { y: 0, transition: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 } },
        exit: { y: '100%', transition: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.25 } },
      };

  // Sections arrive one after another under the pointer on desktop. On a
  // phone the panel itself is the movement, so these stay deliberately empty
  // rather than adding a second animation on top of the slide.
  const section = isDesktop
    ? {
        hidden: { opacity: 0, y: -6 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 520, damping: 36 } },
        exit: { opacity: 0 },
      }
    : { hidden: {}, visible: {}, exit: {} };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={onClose}
              className="fixed inset-0 z-[60] bg-black/60 lg:bg-black/25"
            />
            <motion.div
              variants={panelMotion}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={isDesktop ? { transformOrigin: 'top right' } : undefined}
              className="fixed inset-x-0 bottom-0 z-[61] max-h-[88vh] overflow-y-auto custom-scrollbar bg-surface-raised rounded-t-2xl border-t border-hairline sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[400px] sm:rounded-2xl sm:border lg:top-[53px] lg:bottom-auto lg:max-h-[calc(100vh-69px)] lg:shadow-2xl lg:shadow-black/50"
            >
              <motion.div variants={section} className="flex items-start justify-between gap-3 px-4 pt-4 pb-3">
                <div className="min-w-0">
                  <h2 className="text-[17px] font-bold text-yellow-500 leading-tight truncate">
                    {account.name}
                  </h2>
                  <p className="text-[12px] text-content-faint mt-0.5 truncate">
                    {t('accountSheet.profileSubtitle')}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex-shrink-0 w-7 h-7 -mr-1 flex items-center justify-center rounded-lg text-content-muted hover:text-content hover:bg-overlay transition-colors"
                >
                  <X className="w-[18px] h-[18px]" />
                </button>
              </motion.div>

              {/* Account figures, three to a row. They were removed earlier for
                  taking half the sheet as full-width rows; at this size they
                  fit above the account list without crowding it. */}
              <motion.div variants={section} className="px-4 pb-3">
                <div className="grid grid-cols-3 gap-1.5">
                  {stats.map((stat) => (
                    <div key={stat.id} className="rounded-lg border border-hairline bg-surface px-2 py-1.5">
                      <p className="text-[9.5px] uppercase tracking-wide text-content-faint leading-tight truncate">
                        {stat.label}
                      </p>
                      <p className={`text-[12px] font-semibold font-tabular mt-0.5 truncate ${stat.tone || 'text-content'}`}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={section} className="px-4 pb-3">
                <p className={SECTION}>{t('accountSheet.myAccounts')}</p>
                {/* The live account reads as a selectable row: type badge,
                    name over number, and the accent tick marking the one in
                    use. The old card had a rotated side-strip and a drawn
                    credit-card glyph that said nothing about the account. */}
                <div className={CARD}>
                  <button
                    onClick={notImplemented}
                    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-overlay transition-colors"
                  >
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-white text-[9px] font-bold tracking-wider ${accountTone(account.type)}`}>
                      {account.type}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] text-content truncate">
                        {t('accountSheet.accountName')}
                      </span>
                      <span className="block text-[11.5px] text-content-faint font-tabular truncate">
                        {account.number}
                      </span>
                    </span>
                    <Check className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  </button>
                </div>
              </motion.div>

              <motion.div variants={section} className="px-4 pb-4">
                <div className={CARD}>
                  {menu.map(({ id, label, icon: Icon, onClick }) => (
                    <button
                      key={id}
                      onClick={onClick || notImplemented}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-overlay transition-colors"
                    >
                      <Icon className="w-[17px] h-[17px] text-content-muted flex-shrink-0" strokeWidth={1.8} />
                      <span className="flex-1 text-[14px] text-content">{label}</span>
                      <ChevronRight className="w-4 h-4 text-content-faint flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </motion.div>

              <motion.div variants={section} className="px-4 pb-6 lg:pb-4">
                <button
                  onClick={() => logout(onClose)}
                  className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border border-hairline bg-surface text-[14px] font-semibold text-loss hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('settings.logOut')}
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <SettingsSheet
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        accountName={account.name}
        initialPanel={settingsPanel}
      />
    </>
  );
};

export default AccountSheet;
