/**
 * Sizing an order, using the server's arithmetic.
 *
 *   entry  = mid ± spread%              buy above the mid, sell below it
 *   margin = lots × contractSize × entry ÷ leverage
 *
 * The interface previously had two different margin formulas depending on
 * whether the trader typed lots or dollars, and neither used contract size.
 * There is one formula here and both input modes resolve to it.
 */

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/**
 * Ticket size as typed — Arabic/Persian digits and `,` / `٫` decimals have
 * to become a western `0.01` before parseFloat, or the box reads as `001.`
 * and the order is rejected as an invalid lot.
 */
export const normalizeLotString = (raw) =>
  String(raw ?? '')
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٫,]/g, '.');

export const parseLotInput = (raw) => {
  const normalized = normalizeLotString(raw);
  if (!normalized || normalized === '.') return NaN;
  // RTL leftover: typing 0.01 in a right-to-left box lands as "001."
  // Keep the zeros that belong after the decimal ("001." → 0.01, not 0.1).
  if (/^0+\d+\.$/.test(normalized)) {
    const recovered = Number.parseFloat(`0.${normalized.slice(1, -1)}`);
    return Number.isFinite(recovered) && recovered > 0 ? recovered : NaN;
  }
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
};

export const isLotInputPartial = (raw) => {
  const normalized = normalizeLotString(raw);
  if (normalized === '' || normalized === '.') return true;
  if (/^0+\d+\.$/.test(normalized)) return false;
  return /\.$/.test(normalized);
};

/** Lots keep three decimals (0.001); USD stays two. */
export const formatTicketSize = (value, unit = 'lots') => {
  const n = Number(value);
  if (unit === 'USD') return (Number.isFinite(n) ? n : 0).toFixed(2);
  if (!Number.isFinite(n) || n <= 0) return '0.001';
  return String(Number(n.toFixed(3)));
};

/** Which side of the book the order crosses. */
export const getEntryPrice = (side, mid, instrument) => {
  const price = num(mid);
  if (!(price > 0)) return 0;
  const isSell = String(side).toLowerCase() === 'sell';
  const spread = isSell ? num(instrument?.sellSpread) : num(instrument?.buySpread);
  const delta = (spread / 100) * price;
  const quoted = isSell ? price - delta : price + delta;
  return quoted > 0 ? Number(quoted.toFixed(8)) : 0;
};

/** The spread percentage that applies to a side, stored on the trade. */
export const getSpreadPercent = (side, instrument) =>
  String(side).toLowerCase() === 'sell' ? num(instrument?.sellSpread) : num(instrument?.buySpread);

export const computeMargin = ({ lots, contractSize, entryPrice, leverage }) => {
  const size = num(contractSize, 1) || 1;
  const lev = num(leverage, 1) > 0 ? num(leverage, 1) : 1;
  const price = num(entryPrice);
  const quantity = num(lots);
  if (!(price > 0) || !(quantity > 0)) return 0;
  const raw = (quantity * size * price) / lev;
  const rounded = Number(raw.toFixed(3));
  // `total` is validated `gt:0`. A 0.01 lot on a cheap pair rounds to 0.00
  // at two decimals and the server refuses the ticket.
  return rounded > 0 ? rounded : Number(raw.toFixed(6));
};

export const computeNotional = ({ lots, contractSize, entryPrice }) =>
  Number((num(lots) * (num(contractSize, 1) || 1) * num(entryPrice)).toFixed(2));

/**
 * The inverse, for the "amount in USD" input: the trader names the margin
 * they want to commit and the ticket works out how many lots that buys.
 */
export const lotsForMargin = ({ margin, contractSize, entryPrice, leverage }) => {
  const size = num(contractSize, 1) || 1;
  const lev = num(leverage, 1) > 0 ? num(leverage, 1) : 1;
  const price = num(entryPrice);
  if (!(price > 0)) return 0;
  return (num(margin) * lev) / (size * price);
};

/**
 * Stop loss and take profit as the server stores them.
 *
 * The backend closes by floating P&L, not by price:
 *   take_profit  → close when profit >= amount
 *   stop_loss    → close when profit <= -amount
 * Both fields are therefore a positive dollar threshold, and a price the
 * trader types has to become:
 *
 *   |target − entry| × contractSize × lots
 */
export const priceLevelToAmount = ({ level, entryPrice, lots, contractSize }) => {
  const target = num(level);
  const entry = num(entryPrice);
  if (!(target > 0) || !(entry > 0)) return 0;
  return Number((Math.abs(target - entry) * (num(contractSize, 1) || 1) * num(lots)).toFixed(2));
};

/**
 * The inverse: a stored dollar threshold back to a price.
 *
 * `kind` is which field it came from — stop is away from profit, take is
 * toward it — because the server stores both as a positive amount.
 */
export const amountToPriceLevel = ({ amount, entryPrice, lots, contractSize, side, kind = 'take' }) => {
  const size = (num(contractSize, 1) || 1) * num(lots);
  if (!size) return 0;
  const diff = num(amount) / size;
  const entry = num(entryPrice);
  const towardProfit = kind === 'stop' ? -diff : diff;
  return String(side).toLowerCase() === 'sell' ? entry - towardProfit : entry + towardProfit;
};
