import React, { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useInstruments } from '@/context/InstrumentsContext';
import { useLiveRates } from '@/context/LiveRatesContext';
import { useAuth } from '@/context/AuthContext';
import { calcPositionPnl } from '@/domain/pnl';
import { quoteToUsd } from '@/domain/fx';
import * as tradesService from '@/services/trades.service';
import { fetchFavourites, toggleFavourite as persistFavourite } from '@/services/instruments.service';
import {
  DEFAULT_ASSET_ID,
  persistSelectedAsset,
  readLastSelectedAsset,
  readStoredSymbol,
  resolveStoredAssetId,
} from '@/lib/lastSelectedAsset';
import { uniqueKeyOf, pairLabelOf } from '@/adapters/instrument';

const TradingContext = createContext(null);

const FAVOURITES_KEY = 'qp-favourites';
const DEFAULT_FAVOURITES = ['BTC', 'ETH'];

/**
 * Roughly how many tabs sit in the strip before it has to scroll. A layout
 * hint only — the strip renders every pin and scrolls past this, because
 * silently dropping a pair the user deliberately pinned is worse than a
 * sideways scroll.
 */
export const QUICK_PAIR_SLOTS = 7;

/**
 * How often to re-read the book.
 *
 * Prices arrive over the socket and P&L is recomputed from them locally, so
 * this poll is only here to catch changes the client did not make: a stop
 * firing, a resting order filling, a position closed from the CRM. The
 * backend checks stops roughly every second, so five is close enough to feel
 * immediate without asking sixty times a minute.
 */
const BOOK_POLL_MS = 5000;

const readFavourites = () => {
  try {
    const raw = window.localStorage.getItem(FAVOURITES_KEY);
    if (!raw) return DEFAULT_FAVOURITES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === 'string') : DEFAULT_FAVOURITES;
  } catch {
    // Private mode or a corrupted entry — fall back rather than break the app.
    return DEFAULT_FAVOURITES;
  }
};

