import { normalizeRatePayload } from './liveRatePayload';

/**
 * The app's live quotes, outside React.
 *
 * Deliberately not a context value: quotes arrive up to once a second for
 * fifty assets at a time, and routing every tick through a provider would
 * re-render every subscribed screen on every tick. Components take the slice
 * they need through a subscription instead.
 *
 * It also survives route changes, so opening the trades list shows the last
 * known price immediately rather than blank cells until the next tick.
 */

const pusherLockedIds = new Set();
const lastQuotes = new Map();
const listeners = new Set();

export const isPusherLocked = (id) => id != null && pusherLockedIds.has(String(id));

const positiveQuote = (value) => (value != null && value !== '' && parseFloat(value) > 0 ? value : null);

const buildQuoteEntry = (prev, id, quote, rate, buyPrice, sellPrice, source) => ({
  id: quote.id ?? prev?.id ?? id,
  name: quote.name ?? quote.sym ?? quote.sy ?? prev?.name,
  symbol: quote.ex_sym ?? quote.sym ?? prev?.symbol,
  type: quote.type ?? prev?.type,
  amount: quote.amount ?? prev?.amount,
  buy_spread: quote.buy_spread ?? prev?.buy_spread,
  sell_spread: quote.sell_spread ?? prev?.sell_spread,
  rate,
  buy_p: buyPrice,
  sell_p: sellPrice,
  updatedAt: Date.now(),
  source,
});

export const snapshotLiveRates = () => Object.fromEntries(lastQuotes.entries());

const notify = () => {
  const snapshot = snapshotLiveRates();
  listeners.forEach((callback) => {
    try {
      callback(snapshot);
    } catch {
      // One bad subscriber must not stop the rest from being told.
    }
  });
};

export const subscribeLiveRates = (callback) => {
  if (typeof callback !== 'function') return () => {};
  listeners.add(callback);
  callback(snapshotLiveRates());
  return () => listeners.delete(callback);
};

const applyPusherQuote = (id, quote) => {
  if (id == null || !quote) return false;
  const key = String(id);
  const prev = lastQuotes.get(key);

  const rate = positiveQuote(quote.rate) ?? positiveQuote(quote.current_price) ?? positiveQuote(prev?.rate);
  const buyPrice = positiveQuote(quote.buy_p) ?? positiveQuote(prev?.buy_p);
  const sellPrice = positiveQuote(quote.sell_p) ?? positiveQuote(prev?.sell_p);

  if (!(parseFloat(rate) > 0 || parseFloat(buyPrice) > 0 || parseFloat(sellPrice) > 0)) return false;

  /**
   * An unchanged price still refreshes updatedAt.
   *
   * The broadcaster re-sends every asset on a 30s heartbeat precisely so a
   * quiet market does not look dead. If the repeat were ignored here, a
   * slow-moving instrument would age past the staleness threshold and the
   * interface would mark a perfectly open market as closed.
   */
  if (
    prev?.source === 'pusher' &&
    String(prev.rate ?? '') === String(rate ?? '') &&
    String(prev.buy_p ?? '') === String(buyPrice ?? '') &&
    String(prev.sell_p ?? '') === String(sellPrice ?? '')
  ) {
    lastQuotes.set(key, { ...prev, updatedAt: Date.now() });
    return false;
  }

  pusherLockedIds.add(key);
  lastQuotes.set(key, buildQuoteEntry(prev, id, quote, rate, buyPrice, sellPrice, 'pusher'));
  return true;
};

/**
 * A price read from a REST response, used only to fill the gap before the
 * first tick for that asset.
 *
 * The broadcaster only re-sends an asset when its price changes, with a full
 * snapshot every 60 seconds — so a client that has just loaded can wait a
 * full minute for a quiet instrument. This seeds it.
 *
 * Once Pusher has spoken for an asset it is locked and a REST value can never
 * overwrite it, or the displayed price would jump backwards to whatever the
 * slower channel last knew.
 */
export const applyApiSeedQuote = (id, quote) => {
  if (id == null || !quote) return false;
  const key = String(id);
  if (isPusherLocked(key) || lastQuotes.get(key)?.source === 'pusher') return false;

  const prev = lastQuotes.get(key);
  const rate = positiveQuote(quote.rate) ?? positiveQuote(quote.current_price) ?? positiveQuote(prev?.rate);
  const buyPrice = positiveQuote(quote.buy_p) ?? positiveQuote(prev?.buy_p);
  const sellPrice = positiveQuote(quote.sell_p) ?? positiveQuote(prev?.sell_p);

  if (!(parseFloat(rate) > 0 || parseFloat(buyPrice) > 0 || parseFloat(sellPrice) > 0)) return false;

  lastQuotes.set(key, buildQuoteEntry(prev, id, quote, rate, buyPrice, sellPrice, 'api'));
  notify();
  return true;
};

/** Called from the shared channel, whether or not any screen is mounted. */
export const ingestPusherPayload = (eventData) => {
  const rates = normalizeRatePayload(eventData);
  if (!rates.length) return false;

  let changed = false;
  for (const rate of rates) {
    if (applyPusherQuote(rate?.id ?? rate?.currency_id, rate)) changed = true;
  }
  if (changed) notify();
  return changed;
};

/**
 * After a pause (tab hidden / idle) the prices on screen are old: let the next REST read replace them
 * instead of waiting for each pair's next tick (a quiet pair can take a while).
 */
export const releaseForReseed = () => {
  pusherLockedIds.clear();
  for (const [key, entry] of lastQuotes.entries()) {
    if (entry?.source === 'pusher') lastQuotes.set(key, { ...entry, source: 'paused' });
  }
};

/** Signing out must not leave the next user looking at stale prices. */
export const resetLiveRates = () => {
  lastQuotes.clear();
  pusherLockedIds.clear();
  notify();
};
