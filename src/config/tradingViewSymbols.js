/**
 * Maps the platform's instrument codes to TradingView's own symbol format.
 *
 * TradingView needs an exchange prefix ("BINANCE:BTCUSDT"), which our codes
 * don't carry. A broker swapping in their own liquidity provider edits this
 * table — nothing in the chart component needs touching.
 */
export const TRADINGVIEW_SYMBOLS = {
  // Crypto — Binance perpetual pairs quote in USDT, not USD.
  'BTC/USD': 'BINANCE:BTCUSDT',
  'ETH/USD': 'BINANCE:ETHUSDT',
  'XRP/USD': 'BINANCE:XRPUSDT',
  'LTC/USD': 'BINANCE:LTCUSDT',
  'ADA/USD': 'BINANCE:ADAUSDT',
  'SOL/USD': 'BINANCE:SOLUSDT',
  'DOGE/USD': 'BINANCE:DOGEUSDT',
  'BNB/USD': 'BINANCE:BNBUSDT',

  // Equities
  AAPL: 'NASDAQ:AAPL',
  GOOGL: 'NASDAQ:GOOGL',
  MSFT: 'NASDAQ:MSFT',

  // FX
  'EUR/USD': 'FX:EURUSD',
  'GBP/USD': 'FX:GBPUSD',

  // Indices
  SPX: 'SP:SPX',
  NDX: 'NASDAQ:NDX',

  // Commodities
  'XAU/USD': 'OANDA:XAUUSD',
  'XTI/USD': 'TVC:USOIL',
};

/**
 * Falls back to the bare symbol with the slash stripped, which TradingView
 * will resolve against its default exchange. Better than rendering nothing
 * when a broker adds an instrument and forgets to map it.
 */
const usableSymbol = (value) => {
  const key = String(value ?? '').trim();
  if (!key || /^id:/i.test(key) || /^\d+$/.test(key)) return '';
  return key;
};

export const toTradingViewSymbol = (asset, instrument) => {
  const candidates = [
    usableSymbol(instrument?.ex_sym),
    usableSymbol(instrument?.symbol),
    usableSymbol(instrument?.sym),
    usableSymbol(typeof asset === 'string' ? asset : ''),
  ].filter(Boolean);

  for (const key of candidates) {
    if (TRADINGVIEW_SYMBOLS[key]) return TRADINGVIEW_SYMBOLS[key];
    const slashed = key.includes('/') ? key : null;
    if (slashed && TRADINGVIEW_SYMBOLS[slashed]) return TRADINGVIEW_SYMBOLS[slashed];
  }

  const exchange = candidates.find((key) => key.includes(':')) || '';
  if (exchange) return exchange;
  return (candidates[0] || 'BINANCE:BTCUSDT').replace('/', '');
};

// TradingView's own locale codes; anything unmapped falls back to English
// rather than failing to load the widget.
const TV_LOCALES = { en: 'en', de: 'de', cs: 'cs', hu: 'hu_HU' };

export const toTradingViewLocale = (lng) => TV_LOCALES[String(lng || '').split('-')[0]] || 'en';