export const TradingProvider = ({ children }) => {
  const { getInstrument, getInstrumentById, symbolOfId, instruments } = useInstruments();
  const { rates, priceFor } = useLiveRates();
  const { user } = useAuth();

  const [selectedAsset, setSelectedAssetState] = useState(() => readStoredSymbol() || 'BTC/USD');
  const [isAssetSheetOpen, setIsAssetSheetOpen] = useState(false);
  const [rawPositions, setRawPositions] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [closedTrades, setClosedTrades] = useState([]);
  const [favourites, setFavourites] = useState(readFavourites);
  const [loading, setLoading] = useState(true);
  const [tradingBlocked, setTradingBlocked] = useState(false);
  const restoredSelection = useRef(false);

  // symbolOfId is rebuilt whenever the instrument list changes; holding it in
  // a ref keeps the polling effect from restarting each time.
  const symbolOfIdRef = useRef(symbolOfId);
  symbolOfIdRef.current = symbolOfId;

  useEffect(() => {
    try {
      window.localStorage.setItem(FAVOURITES_KEY, JSON.stringify(favourites));
    } catch {
      // Nothing to do — the pins just won't survive a reload.
    }
  }, [favourites]);

  /**
   * Remember the instrument the same way the previous client did: id, symbol
   * and type in localStorage. A refresh then opens the pair that was on
   * screen instead of falling back to Bitcoin.
   */
  const setSelectedAsset = useCallback(
    (next) => {
      const instrument =
        next && typeof next === 'object'
          ? getInstrument(next)
          : getInstrument(next);
      const key = uniqueKeyOf(instrument);
      if (!key) return;
      setSelectedAssetState(key);
      persistSelectedAsset(instrument?.id != null ? instrument : { symbol: key, sym: pairLabelOf(instrument) || key });
    },
    [getInstrument]
  );

  // Once the book of instruments is in, resolve the stored id to a live
  // symbol. The previous app keyed off coinId; the UI here speaks symbols.
  // Nothing stored → Bitcoin (id 1), same default as the previous client.
  // Run once when the list first arrives — later finance refreshes must not
  // drag the selection back to whatever was stored at boot.
  useEffect(() => {
    if (!instruments.length || restoredSelection.current) return;
    restoredSelection.current = true;
    const last = readLastSelectedAsset();
    const storedSymbol = String(last?.sym || last?.symbol || last?.ex_sym || '').trim().toUpperCase();
    const storedId = last?.id != null ? String(last.id) : last ? null : resolveStoredAssetId();
    const byId = storedId ? getInstrumentById(storedId) : null;
    const bySymbol = storedSymbol ? getInstrument(storedSymbol) : null;
    const bitcoin = getInstrumentById(DEFAULT_ASSET_ID);
    const resolved = byId?.id ? byId : bySymbol?.id ? bySymbol : bitcoin;
    if (!resolved?.id && !resolved?.symbol) return;
    setSelectedAssetState(uniqueKeyOf(resolved));
    persistSelectedAsset(resolved);
  }, [instruments, getInstrument, getInstrumentById]);

  const refreshBook = useCallback(async () => {
    const symbolOf = (id) => symbolOfIdRef.current(id);
    const [open, pending, closed] = await Promise.all([
      tradesService.fetchOpenPositions({ symbolOf }),
      tradesService.fetchPendingOrders({ symbolOf }),
      tradesService.fetchClosedTrades({ symbolOf }),
    ]);

    if (open.ok) setRawPositions(open.positions);
    if (pending.ok) setPendingOrders(pending.orders);
    if (closed.ok) setClosedTrades(closed.trades);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    refreshBook();
    const interval = setInterval(refreshBook, BOOK_POLL_MS);
    return () => clearInterval(interval);
  }, [user, refreshBook]);

  /**
   * Positions marked to the live price.
   *
   * The P&L on the row from the server is correct only as of the moment it
   * was sent. Recomputing here against the same formula the server uses keeps
   * the number moving between polls without it drifting from what the broker
   * will actually settle.
   */
  const positions = useMemo(
    () =>
      rawPositions.map((position) => {
        const mark = priceFor(position.asset);
        const instrument = getInstrument(position.asset);
        const toUsd = quoteToUsd(instrument?.base, instruments, priceFor);
        return { ...position, currentPrice: mark, pnl: calcPositionPnl(position, mark, { toUsd, instrument }) };
      }),
    // rates is the real trigger: priceFor is rebuilt from it on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawPositions, rates]
  );

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      const result = await fetchFavourites();
      if (cancelled || !result.ok) return;
      const symbols = result.instruments.map((i) => uniqueKeyOf(i) || pairLabelOf(i)).filter(Boolean);
      if (symbols.length) setFavourites(symbols);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFavourite = useCallback(
    (symbol) => {
      const instrument = getInstrument(symbol);
      const ticker = uniqueKeyOf(instrument) || instrument?.symbol || symbol;
      const id = instrument?.id;
      setFavourites((prev) => {
        const isPinned = prev.some((key) => {
          if (key === symbol || key === ticker) return true;
          return id != null && getInstrument(key)?.id === id;
        });
        if (isPinned) {
          return prev.filter((key) => key !== symbol && key !== ticker && (id == null || getInstrument(key)?.id !== id));
        }
        return [...prev, ticker];
      });
      if (id != null) persistFavourite(id);
    },
    [getInstrument]
  );

  /**
   * Every action below sends the request and then re-reads the book.
   *
   * The server is the authority on what the account holds — it applies its
   * own fill price, commission and margin — so the list is replaced with what
   * it reports rather than patched with what the client assumed.
   */
  const addPosition = useCallback(
    async (ticket) => {
      const result = await tradesService.createTrade(ticket);
      if (result.tradingBlocked) setTradingBlocked(true);
      if (result.ok) await refreshBook();
      return result;
    },
    [refreshBook]
  );

  const closePosition = useCallback(
    async (id) => {
      const position = positions.find((p) => p.id === id);
      const result = await tradesService.closePosition({ id, pnl: position?.pnl ?? 0 });
      if (result.ok) await refreshBook();
      return result;
    },
    [positions, refreshBook]
  );

  const closeAllPositions = useCallback(async () => {
    const result = await tradesService.closeAllPositions();
    if (result.ok) await refreshBook();
    return result;
  }, [refreshBook]);

  const addPendingOrder = useCallback(
    async (ticket) => {
      const result = await tradesService.createTrade(ticket);
      if (result.tradingBlocked) setTradingBlocked(true);
      if (result.ok) await refreshBook();
      return result;
    },
    [refreshBook]
  );

  const cancelOrder = useCallback(
    async (id) => {
      const result = await tradesService.cancelPendingOrder(id);
      if (result.ok) await refreshBook();
      return result;
    },
    [refreshBook]
  );

  const value = useMemo(
    () => ({
      selectedAsset,
      setSelectedAsset,
      isAssetSheetOpen,
      openAssetSheet: () => setIsAssetSheetOpen(true),
      setIsAssetSheetOpen,

      positions,
      pendingOrders,
      closedTrades,
      loading,
      tradingBlocked,
      refreshBook,

      favourites,
      quickPairs: favourites,
      isFavourite: (symbol) => {
        const id = getInstrument(symbol)?.id;
        if (id == null) return favourites.includes(symbol);
        return favourites.some((key) => getInstrument(key)?.id === id);
      },
      toggleFavourite,

      addPosition,
      closePosition,
      closeAllPositions,
      addPendingOrder,
      cancelOrder,

      /**
       * Filling resting orders is the server's job now. It runs the check for
       * every instrument on every tick, so an order on gold fills while its
       * owner is asleep — which is what the browser-side version could never
       * do, since it only ever saw the instrument on screen.
       */

      account: {
        name: user?.name || '',
        initial: (user?.name || '?').charAt(0).toUpperCase(),
        type: user?.accountType === 'demo' ? 'DEMO' : 'LIVE',
        number: user?.id ? `#${user.id}` : '',
        openPositions: positions.length,
        pendingOrders: pendingOrders.length,
      },
    }),
    [
      selectedAsset, isAssetSheetOpen, positions, pendingOrders, closedTrades, favourites,
      loading, tradingBlocked, toggleFavourite, addPosition, closePosition, closeAllPositions,
      addPendingOrder, cancelOrder, refreshBook, user, setSelectedAsset, getInstrument,
    ]
  );

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
};

export const useTrading = () => {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used inside a TradingProvider');
  return ctx;
};
