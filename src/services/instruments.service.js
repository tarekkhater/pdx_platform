import api, { apiErrorMessage } from '@/lib/api';
import { toInstrument, mergeFinance } from '@/adapters/instrument';
import { applyApiSeedQuote } from '@/lib/realtime/liveRatesStore';

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];

/** The asset categories the platform offers. */
export const fetchTypes = async () => {
  try {
    const data = unwrap(await api.get('/users/assets/types'));
    const types = (Array.isArray(data) ? data : []).map((item) =>
      typeof item === 'string' ? item : item?.type ?? item?.name
    );
    return { ok: true, types: types.filter(Boolean) };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), types: [] };
  }
};

export const fetchAssetsByType = async (type) => {
  try {
    const data = unwrap(await api.get(`/users/assets?type=${encodeURIComponent(type)}`, { timeout: 15000 }));
    const instruments = (Array.isArray(data) ? data : []).map(toInstrument).filter((i) => i.id != null && i.symbol);

    /**
     * Prices from the list seed the quote store so the markets panel is not
     * blank while waiting for the feed. They are marked as coming from the
     * API and can never overwrite a price the socket has already delivered.
     */
    instruments.forEach((instrument) => {
      if (instrument.price > 0) {
        applyApiSeedQuote(instrument.id, {
          id: instrument.id,
          rate: instrument.price,
          name: instrument.name,
          ex_sym: instrument.ex_sym || instrument.symbol,
          type: instrument.type,
          amount: instrument.contractSize,
          buy_spread: instrument.buySpread,
          sell_spread: instrument.sellSpread,
        });
      }
    });

    return { ok: true, instruments };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), instruments: [] };
  }
};

/**
 * The contract size, leverage and spreads for one instrument.
 *
 * The order ticket cannot compute margin without this, so it is fetched when
 * an instrument is selected rather than for the whole list up front — the
 * list endpoint does not carry it and one request per asset on load would be
 * hundreds of requests.
 */
export const fetchInstrumentFinance = async (instrument) => {
  if (!instrument?.id) return { ok: false, instrument };
  try {
    const data = unwrap(await api.get(`/users/assets/show/finance/${instrument.id}`));
    const merged = mergeFinance(instrument, data);
    if (merged.price > 0) {
      applyApiSeedQuote(merged.id, { id: merged.id, rate: merged.price, ...data });
    }
    return { ok: true, instrument: merged, finance: data };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), instrument };
  }
};

/**
 * Asks the server whether an asset can be traded, and seeds its price.
 *
 * Called on a short interval for the selected instrument until the socket
 * takes over, because the broadcaster only re-sends an asset when its price
 * moves — a quiet instrument can otherwise show nothing for a full minute.
 */
export const verifyTradable = async (assetId) => {
  if (assetId == null) return { ok: false, tradable: null };
  try {
    const data = unwrap(await api.get(`/users/assets/show/${assetId}`));
    const asset = Array.isArray(data) ? data[0] : data;
    if (asset?.rate || asset?.current_price) applyApiSeedQuote(assetId, asset);
    return { ok: true, tradable: true, asset };
  } catch (error) {
    // A refusal is an answer; anything else is a failed question.
    const status = error?.response?.status;
    return { ok: false, tradable: status === 403 || status === 422 ? false : null, message: apiErrorMessage(error) };
  }
};

export const searchAssets = async ({ name, type }) => {
  try {
    const data = unwrap(await api.post('/users/assets/search', { name, type }));
    return { ok: true, instruments: (Array.isArray(data) ? data : []).map(toInstrument) };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), instruments: [] };
  }
};

export const toggleFavourite = async (assetId) => {
  try {
    await api.post('/users/assets/favourite', { id: assetId });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error) };
  }
};

export const fetchFavourites = async () => {
  try {
    const data = unwrap(await api.get('/users/assets/get/favourite'));
    return { ok: true, instruments: (Array.isArray(data) ? data : []).map(toInstrument) };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), instruments: [] };
  }
};
