import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowDownLeft, ArrowUpRight, CreditCard, Landmark, Bitcoin, Gift } from 'lucide-react';

// The rail the money travelled on. The circle keeps the direction tint; the
// glyph inside says how it moved.
const TYPE_ICON = {
  card: CreditCard,
  wire: Landmark,
  bank: Landmark,
  crypto: Bitcoin,
  credit: Gift,
};

const STATUS_CLASS = {
  approved: 'bg-emerald-500/15 text-gain',
  success: 'bg-emerald-500/15 text-gain',
  pending: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  rejected: 'bg-red-500/15 text-loss',
};

export const statusClass = (s) => STATUS_CLASS[s] || 'bg-overlay-strong text-content-muted';

export const money = (n) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const Amount = ({ amount, incoming }) => (
  <span className={`text-[14px] font-semibold font-tabular ${incoming ? 'text-gain' : 'text-loss'}`}>
    {incoming ? '+' : '−'}
    {money(amount)}
  </span>
);

export const StatusPill = ({ status }) => {
  const { t } = useTranslation();
  return (
    <span
      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusClass(status)}`}
    >
      {t(`transactions.status.${status}`, status)}
    </span>
  );
};

/**
 * One transaction. Shared by the wallet's recent list and the full history, so
 * the same payment cannot look like two different things on two screens.
 */
const TransactionRow = ({ tx, incoming, index = 0 }) => {
  const { t } = useTranslation();
  const flowsIn = incoming ?? tx.incoming;
  const Icon = TYPE_ICON[tx.type] || (flowsIn ? ArrowDownLeft : ArrowUpRight);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-start gap-3 px-3.5 py-2.5"
    >
      <span
        className={`w-8 h-8 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 ${
          flowsIn ? 'bg-emerald-500/10 text-gain' : 'bg-red-500/10 text-loss'
        }`}
      >
        <Icon className="w-4 h-4" strokeWidth={2} />
      </span>

      <span className="flex-1 min-w-0">
        <span className="block text-[14px] text-content leading-snug">
          {t(`transactions.types.${tx.type}`, tx.type)}
        </span>
        {tx.notes && (
          <span className="block text-[11.5px] text-content-muted leading-snug break-words">
            {tx.notes}
          </span>
        )}
        <span className="block text-[11px] text-content-faint font-tabular leading-snug">{tx.date}</span>
      </span>

      <span className="flex flex-col items-end gap-1 flex-shrink-0">
        <Amount amount={tx.amount} incoming={flowsIn} />
        <StatusPill status={tx.status} />
      </span>
    </motion.div>
  );
};

export default TransactionRow;
