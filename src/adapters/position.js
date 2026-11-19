/**
 * Backend trade → the position, pending order and closed trade shapes the
 * interface renders.
 *
 * One field deserves a warning before anything else:
 *
 *   backend `amount`       = contract size, the units in one lot
 *   interface `amount`     = notional exposure in account currency
 *
 * They are not the same number and they are not close. `amount` is the
 * multiplier in the server's P&L formula, so reading a notional value into it
 * inflates every profit and loss on the platform by a factor of thousands.
 * Nothing below assigns one to the other.
 */

const num = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** First field the API actually sent — `total` is pagination, not margin. */
const firstNum = (...values) => {
  for (const value of values) {
    if (value == null || value === '') continue;
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
};

const toIso = (value) => {
  if (!value) return null;
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const sideOf = (trade) => {
  const raw = String(trade?.direction ?? trade?.type ?? '').toLowerCase();
  return raw === 'sell' || raw === 'short' ? 'SELL' : 'BUY';
};

/** The asset id a trade is quoted in, wherever the backend attached it. */
export const currencyIdOf = (trade) => {
  const currency = trade?.currency;
  if (currency && typeof currency === 'object') return currency.id ?? currency.currency_id ?? null;
  if (currency != null && typeof currency !== 'object') return currency;
  return trade?.currency_id ?? trade?.asset_id ?? null;
};

/**
 * How long until this position may be closed.
 *
 * The broker enforces a minimum holding time and the server is the authority;
 * these fields are what it sends back. Without them the close button looks
 * available and fails on press.
 */
const closeStateOf = (trade) => ({
  canClose: trade?.can_close !== false && trade?.can_close !== 0 && trade?.can_close !== '0',
  remainingSeconds: num(trade?.close_remaining_seconds, 0),
  availableAt: toIso(trade?.close_available_at),
  minCloseHours: num(trade?.min_close_hours, 0),
});

/**
 * @param trade     the backend row
 * @param symbolOf  id → symbol, from InstrumentsContext
 */
export const toPosition = (trade = {}, symbolOf = () => null) => {
  const currencyId = currencyIdOf(trade);
  const entryPrice = num(trade.opening_price ?? trade.open_price);
  const lots = firstNum(trade.lot, trade.qty);
  // contract size = `amount`, the multiplier the SERVER uses (Position::calculateFloatingProfit) and
  // the one the CRM shows. Not amount_user_pnl: the server ignores it, so reading it here made the
  // platform's P&L differ from the CRM and from what a close pays whenever it was edited.
  const contractSize = firstNum(trade.amount, trade.amount_user_pnl) || 1;
  const tradeAmount = firstNum(trade.trade_amount) || lots * contractSize * entryPrice;
  const margin = firstNum(trade.margin) || (num(trade.leverage) > 0 ? tradeAmount : 0);

  return {
    id: trade.id ?? trade._id ?? null,
    positionId: String(trade.id ?? ''),
    currencyId,
    asset: symbolOf(currencyId) ?? trade.currency?.sym ?? trade.symbol ?? trade.currency?.name ?? '',
    side: sideOf(trade),
    leverage: num(trade.leverage, 1) || 1,
    lots,
    contractSize,
    entryPrice,
    // Filled in from the live feed by the trading context, not from the row:
    // a REST response is already out of date by the time it renders.
    currentPrice: 0,
    amount: tradeAmount,
    margin,
    spread: firstNum(trade.spread),
    commission: firstNum(trade.com, trade.commission, trade.paid_com),
    // overnight fee so far (negative when charged); part of the P&L, like on the server
    swap: firstNum(trade.swap),
    // quote currency -> USD as the server values it (yen pairs); the P&L uses this so it matches the
    // CRM and the close to the cent instead of a live rate that can differ slightly
    quoteToUsd: firstNum(trade.quote_to_usd),
    pnl: 0,
    stopLoss: firstNum(trade.stop_loss) || null,
    takeProfit: firstNum(trade.take_profit) || null,
    openedAt: toIso(trade.open_at ?? trade.created_at),
    closeState: closeStateOf(trade),
  };
};

export const toPendingOrder = (trade = {}, symbolOf = () => null) => {
  const currencyId = currencyIdOf(trade);
  const lots = firstNum(trade.lot, trade.qty);
  const contractSize = firstNum(trade.amount, trade.amount_user_pnl) || 1;
  const targetPrice = firstNum(trade.pendingOrder, trade.pending_order, trade.opening_price);
  const tradeAmount = firstNum(trade.trade_amount) || lots * contractSize * targetPrice;

  return {
    id: trade.id ?? null,
    orderId: String(trade.id ?? ''),
    currencyId,
    asset: symbolOf(currencyId) ?? trade.currency?.sym ?? trade.symbol ?? '',
    side: sideOf(trade),
    lots,
    contractSize,
    leverage: num(trade.leverage, 1) || 1,
    targetPrice,
    /**
     * The market price when the order was accepted. The interface used it to
     * decide which way the market had to move; the server owns that decision
     * now, and it is kept only so the row can show what the market was doing
     * when the order was placed.
     */
    placedPrice: num(trade.opening_price ?? trade.open_price),
    amount: tradeAmount,
    margin: firstNum(trade.margin) || (num(trade.leverage) > 0 ? tradeAmount : 0),
    stopLoss: firstNum(trade.stop_loss) || null,
    takeProfit: firstNum(trade.take_profit) || null,
    placedAt: toIso(trade.created_at ?? trade.open_at),
    status: 'working',
  };
};

/**
 * Closed trades.
 *
 * `swap` and `closeReason` have no column server-side. Rather than invent
 * them, swap is zero and the reason is null, and the interface hides those
 * cells instead of labelling a liquidation as a manual close.
 */
export const toClosedTrade = (trade = {}, symbolOf = () => null) => {
  const currencyId = currencyIdOf(trade);
  const lots = firstNum(trade.lot, trade.qty);
  const contractSize = firstNum(trade.amount, trade.amount_user_pnl) || 1;
  const entryPrice = num(trade.opening_price ?? trade.open_price);
  const pnl = firstNum(trade.profit, trade.net_profit, trade.pnl);
  const commission = firstNum(trade.com, trade.commission, trade.paid_com);
  const tradeAmount = firstNum(trade.trade_amount) || lots * contractSize * entryPrice;

  return {
    id: trade.id ?? null,
    positionId: String(trade.id ?? ''),
    currencyId,
    asset: symbolOf(currencyId) ?? trade.currency?.sym ?? trade.symbol ?? '',
    side: sideOf(trade),
    leverage: num(trade.leverage, 1) || 1,
    lots,
    contractSize,
    entryPrice,
    exitPrice: firstNum(trade.closed_price, trade.closing_price, trade.close_price, trade.current_price),
    amount: tradeAmount,
    margin: firstNum(trade.margin) || (num(trade.leverage) > 0 ? tradeAmount : 0),
    // Net is what the broker booked; gross is backed out of it so the two
    // columns cannot contradict each other.
    grossPnl: Number((pnl - commission).toFixed(2)),
    swap: firstNum(trade.swap),
    commission,
    pnl,
    stopLoss: firstNum(trade.stop_loss) || null,
    takeProfit: firstNum(trade.take_profit) || null,
    openedAt: toIso(trade.open_at ?? trade.created_at),
    closedAt: toIso(trade.close_at ?? trade.updated_at),
    closeReason: trade.close_reason ?? null,
  };
};

/**
 * Order ticket → the create payload.
 *
 * `total` is the margin. The server recomputes it, but it is sent because the
 * previous client did and the endpoint's validation expects the field.
 */
export const fromOrderTicket = ({
  symbol,
  side,
  entryPrice,
  lots,
  contractSize,
  leverage,
  margin,
  spread,
  stopLoss,
  takeProfit,
  pendingPrice,
}) => {
  const direction = String(side).toLowerCase() === 'sell' ? 'sell' : 'buy';
  return {
    symbol,
    direction,
    type: direction,
    price: entryPrice,
    opening_price: entryPrice,
    lot: Number(Number(lots).toFixed(6)),
    amount: contractSize,
    total: margin,
    leverage,
    spread,
    take_profit: takeProfit || 0,
    stop_loss: stopLoss || 0,
    pendingOrder: pendingPrice || 0,
  };
};
