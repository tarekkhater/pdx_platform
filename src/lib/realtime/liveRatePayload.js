/**
 * Normalise a CurrencyRateUpdated payload into a flat list of rate objects.
 *
 * The broadcaster sends an array of assets (see RunCurrencyBroadcast, which
 * chunks them 50 at a time), but Echo wraps some payloads in `{ data: ... }`
 * and a single-asset tick arrives as a bare object. Rather than guess, every
 * shape the backend has been seen to emit is accepted here — this function is
 * the only place in the app that has to know about any of them.
 */
export function normalizeRatePayload(eventData) {
  if (eventData == null) return [];

  let payload = eventData;

  if (typeof payload === 'object' && !Array.isArray(payload)) {
    // Unwrap an envelope, but never strip a rate object that carries its own
    // id — `{ id, data }` is a rate, not a wrapper.
    if (payload.data != null && payload.id == null) payload = payload.data;
    else if (Array.isArray(payload.rates)) payload = payload.rates;
    else if (Array.isArray(payload.currencies)) payload = payload.currencies;
  }

  if (Array.isArray(payload)) {
    return payload.filter((rate) => rate && typeof rate === 'object');
  }

  if (typeof payload !== 'object') return [];

  // A single rate.
  if (payload.id != null && (payload.rate != null || payload.buy_p != null || payload.sell_p != null)) {
    return [payload];
  }

  // An id-keyed map of rates.
  const values = Object.values(payload).filter((value) => value && typeof value === 'object');
  return values.filter(
    (value) => value.id != null || value.rate != null || value.buy_p != null || value.sym != null
  );
}
