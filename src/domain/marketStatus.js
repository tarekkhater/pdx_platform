/**
 * Whether an instrument can be traded right now.
 *
 * Four independent things have to hold, and each one has been the cause of a
 * rejected order at some point: the venue's session is open, the server has
 * not flagged the asset as untradeable, a quote exists for it, and that quote
 * is recent enough to trade on.
 */

/** Asset types with no session — these trade around the clock. */
const ALWAYS_OPEN_TYPES = new Set(['crypto']);

/**
 * How long a quote stays tradeable without a new tick.
 *
 * The broadcaster re-sends every asset at least every 30 seconds even when
 * nothing moved, so silence beyond that is a real gap rather than a quiet
 * market. Crypto gets the tighter bound because it always ticks; slower
 * venues get the longer one.
 */
export const LIVE_RATE_STALE_MS = 45_000;
export const LIVE_RATE_STALE_SLOW_MS = 180_000;

const parseBoolLike = (value) => {
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === 'open' || s === 'opened' || s === 'active') return true;
    if (s === 'closed' || s === 'close' || s === 'inactive') return false;
  }
  return null;
};

/** "15:00:00" or "15:00" → seconds since midnight. */
export const parseSessionTimeToSeconds = (value) => {
  if (value == null || value === '') return null;
  const match = String(value).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const [h, m, s] = [parseInt(match[1], 10), parseInt(match[2], 10), match[3] ? parseInt(match[3], 10) : 0];
  if (h > 23 || m > 59 || s > 59) return null;
  return h * 3600 + m * 60 + s;
};

/**
 * Is now inside [openAt, closeAt)? Returns null when the asset carries no
 * schedule, which means "no opinion" rather than "closed" — an asset with no
 * hours configured must not be blocked by this check.
 */
export const isWithinMarketHours = (meta, now = new Date()) => {
  if (!meta || typeof meta !== 'object') return null;

  const openSec = parseSessionTimeToSeconds(meta.openAt ?? meta.open_at);
  const closeSec = parseSessionTimeToSeconds(meta.closeAt ?? meta.close_at);
  if (openSec == null || closeSec == null) return null;

  const timezone = meta.timezone ?? meta.market_timezone ?? 'UTC';
  let nowSec;

  if (String(timezone).toUpperCase() === 'UTC') {
    nowSec = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  } else {
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).formatToParts(now);
      const get = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
      nowSec = get('hour') * 3600 + get('minute') * 60 + get('second');
    } catch {
      // An unrecognised zone falls back to UTC rather than blocking trading.
      nowSec = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
    }
  }

  if (openSec === closeSec) return false;
  if (openSec < closeSec) return nowSec >= openSec && nowSec < closeSec;
  // A session that runs past midnight, e.g. 22:00 → 06:00.
  return nowSec >= openSec || nowSec < closeSec;
};

const shouldCheckMarketHours = (type, meta) => {
  if (type && ALWAYS_OPEN_TYPES.has(String(type).toLowerCase())) return false;
  const openAt = meta?.openAt ?? meta?.open_at;
  const closeAt = meta?.closeAt ?? meta?.close_at;
  return openAt != null && closeAt != null && String(openAt).trim() !== '' && String(closeAt).trim() !== '';
};

/** An explicit open/closed flag on an asset or a tick, if it carries one. */
export const isMarketOpenFromPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const keys = [
    'is_open', 'market_open', 'marketOpen', 'is_market_open', 'open_market',
    'can_trade', 'trading_allowed', 'tradable', 'is_tradable', 'market_status', 'status',
  ];
  for (const key of keys) {
    const parsed = parseBoolLike(payload[key]);
    if (parsed != null) return parsed;
  }
  return null;
};

export const liveRateMatchesAsset = (liveRate, assetId) => {
  if (!liveRate || assetId == null) return false;
  const rateId = liveRate.id ?? liveRate.currency_id;
  if (rateId == null) return false;
  const price = parseFloat(liveRate.rate ?? liveRate.buy_p ?? liveRate.sell_p);
  return String(rateId) === String(assetId) && Number.isFinite(price) && price > 0;
};

export const hasQuotedPrices = (liveRate) => {
  const mid = parseFloat(liveRate?.rate);
  if (Number.isFinite(mid) && mid > 0) return true;
  const buy = parseFloat(liveRate?.buy_p);
  const sell = parseFloat(liveRate?.sell_p);
  return Number.isFinite(buy) && buy > 0 && Number.isFinite(sell) && sell > 0;
};

export const isLiveRateFresh = (liveRate, assetType) => {
  if (!liveRate?.updatedAt) return false;
  const type = String(assetType ?? liveRate?.type ?? '').toLowerCase();
  const limit = ALWAYS_OPEN_TYPES.has(type) ? LIVE_RATE_STALE_MS : LIVE_RATE_STALE_SLOW_MS;
  return Date.now() - liveRate.updatedAt <= limit;
};

/**
 * The single answer the order ticket asks for.
 *
 * `serverTradable === false` always wins: the server has the final say, and a
 * client that thinks otherwise would just have its order rejected.
 */
export const isAssetTradeableNow = ({ liveRate, assetId, assetType, assetMeta, serverTradable }) => {
  if (serverTradable === false) return false;

  const meta = assetMeta ?? liveRate ?? null;
  const type = String(assetType ?? meta?.type ?? '').toLowerCase();

  if (shouldCheckMarketHours(type, meta) && isWithinMarketHours(meta) === false) return false;
  if (!liveRateMatchesAsset(liveRate, assetId)) return false;
  if (!hasQuotedPrices(liveRate)) return false;
  if (isMarketOpenFromPayload(liveRate) === false) return false;

  return true;
};

/** Why the ticket is disabled, for the message shown next to it. */
export const marketClosedReason = ({ liveRate, assetId, assetType, assetMeta, serverTradable }) => {
  if (serverTradable === false) return 'suspended';
  const meta = assetMeta ?? liveRate ?? null;
  const type = String(assetType ?? meta?.type ?? '').toLowerCase();
  if (shouldCheckMarketHours(type, meta) && isWithinMarketHours(meta) === false) return 'closed';
  if (!liveRateMatchesAsset(liveRate, assetId) || !hasQuotedPrices(liveRate)) return 'noQuote';
  if (isMarketOpenFromPayload(liveRate) === false) return 'closed';
  if (!isLiveRateFresh(liveRate, type)) return 'stale';
  return null;
};
