/**
 * Which price a position is marked at.
 *
 * The mid `rate` only — never buy_p or sell_p. The backend marks open
 * positions against the mid (see Position::calculateFloatingProfit, called
 * from the broadcast loop with the mid price), so marking them against a
 * quoted side here would put the client's P&L a spread away from the number
 * the server will actually settle on.
 */

const normalizeDirection = (directionOrTrade) => {
  const raw =
    typeof directionOrTrade === 'string'
      ? directionOrTrade
      : directionOrTrade?.direction ?? directionOrTrade?.side ?? directionOrTrade?.type;
  return String(raw ?? '').toLowerCase().trim();
};

export const isLongTrade = (directionOrTrade) => {
  const direction = normalizeDirection(directionOrTrade);
  return direction === 'buy' || direction === 'long';
};

/** The currency id a trade is quoted in, wherever the backend put it. */
export const tradeCurrencyId = (trade) => {
  const currency = trade?.currency;
  if (currency != null && typeof currency === 'object') {
    return currency.id ?? currency.currency_id ?? null;
  }
  if (currency != null && (typeof currency === 'number' || typeof currency === 'string')) {
    return currency;
  }
  return trade?.currency_id ?? trade?.asset?.id ?? trade?.asset_id ?? null;
};

/** Quotes are keyed by string id; callers are not always holding one. */
export const resolveLiveRate = (liveRates, currencyId) => {
  if (currencyId == null || !liveRates) return null;
  const key = String(currencyId);
  return liveRates[key] ?? liveRates[currencyId] ?? liveRates[Number(key)] ?? null;
};

/**
 * The mid price, or null. Deliberately no REST fallback: a stale price
 * presented as live is worse than an empty field, because the client cannot
 * tell the difference.
 */
export const getMarkLivePrice = (liveRate) => {
  if (!liveRate) return null;
  const mid = liveRate.rate ?? liveRate.current_price;
  if (mid != null && mid !== '' && parseFloat(mid) > 0) return mid;
  return null;
};

/** The side of the book an order would cross. Used for order tickets only. */
export const getQuotedLivePrice = (liveRate, direction) => {
  if (!liveRate) return null;
  const side = isLongTrade(direction) ? liveRate.buy_p ?? liveRate.rate : liveRate.sell_p ?? liveRate.rate;
  if (side != null && side !== '' && parseFloat(side) > 0) return side;
  return getMarkLivePrice(liveRate);
};
