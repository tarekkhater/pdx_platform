import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { Bell } from 'lucide-react';
import AccountSheet from '@/components/AccountSheet';
import NotificationsSheet from '@/components/NotificationsSheet';
import AccountChip, { AccountPnl } from '@/components/AccountChip';
import BrandMark from '@/components/BrandMark';

const Header = () => {
  const { t } = useTranslation();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // The four places a trader actually moves between. Transactions History and
  // Certificates are account paperwork, not navigation — they live in the
  // account menu, which is where the phone has always kept them.
  const navLinks = [
    { to: '/wallets', label: t('topBar.wallets') },
    { to: '/', label: t('header.nav.tradeStation') },
    { to: '/trades', label: t('header.nav.tradingHistory') },
    { to: '/market', label: t('header.nav.market') },
  ];

  return (
    <>
      <header className="hidden lg:block sticky top-0 z-50 bg-background border-b border-hairline">
        <div className="container relative mx-auto px-4 max-w-[1920px]">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-stretch gap-8">
              <NavLink to="/" className="flex items-center gap-2 flex-shrink-0">
                <BrandMark className="w-[22px] h-[22px] rounded-[6px]" alt="" />
                <span className="text-[15px] font-bold text-content tracking-tight">
                  {t('header.title')}
                </span>
              </NavLink>
              <nav className="hidden lg:flex items-stretch gap-6">
                {navLinks.map(link => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/'}
                    className={({ isActive }) =>
                      `relative flex items-center h-12 text-[13px] transition-colors ${
                        isActive ? 'text-content font-medium' : 'text-content-faint hover:text-content-muted'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {link.label}
                        {isActive && (
                          <motion.span layoutId="nav-underline" className="absolute left-0 right-0 -bottom-px h-0.5 bg-yellow-500" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* Search and Add Funds are gone: the search box filtered nothing,
                and depositing belongs with the balance it changes, on Wallets
                and in the account sheet. What is left is what the phone
                carries — notifications, today's P&L, and the account badge. */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="relative text-content-muted hover:text-content transition-colors"
                onClick={() => setIsNotificationsOpen(true)}
                aria-label={t('notifications.title')}
              >
                <Bell className="w-5 h-5" />
              </button>

              <AccountPnl />

              <AccountChip onClick={() => setIsAccountOpen(true)} />
            </div>
          </div>
        </div>
      </header>
      <AccountSheet isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} />
      <NotificationsSheet isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
    </>
  );
};

export default Header;
