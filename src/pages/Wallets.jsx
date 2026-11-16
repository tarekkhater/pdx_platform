import React, { useState, useEffect } from 'react';
import { motion, animate } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, TrendingUp, TrendingDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TransactionRow, { Amount, StatusPill } from '@/components/TransactionRow';
import { useAccount } from '@/context/AccountContext';
import { fetchTransactions } from '@/services/account.service';
import MakeDepositModal from '@/components/modals/MakeDepositModal';
import WithdrawalMethodsModal from '@/components/modals/WithdrawalMethodsModal';

const fmt = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Counts up to the balance on mount instead of just appearing — a small
// touch a lot of premium fintech apps use for the hero number.
const useCountUp = (target, duration = 1) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, target, { duration, ease: 'easeOut', onUpdate: setValue });
    return () => controls.stop();
  }, [target, duration]);
  return value;
};

/**
 * The wallet, in three full-width bands: what the account is worth, what it
 * is made of, and what has moved through it.
 *
 * It used to be a two-thirds balance card beside a third of recent
 * transactions, the pair capped at 1024px — so on a desktop the right-hand
 * third of the window was empty and the transaction list was a cramped column
 * four rows tall. Bands use the width they are given, and the deposit and
 * withdraw controls get the prominence they had to fight the layout for.
 */
