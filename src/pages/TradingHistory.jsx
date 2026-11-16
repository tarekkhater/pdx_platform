import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import OpenTrades from '@/components/OpenTrades';

/**
 * Positions, pending orders and closed trades — the same three tabs the trade
 * station carries, with room to read them.
 *
 * This page used to render its own card list and its own desktop table for
 * closed trades, built from a hardcoded array that had nothing to do with the
 * account: amounts as strings ("$2396.16"), timestamps as preformatted text,
 * column headers written in English whatever the language, and instruments
 * that are not in the instrument table. It disagreed with the tab's own count.
 * There is one closed-trades list now, in src/data/trades.js.
 *
 * The page carries no width cap: the rows lay themselves out proportionally,
 * so the window's width goes into the columns rather than into a margin.
 */
const TradingHistory = () => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-3"
    >
      <h1 className="text-lg sm:text-xl font-bold text-content">{t('tradingHistory.title')}</h1>
      <OpenTrades wide />
    </motion.div>
  );
};

export default TradingHistory;
