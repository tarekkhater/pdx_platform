/**
 * Open-position P&L, matching the server's formula exactly.
 *
 * The backend runs this on every tick (Position::calculateFloatingProfit) to
 * decide when a stop or a target is hit. If the interface computed it any
 * other way, a client would watch a position sit at -$40 and see it closed at
 * a stop they had set for -$50.
 *
 *   entry   = openPrice ± spread%          buy pays the offer, sell hits the bid
 *   diff    = mark − entry                 reversed for a sell
 *   pnl     = diff × contractSize × lots + commission
 *
 * `contractSize` is units per lot. It is the field that was missing from the
 * old instrument list, and leaving it at 1 prices a fractional lot of a cheap
 * instrument at fractions of a cent.
 */

const num = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const isBuy = (side) => String(side ?? '').toLowerCase() === 'buy' || String(side ?? '').toLowerCase() === 'long';

/**
 * @param position domain position: { side, lots, contractSize, entryPrice, spread, commission }
 * @param markPrice the live mid price
 */
/**
 * @param options.toUsd       quote currency → USD factor (domain/fx.js), 1 for USD-quoted pairs
 * @param options.instrument  for the exit spread: the server values a buy at mid − buySpread% and a
 *                            sell at mid + sellSpread% (Position::quotedExitPrice)
 */
export const calcPositionPnl = (position, markPrice, { toUsd = 1, instrument = null } = {}) => {
  if (!position) return 0;

  const mark = num(markPrice);
  const open = num(position.entryPrice);
  const lots = num(position.lots);
  const contractSize = num(position.contractSize, 1) || 1;

  // No quote yet is not a loss — it is an unknown, and showing 0 is honest
  // where showing a number computed from a missing price is not.
  if (!(mark > 0) || !(open > 0) || !lots) return 0;

  const spreadInPrice = (num(position.spread) / 100) * open;
  const buy = isBuy(position.side);
  const entry = buy ? open + spreadInPrice : open - spreadInPrice;

  // exit price exactly like the server: spread off the mid, truncated to 4 decimals
  let exit = mark;
  if (instrument) {
    const s = buy ? num(instrument.buySpread) : num(instrument.sellSpread);
    if (s > 0) exit = buy ? mark - (s * mark) / 100 : mark + (s * mark) / 100;
    exit = Math.floor(exit * 10000) / 10000;
  }
  const diff = buy ? exit - entry : entry - exit;
  const factor = Number(toUsd) > 0 ? Number(toUsd) : 1;

  return Number((diff * contractSize * lots * factor + num(position.commission) + num(position.swap)).toFixed(2));
};

/** Return on the margin actually committed, which is what the client risked. */
export const calcRoi = (pnl, margin) => {
  const committed = num(margin);
  return committed > 0 ? (num(pnl) / committed) * 100 : 0;
};

export const sumPnl = (positions = []) =>
  Number(positions.reduce((total, position) => total + num(position.pnl), 0).toFixed(2));
