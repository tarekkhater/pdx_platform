/**
 * Backend finance → the balance figures the stats bar and wallet read.
 */

const num = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const EMPTY_BALANCE = {
  balance: 0,
  pnl: 0,
  margin: 0,
  freeMargin: 0,
  freeMarginPercent: 0,
  equity: 0,
  credit: 0,
  awaitingDeposit: 0,
};

/**
 * @param finance  the /users/Home/finance payload
 * @param livePnl  the summed P&L of open positions, which the server figure
 *                 does not carry — it is only true as of the last tick, so it
 *                 is computed client-side from live prices instead.
 */
export const toBalance = (finance = {}, livePnl = 0) => {
  const balance = num(finance.balance);
  const margin = num(finance.margin);
  const pnl = num(livePnl);

  /**
   * Equity is the balance plus what the open book is currently worth, and
   * free margin is what is left of it after the committed margin. Both are
   * derived rather than read: the server's copy is a snapshot, and a stats
   * bar that updates the P&L but not the equity beside it is visibly wrong.
   */
  const equity = balance + pnl;
  const freeMargin = equity - margin;

  return {
    balance,
    pnl,
    margin,
    equity,
    freeMargin,
    freeMarginPercent: equity > 0 ? (freeMargin / equity) * 100 : 0,
    /**
     * The previous interface labelled awaiting_deposit as "Credit" and had no
     * separate credit line. Until the backend confirms whether these are two
     * things, credit reads from a real field if one appears and otherwise
     * shows zero rather than double-counting the pending deposit.
     */
    credit: num(finance.credit ?? finance.bouns ?? finance.bonus),
    awaitingDeposit: num(finance.awaiting_deposit),
  };
};
