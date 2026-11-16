import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CandlestickChart, Wallet, LayoutGrid, ListOrdered } from 'lucide-react';
import { useTrading } from '@/context/TradingContext';
import AccountSheet from '@/components/AccountSheet';
import AccountChip, { AccountPnl } from '@/components/AccountChip';

const TopBar = () => {
  const { t } = useTranslation();
  const { account } = useTrading();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const tabs = [
    { to: '/wallets', label: t('topBar.wallets'), icon: Wallet },
    { to: '/', label: t('topBar.trade'), icon: CandlestickChart, end: true },
    { to: '/market', label: t('topBar.markets'), icon: LayoutGrid },
    { to: '/trades', label: t('topBar.trades'), icon: ListOrdered, badge: account.openPositions },
  ];

  return (
    <>
      {/* Bottom bar on mobile: navigation sits under the thumb, not up by the
          camera notch. Fixed rather than sticky so it never drifts when a page
          scrolls past its container. */}
      <div className="lg:hidden chrome-bar border-t border-hairline fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch h-11 px-1.5">
          <div className="flex items-stretch justify-start gap-0.5">
            {tabs.map(({ to, label, icon: Icon, badge, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center w-12 gap-px transition-colors ${
                    isActive ? 'text-content' : 'text-content-faint'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="relative">
                      <motion.span
                        animate={{ scale: isActive ? 1.12 : 1 }}
                        transition={{ type: 'spring', stiffness: 460, damping: 26 }}
                        className="block"
                      >
                        <Icon className="w-4 h-4" strokeWidth={1.9} />
                      </motion.span>
                      {badge > 0 && (
                        <span className="absolute -top-1 -right-2 min-w-[13px] h-[13px] px-1 rounded-full bg-yellow-600 text-black text-[8px] font-bold flex items-center justify-center font-tabular">
                          {badge}
                        </span>
                      )}
                    </span>
                    <span className="text-[8px] font-semibold uppercase tracking-wider">{label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="mobileNavIndicator"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                        className="absolute left-1 right-1 top-0 h-0.5 bg-yellow-500 rounded-full"
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          <div className="pl-1 pr-1.5 ml-auto flex items-center">
            <AccountPnl />
          </div>

          <AccountChip onClick={() => setIsAccountOpen(true)} />
        </div>
      </div>

      <AccountSheet isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
    </>
  );
};

export default TopBar;
