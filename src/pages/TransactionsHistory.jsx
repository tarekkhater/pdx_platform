import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Inbox, Loader2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import TransactionRow, { Amount, StatusPill } from '@/components/TransactionRow';
import { fetchTransactions } from '@/services/account.service';
import { useDateFormat } from '@/hooks/use-date-format';

const TABS = [
  { id: 'deposits', incoming: true },
  { id: 'withdrawals', incoming: false },
];

const money = (n) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const total = (rows, status) =>
  rows.filter((tx) => tx.status === status).reduce((sum, tx) => sum + tx.amount, 0);

const TransactionsHistory = () => {
  const { t } = useTranslation();
  const formatDate = useDateFormat();
  const [activeTab, setActiveTab] = useState('deposits');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const incoming = activeTab === 'deposits';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const result = await fetchTransactions({ type: incoming ? 'deposit' : 'withdrawal' });
      if (cancelled) return;
      setRows(result.ok ? result.transactions : []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [incoming]);

  /**
   * Approved and pending kept apart, because they are different money: one is
   * in the account and one is a promise. A single total would hide that.
   */
  const totals = [
    {
      id: incoming ? 'deposited' : 'withdrawn',
      value: money(total(rows, 'approved')),
      tone: incoming ? 'text-gain' : 'text-content',
    },
    { id: 'pending', value: money(total(rows, 'pending')), tone: 'text-yellow-600 dark:text-yellow-400' },
    { id: 'count', value: String(rows.length) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      <PageHeader title={t('accountSheet.transactionsHistory')} backOnMobileOnly />

      {/* Underline tabs, matching the asset picker and the positions list.
          The labels used to read "Deposit Transactions" on a page already
          titled Transactions History, and wrapped onto two lines. */}
      <div className="flex items-stretch gap-5 border-b border-hairline">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative pb-2 text-[14px] transition-colors ${
                isActive ? 'font-semibold text-content' : 'font-medium text-content-faint hover:text-content-muted'
              }`}
            >
              {t(`transactions.${tab.id}`)}
              {isActive && (
                <motion.span
                  layoutId="txTabUnderline"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-yellow-500"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="hidden lg:grid grid-cols-3 gap-px bg-hairline rounded-xl border border-hairline overflow-hidden">
        {totals.map((stat) => (
          <div key={stat.id} className="bg-surface-raised px-4 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-content-faint leading-tight">
              {t(`transactions.summary.${stat.id}`)}
            </p>
            <p className={`mt-0.5 text-[16px] font-bold font-tabular leading-tight ${stat.tone || 'text-content'}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="rounded-xl border border-hairline bg-surface-raised px-4 py-10 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-content-faint" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-hairline bg-surface-raised px-4 py-10 flex flex-col items-center text-center">
          <Inbox className="w-7 h-7 text-content-faint mb-2" strokeWidth={1.6} />
          <p className="text-[13px] text-content-muted">{t('transactions.empty')}</p>
        </div>
      ) : (
        <>
          {/* Mobile: one row per transaction — direction icon, what and when
              on the left, how much and its state on the right. The old card
              spelled out "Amount", "Notes" and "Date" as labels on every
              single entry. */}
          <div className="lg:hidden rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden">
            {rows.map((tx, i) => (
              <TransactionRow key={tx.id} tx={tx} incoming={incoming} index={i} />
            ))}
          </div>

          {/* Desktop keeps a table — it is the right shape once there is room
              for the notes column. */}
          <div className="hidden lg:block rounded-xl bg-surface-raised border border-hairline overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-hairline">
                  {['type', 'amount', 'notes', 'date', 'status'].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-content-faint"
                    >
                      {t(`transactions.columns.${col}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {rows.map((tx, i) => (
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
                      <Amount amount={tx.amount} incoming={incoming} />
                    </td>
                    <td className="px-4 py-2.5 text-[13px] text-content-muted">{tx.notes}</td>
                    {/* The date arrives as ISO and is rendered in the reader's
                        language, which a preformatted string cannot be. */}
                    <td className="px-4 py-2.5 text-[13px] text-content-muted font-tabular">{formatDate(tx.date)}</td>
                    <td className="px-4 py-2.5">
                      <StatusPill status={tx.status} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default TransactionsHistory;
