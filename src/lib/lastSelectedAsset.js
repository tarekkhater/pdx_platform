const LAST_ASSET_KEY = 'lastSelectedAsset';
const COIN_ID_KEY = 'coinId';
const ASSET_TYPE_KEY = 'selectedAssetType';

/** Bitcoin on this book. Used when nothing is stored yet. */
export const DEFAULT_ASSET_ID = '1';

export const TRADING_ASSET_STORAGE_KEYS = [LAST_ASSET_KEY, COIN_ID_KEY, ASSET_TYPE_KEY];

const TAB_BY_TYPE = {
  favourite: 'Favourite',
  crypto: 'Crypto',
  stocks: 'Stocks',
  forex: 'Forex',
  indices: 'Indices',
  commodities: 'Commodities',
};

export const idsEqual = (a, b) => {
  if (a == null || b == null) return false;
  return String(a) === String(b);
};

export const readLastSelectedAsset = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LAST_ASSET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id != null || parsed?.symbol || parsed?.ex_sym ? parsed : null;
  } catch {
    return null;
  }
};

/** lastSelectedAsset.id wins over leftover coinId, then Bitcoin (id 1). */
export const resolveStoredAssetId = () => {
  const last = readLastSelectedAsset();
  if (last?.id != null) return String(last.id);
  if (typeof window === 'undefined') return DEFAULT_ASSET_ID;
  return localStorage.getItem(COIN_ID_KEY) || DEFAULT_ASSET_ID;
};

export const readStoredSymbol = () => {
  const last = readLastSelectedAsset();
  const fromLast = String(last?.sym || last?.symbol || last?.ex_sym || last?.name || '').trim().toUpperCase();
  if (fromLast) return fromLast;
  return null;
};

export const readStoredAssetType = () => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(ASSET_TYPE_KEY);
  if (stored) return String(stored).toLowerCase();
  const last = readLastSelectedAsset();
  const fromAsset = String(last?.type || last?.asset_type || '').toLowerCase();
  return fromAsset || null;
};

/** Title-case tab the list opens on, matching the previous client. */
export const readStoredAssetTab = () => {
  const type = readStoredAssetType();
  return (type && TAB_BY_TYPE[type]) || 'Crypto';
};

export const persistSelectedAssetType = (type) => {
  if (typeof window === 'undefined' || !type) return;
  try {
    localStorage.setItem(ASSET_TYPE_KEY, String(type).toLowerCase());
  } catch {
    /* quota / private mode */
  }
};

/**
 * Same three keys the previous client wrote, so a refresh (and a move from
 * that app to this one) lands on the instrument that was on screen.
 */
export const persistSelectedAsset = (asset) => {
  if (typeof window === 'undefined' || !asset) return;
  const id = asset.id ?? asset.currency_id;
  const sym = String(asset.sym || asset.symbol || '').trim().toUpperCase();
  const ex_sym = String(asset.ex_sym || '').trim().toUpperCase();
  const base = String(asset.base || '').trim().toUpperCase();
  const type = asset.type ?? asset.asset_type;
  try {
    const previous = readLastSelectedAsset() || {};
    const record = {
      ...previous,
      ...(id != null ? { id } : {}),
      ...(sym ? { symbol: sym, sym } : {}),
      ...(base ? { base } : {}),
      ...(ex_sym ? { ex_sym } : {}),
      ...(asset.name ? { name: asset.name } : {}),
      ...(type ? { type: String(type).toLowerCase(), asset_type: String(type).toLowerCase() } : {}),
    };
    if (record.id == null && !record.symbol && !record.ex_sym) return;
    localStorage.setItem(LAST_ASSET_KEY, JSON.stringify(record));
    if (record.id != null) localStorage.setItem(COIN_ID_KEY, String(record.id));
    if (record.type) localStorage.setItem(ASSET_TYPE_KEY, String(record.type).toLowerCase());
  } catch {
    /* quota / private mode */
  }
};

export const backupTradingAssetPrefs = () => {
  if (typeof window === 'undefined') return {};
  const backup = {};
  TRADING_ASSET_STORAGE_KEYS.forEach((key) => {
    backup[key] = localStorage.getItem(key);
  });
  return backup;
};

export const restoreTradingAssetPrefs = (backup) => {
  if (typeof window === 'undefined' || !backup) return;
  TRADING_ASSET_STORAGE_KEYS.forEach((key) => {
    if (backup[key] != null) localStorage.setItem(key, backup[key]);
  });
};
