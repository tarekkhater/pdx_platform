import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fallbackInstrument, uniqueKeyOf, pairLabelOf, parseInstrumentIdKey } from '@/adapters/instrument';
import * as instrumentsService from '@/services/instruments.service';

const InstrumentsContext = createContext(null);

const CATEGORY_ORDER = ['Crypto', 'Stocks', 'Forex', 'Indices', 'Commodities'];

/** The types to ask the server for when it does not tell us its own. */
const DEFAULT_TYPES = ['crypto', 'stocks', 'forex', 'indices', 'commodities'];

/**
 * The tradeable instruments, and the bridge between the symbols the interface
 * speaks and the ids the backend speaks.
 *
 * This replaces the hardcoded list in src/config/instruments.js. Components
 * still call getInstrument(symbol) and get the same shape back, with the
 * fields that only a server can know — contract size, leverage, spreads and
 * session hours — filled in.
 */
export const InstrumentsProvider = ({ children }) => {
  const [instruments, setInstruments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Finance data is fetched per instrument on demand and cached, so switching
  // back to an instrument does not re-request what we already have.
  const financeCache = useRef(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    const typesResult = await instrumentsService.fetchTypes();
    const types = typesResult.types.length ? typesResult.types : DEFAULT_TYPES;

    const results = await Promise.all(types.map((type) => instrumentsService.fetchAssetsByType(type)));

    // One id can be returned under more than one type; last write wins rather
    // than rendering the same instrument twice.
    const byId = new Map();
    results.forEach((result) => result.instruments.forEach((i) => byId.set(String(i.id), i)));

    const list = [...byId.values()];
    setInstruments(list);
    setError(list.length ? null : results.find((r) => !r.ok)?.message || null);
    setLoading(false);
    return list;
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { bySymbol, byId } = useMemo(() => {
    const symbolMap = new Map();
    const sharedKeys = new Set();
    const idMap = new Map();

    const claim = (key, instrument) => {
      const normalized = String(key || '').trim().toUpperCase();
      if (!normalized || sharedKeys.has(normalized)) return;
      const existing = symbolMap.get(normalized);
      if (existing && String(existing.id) !== String(instrument.id)) {
        symbolMap.delete(normalized);
        sharedKeys.add(normalized);
        return;
      }
      symbolMap.set(normalized, instrument);
    };

    instruments.forEach((instrument) => {
      if (instrument.id != null) idMap.set(String(instrument.id), instrument);
      claim(uniqueKeyOf(instrument), instrument);
      claim(pairLabelOf(instrument), instrument);
      claim(instrument.ex_sym, instrument);
      claim(instrument.symbol, instrument);
      // Bare `sym` (`EUR`) is only claimed when no other pair uses it.
      claim(instrument.sym, instrument);
    });
    return { bySymbol: symbolMap, byId: idMap };
  }, [instruments]);

  const getInstrument = useCallback(
    (symbol) => {
      if (symbol && typeof symbol === 'object') {
        if (symbol.id != null && byId.has(String(symbol.id))) return byId.get(String(symbol.id));
        return getInstrument(symbol.ex_sym || symbol.symbol || symbol.sym || uniqueKeyOf(symbol));
      }
      const raw = String(symbol ?? '').trim();
      if (!raw) return fallbackInstrument(symbol);
      const fromId = parseInstrumentIdKey(raw);
      if (fromId && byId.has(String(fromId))) return byId.get(String(fromId));
      const upper = raw.toUpperCase();
      const aliases = [upper];
      if (upper.includes('/')) aliases.push(upper.replace('/', ''), upper.split('/')[0]);
      if (upper.includes(':')) {
        const pair = upper.split(':').pop();
        aliases.push(pair, pair.replace('/', ''));
        if (pair.includes('/')) aliases.push(pair.split('/')[0]);
      }
      for (const key of aliases) {
        const hit = bySymbol.get(key);
        if (hit) return hit;
      }
      return fallbackInstrument(symbol);
    },
    [bySymbol, byId]
  );

  const getInstrumentById = useCallback((id) => (id == null ? null : byId.get(String(id)) || null), [byId]);

  /** id → symbol, for turning a trade's currency into something the UI reads. */
  const symbolOfId = useCallback((id) => getInstrumentById(id)?.symbol ?? null, [getInstrumentById]);
  const idOfSymbol = useCallback((symbol) => getInstrument(symbol)?.id ?? null, [getInstrument]);

  /**
   * Pulls contract size and leverage for one instrument and folds them into
   * the list, so every consumer sees the enriched version from then on.
   */
  const loadFinance = useCallback(
    async (symbol) => {
      const instrument = getInstrument(symbol);
      if (!instrument?.id) return instrument;
      const cacheKey = instrument.id != null ? `id:${instrument.id}` : instrument.symbol;
      if (financeCache.current.has(cacheKey)) return financeCache.current.get(cacheKey);

      const result = await instrumentsService.fetchInstrumentFinance(instrument);
      if (!result.ok) return instrument;

      financeCache.current.set(cacheKey, result.instrument);
      setInstruments((prev) => prev.map((i) => (i.id === result.instrument.id ? result.instrument : i)));
      return result.instrument;
    },
    [getInstrument]
  );

  const instrumentsByCategory = useMemo(() => {
    const grouped = Object.fromEntries(CATEGORY_ORDER.map((category) => [category, []]));
    instruments.forEach((instrument) => {
      if (!grouped[instrument.category]) grouped[instrument.category] = [];
      grouped[instrument.category].push(instrument);
    });
    return grouped;
  }, [instruments]);

  const value = useMemo(
    () => ({
      instruments,
      instrumentsByCategory,
      categoryOrder: CATEGORY_ORDER,
      loading,
      error,
      getInstrument,
      getInstrumentById,
      symbolOfId,
      idOfSymbol,
      loadFinance,
      reload: load,
    }),
    [instruments, instrumentsByCategory, loading, error, getInstrument, getInstrumentById, symbolOfId, idOfSymbol, loadFinance, load]
  );

  return <InstrumentsContext.Provider value={value}>{children}</InstrumentsContext.Provider>;
};

export const useInstruments = () => {
  const ctx = useContext(InstrumentsContext);
  if (!ctx) throw new Error('useInstruments must be used inside an InstrumentsProvider');
  return ctx;
};
