import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { toBalance, EMPTY_BALANCE } from '@/adapters/account';
import { sumPnl } from '@/domain/pnl';
import * as accountService from '@/services/account.service';
import { useTrading } from '@/context/TradingContext';

const AccountContext = createContext(null);

/** How often to re-read the server's balance. Ticks move P&L, not balance. */
const FINANCE_POLL_MS = 30_000;

/**
 * The account's money, in one place.
 *
 * There used to be three sources for the same numbers — a BALANCE constant in
 * the data folder, an ACCOUNT_BALANCE literal inside the order panel, and a
 * hardcoded pnl on the trading context's account object. They could and did
 * disagree.
 *
 * This provider sits inside TradingProvider because equity depends on the
 * open book: the server's balance is a settled figure, and the floating P&L
 * that turns it into equity only exists client-side, where the live prices
 * are.
 */
export const AccountProvider = ({ children }) => {
  const { positions } = useTrading();
  const [finance, setFinance] = useState({});
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [financeResult, walletsResult] = await Promise.all([
      accountService.fetchFinance(),
      accountService.fetchWallets(),
    ]);
    if (financeResult.ok) setFinance(financeResult.finance);
    if (walletsResult.ok) setWallets(walletsResult.wallets);
    setLoading(false);
    return financeResult;
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, FINANCE_POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  // Recomputed on every tick, because each position's pnl is.
  const livePnl = useMemo(() => sumPnl(positions), [positions]);

  const balance = useMemo(
    () => (loading && !Object.keys(finance).length ? EMPTY_BALANCE : toBalance(finance, livePnl)),
    [finance, livePnl, loading]
  );

  const value = useMemo(
    () => ({ balance, wallets, loading, refresh, raw: finance }),
    [balance, wallets, loading, refresh, finance]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export const useAccount = () => {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useAccount must be used inside an AccountProvider');
  return ctx;
};