const Wallets = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const { balance: balanceData } = useAccount();
  const animatedBalance = useCountUp(balanceData.balance);

  /**
   * Both directions, newest first. Two requests rather than one because the
   * endpoint separates them by type and the row's direction cannot be read
   * off the record — the amount is positive either way.
   */
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [deposits, withdrawals] = await Promise.all([
        fetchTransactions({ type: 'deposit' }),
        fetchTransactions({ type: 'withdrawal' }),
      ]);
      if (cancelled) return;
      setRecent(
        [...(deposits.transactions || []), ...(withdrawals.transactions || [])]
          .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
          .slice(0, 7)
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Today's P&L against the balance it opened from.
  const pnlPercent = () => {
    const base = balanceData.balance - balanceData.pnl;
    return base === 0 ? 0 : (balanceData.pnl / base) * 100;
  };

  const stats = [
    { id: 'pnl', label: t('wallets.pnl'), value: fmt(balanceData.pnl), color: balanceData.pnl > 0 ? 'text-gain' : balanceData.pnl < 0 ? 'text-loss' : 'text-content-muted' },
    { id: 'margin', label: t('wallets.margin'), value: fmt(balanceData.margin) },
    { id: 'freeMargin', label: t('wallets.freeMargin'), value: fmt(balanceData.freeMargin) },
    { id: 'freeMarginPercent', label: t('wallets.freeMarginPercent'), value: `${balanceData.freeMarginPercent.toFixed(2)}%` },
    { id: 'equity', label: t('wallets.equity'), value: fmt(balanceData.equity) },
    { id: 'credit', label: t('wallets.credit'), value: fmt(balanceData.credit) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <h1 className="text-lg sm:text-xl font-bold text-content">{t('wallets.title')}</h1>

      {/* Balance and the two things you can do about it. The buttons were a
          pair of small red and green chips wedged into the corner; deposit is
          the primary action on this page and now looks like it. */}
      <div className="relative rounded-xl p-4 lg:p-5 overflow-hidden border border-hairline bg-surface-raised dark:bg-[#0a0b0d]">
        <div className="hidden dark:block absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[12px] text-content-faint tracking-wide">{t('wallets.balance')}</p>
              <button
                onClick={() => setShowBalance((v) => !v)}
                className="text-content-faint hover:text-content-muted transition-colors"
              >
                {showBalance ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              </button>
            </div>

            <p className="text-[28px] sm:text-[34px] leading-none font-extrabold font-tabular tracking-tight mt-1 text-content dark:bg-gradient-to-b dark:from-white dark:to-yellow-100/80 dark:bg-clip-text dark:text-transparent">
              {showBalance ? fmt(animatedBalance) : '••••••'}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <span
                className={`flex items-center gap-1 text-[11px] font-semibold font-tabular px-1.5 py-0.5 rounded-full border ${
                  balanceData.pnl > 0
                    ? 'text-gain bg-emerald-500/10 border-emerald-500/20'
                    : balanceData.pnl < 0
                    ? 'text-loss bg-red-500/10 border-red-500/20'
                    : 'text-content-muted bg-overlay border-hairline'
                }`}
              >
                {balanceData.pnl > 0 ? <TrendingUp className="w-3 h-3" /> : balanceData.pnl < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                {showBalance
                  ? `${t('wallets.todayPnl')} ${balanceData.pnl >= 0 ? '+' : ''}${fmt(balanceData.pnl)} (${
                      balanceData.pnl >= 0 ? '+' : ''
                    }${pnlPercent().toFixed(2)}%)`
                  : '••••••'}
              </span>
            </div>
          </div>

          {/* Deposit carries the accent, withdraw is outlined: money coming in
              is the action the page is for, money going out is the one that
              should not be hit by accident. */}
          <div className="flex gap-2 flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsDepositOpen(true)}
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 h-9 lg:h-10 px-4 lg:px-6 rounded-lg bg-yellow-500 hover:bg-yellow-400 text-black font-semibold text-[13px] lg:text-[13.5px] transition-colors"
            >
              <ArrowDownToLine className="w-4 h-4" /> {t('wallets.deposit')}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsWithdrawOpen(true)}
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 h-9 lg:h-10 px-4 lg:px-6 rounded-lg border border-hairline bg-surface hover:bg-overlay text-content font-semibold text-[13px] lg:text-[13.5px] transition-colors"
            >
              <ArrowUpFromLine className="w-4 h-4" /> {t('wallets.withdraw')}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Account figures, one band across the page rather than a 2x3 block
          squeezed under the balance. */}
      <h2 className="lg:hidden text-[11px] font-semibold text-content-faint uppercase tracking-widest">
        {t('wallets.account')}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 lg:gap-2">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="rounded-lg lg:rounded-xl border border-hairline bg-overlay lg:bg-surface-raised px-2.5 py-2 lg:px-3 lg:py-2.5"
          >
            <p className="text-[10px] text-content-faint leading-tight truncate lg:font-semibold lg:uppercase lg:tracking-wider">
              {stat.label}
            </p>
            <p className={`text-[13px] lg:text-[15px] font-bold font-tabular mt-0.5 lg:mt-1 truncate ${stat.color || 'text-content'}`}>
              {showBalance ? stat.value : '••••'}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Recent movements. Every row used to be drawn as a green "Deposit"
          regardless of what it actually was, from a list that did not match
          the transactions page. Both now read the same data. */}
      <div className="rounded-xl border border-hairline bg-surface-raised overflow-hidden">
        <button
          onClick={() => navigate('/transactions')}
          className="w-full flex items-center gap-2 px-4 py-2.5 border-b border-hairline text-left hover:bg-overlay transition-colors"
        >
          <h2 className="flex-1 text-[11px] font-semibold text-content-faint uppercase tracking-widest">
            {t('wallets.recentTransactions')}
          </h2>
          <span className="text-[11.5px] text-content-muted">{t('wallets.viewAll')}</span>
          <ChevronRight className="w-4 h-4 text-content-faint" />
        </button>

        {/* Phone: one row per movement. Desktop: the same rows as a table,
            which is the right shape once there is room for the notes. */}
        <div className="lg:hidden divide-y divide-hairline">
          {recent.slice(0, 4).map((tx, i) => (
            <TransactionRow key={tx.id} tx={tx} index={i} />
          ))}
        </div>

        <table className="hidden lg:table w-full text-left">
          <thead>
            <tr className="border-b border-hairline">
              {['type', 'amount', 'notes', 'date', 'status'].map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-content-faint"
                >
                  {t(`transactions.columns.${col}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {recent.map((tx, i) => (
              <motion.tr
                key={tx.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="hover:bg-overlay transition-colors"
              >
                <td className="px-4 py-2.5 text-[14px] text-content">
                  {t(`transactions.types.${tx.type}`, tx.type)}
                </td>
                <td className="px-4 py-2.5">
                  <Amount amount={tx.amount} incoming={tx.incoming} />
                </td>
                <td className="px-4 py-2.5 text-[13px] text-content-muted">{tx.notes}</td>
                <td className="px-4 py-2.5 text-[13px] text-content-muted font-tabular">{tx.date}</td>
                <td className="px-4 py-2.5">
                  <StatusPill status={tx.status} />
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <MakeDepositModal isOpen={isDepositOpen} setIsOpen={setIsDepositOpen} />
      <WithdrawalMethodsModal isOpen={isWithdrawOpen} setIsOpen={setIsWithdrawOpen} />
    </motion.div>
  );
};

export default Wallets;
