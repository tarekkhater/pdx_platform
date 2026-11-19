/**
 * Backend asset → instrument.
 *
 * The interface is built on symbols (`BTC/USD`); the backend is built on
 * numeric ids. Both are carried on every instrument so the bridge between
 * them is never guessed at a call site.
 */

const normalizeTicker = (value) => String(value ?? '').trim().toUpperCase();

/**
 * Unique pair label (`EURUSD`). Forex rows share `sym` (`EUR`) and differ
 * by `base` (`USD` / `CAD`); using `sym` alone makes four pairs look like
 * one instrument.
 */
export const pairLabelOf = (asset = {}) => {
  const sym = normalizeTicker(asset.sym);
  const base = normalizeTicker(asset.base);
  if (sym && base && !sym.includes(base)) return `${sym}${base}`;
  if (sym) return sym;
  const raw = normalizeTicker(asset.ex_sym) || normalizeTicker(asset.symbol) || normalizeTicker(asset.name);
  if (!raw) return '';
  const afterExchange = raw.includes(':') ? raw.split(':').pop() : raw;
  return afterExchange.replace('/', '');
};

/**
 * Short ticker the UI prints (`EUR`, `BTC`). Actions key off `id`;
 * this is display only and may repeat across forex pairs.
 */
export const tickerOf = (asset = {}) => {
  const fromSym = normalizeTicker(asset.sym);
  if (fromSym) return fromSym;
  const raw = normalizeTicker(asset.ex_sym) || normalizeTicker(asset.symbol) || normalizeTicker(asset.name);
  if (!raw) return '';
  const afterExchange = raw.includes(':') ? raw.split(':').pop() : raw;
  return afterExchange.split('/')[0];
};

/** Exchange / feed code. Kept off the screen; used to match prices and the chart. */
export const exchangeSymbolOf = (asset = {}) =>
  normalizeTicker(asset.ex_sym) || normalizeTicker(asset.symbol);

/** Stable selection key. The book is keyed by id — `sym` is not unique. */
export const uniqueKeyOf = (instrument) => {
  if (instrument?.id != null && String(instrument.id) !== '') return `id:${instrument.id}`;
  return pairLabelOf(instrument) || exchangeSymbolOf(instrument);
};

export const parseInstrumentIdKey = (value) => {
  const raw = String(value ?? '').trim();
  const tagged = raw.match(/^id:(.+)$/i);
  if (tagged) return tagged[1];
  if (/^\d+$/.test(raw)) return raw;
  return null;
};

/** @deprecated Use tickerOf — `symbol` on the instrument is the display ticker. */
export const symbolOf = tickerOf;

export const displaySym = (instrument, fallback = '') =>
  normalizeTicker(instrument?.sym) || normalizeTicker(fallback);

const CATEGORY_LABELS = {
  crypto: 'Crypto',
  stocks: 'Stocks',
  stock: 'Stocks',
  forex: 'Forex',
  indices: 'Indices',
  index: 'Indices',
  commodities: 'Commodities',
  commodity: 'Commodities',
};

export const categoryOf = (type) => {
  const key = String(type ?? '').trim().toLowerCase();
  return CATEGORY_LABELS[key] || (key ? key[0].toUpperCase() + key.slice(1) : 'Other');
};

/**
 * How many decimals to quote an instrument to.
 *
 * The backend has no precision column, so it is inferred from the price. This
 * is a stopgap, not a convention — it gets a five-figure index and a
 * four-figure crypto right and will get something wrong eventually. It is
 * listed in INTEGRATION.md as a question for the backend.
 */
export const inferDecimals = (price, { type = '', base = '' } = {}) => {
  const value = Math.abs(Number(price) || 0);
  // Forex is quoted to the pipette like the market and TradingView: 5 decimals (EURUSD 1.09671),
  // 3 for yen / forint quotes and other large prices (USDJPY 159.691). The price-size rule below
  // showed EURGBP as 0.8376 and USDJPY as 159.69, so the last digit, the one that moves every
  // second, was never visible and forex looked frozen.
  if (String(type).toLowerCase() === 'forex') {
    const quote = String(base).toUpperCase();
    if (quote === 'JPY' || quote === 'HUF' || value >= 50) return 3;
    return 5;
  }
  if (value === 0) return 2;
  if (value < 0.1) return 5;
  if (value < 10) return 4;
  if (value < 1000) return 2;
  return 2;
};

const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const toInstrument = (asset = {}) => {
  const price = num(asset.rate ?? asset.current_price ?? asset.buy_p ?? 0);
  const base = normalizeTicker(asset.base);
  const rawSym = normalizeTicker(asset.sym);
  const pair = pairLabelOf(asset);
  const ex_sym = exchangeSymbolOf(asset);

  return {
    id: asset.id ?? asset.currency_id ?? null,
    symbol: rawSym || pair,
    sym: rawSym || pair,
    base,
    ex_sym: ex_sym || pair,
    name: asset.name ?? '',
    category: categoryOf(asset.type),
    type: String(asset.type ?? '').toLowerCase(),
    image: asset.image || null,
    price,
    decimals: inferDecimals(price, { type: asset.type, base }),

    /**
     * Spreads are percentages of the mid price, not price units — the field
     * this replaced on the mock instrument list was an absolute amount, and
     * reading one as the other quotes Bitcoin 3,100 dollars wide.
     */
    buySpread: num(asset.buy_spread),
    sellSpread: num(asset.sell_spread),

    /**
     * Units per lot. Without it margin is computed as though one lot were one
     * unit, which prices 0.01 lots of XRP at a third of a cent.
     */
    contractSize: num(asset.amount, 1) > 0 ? num(asset.amount, 1) : 1,
    leverage: num(asset.leverage, 10) > 0 ? num(asset.leverage, 10) : 10,

    openAt: asset.open_at ?? null,
    closeAt: asset.close_at ?? null,
    timezone: asset.timezone ?? 'UTC',
    isFavourite: asset.is_favourite === true || asset.is_favourite === 1 || asset.is_favourite === '1',
  };
};

/**
 * The finance endpoint carries the numbers the order ticket needs and the
 * list endpoint may not include. Merged over the instrument rather than
 * replacing it, so a field the finance response omits keeps its list value.
 */
export const mergeFinance = (instrument, finance = {}) => {
  if (!finance || typeof finance !== 'object') return instrument;
  const contractSize = Number(finance.amount);
  const leverage = Number(finance.leverage);
  const price = Number(finance.rate ?? finance.current_price);

  return {
    ...instrument,
    ...(Number.isFinite(contractSize) && contractSize > 0 ? { contractSize } : {}),
    ...(Number.isFinite(leverage) && leverage > 0 ? { leverage } : {}),
    ...(Number.isFinite(price) && price > 0
      ? { price, decimals: inferDecimals(price, { type: instrument.type, base: instrument.base }) }
      : {}),
    ...(finance.buy_spread != null ? { buySpread: num(finance.buy_spread) } : {}),
    ...(finance.sell_spread != null ? { sellSpread: num(finance.sell_spread) } : {}),
  };
};

/** A safe instrument for a symbol that is not in the list. */
export const fallbackInstrument = (symbol) => ({
  id: null,
  symbol: symbol || '',
  sym: symbol || '',
  base: '',
  ex_sym: symbol || '',
  name: symbol || '',
  category: 'Other',
  type: '',
  image: null,
  price: 0,
  decimals: 2,
  buySpread: 0,
  sellSpread: 0,
  contractSize: 1,
  leverage: 10,
  openAt: null,
  closeAt: null,
  timezone: 'UTC',
  isFavourite: false,
});
