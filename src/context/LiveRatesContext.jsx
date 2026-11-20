import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { subscribeLiveRates, snapshotLiveRates, releaseForReseed } from '@/lib/realtime/liveRatesStore';
import { keepCurrencyChannelAlive, pauseCurrencyRates, resumeCurrencyRates } from '@/lib/realtime/socketPusher';
import { startPriceActivityWatch } from '@/lib/realtime/priceActivity';
import { resolveLiveRate, getMarkLivePrice } from '@/lib/realtime/markPrice';
import { isAssetTradeableNow, marketClosedReason, isLiveRateFresh } from '@/domain/marketStatus';
import { useInstruments } from '@/context/InstrumentsContext';

const LiveRatesContext = createContext(null);

/**
 * Live prices, as the interface asks for them: by symbol.
 *
 * The quotes themselves live outside React in liveRatesStore, keyed by asset
 * id. This provider is the translation layer and the single subscription —
 * every screen reads from one snapshot rather than opening its own.
 */
export const LiveRatesProvider = ({ children }) => {
  const { getInstrument, getInstrumentById, idOfSymbol, reload } = useInstruments();
  const [rates, setRates] = useState(snapshotLiveRates);

  useEffect(() => {
    keepCurrencyChannelAlive();
    return subscribeLiveRates(setRates);
  }, []);

  // No live prices for a hidden tab or after 2 minutes without activity (saves Pusher messages); on
  // the first movement: back on the channel and the latest prices re-read at once.
  useEffect(
    () =>
      startPriceActivityWatch({
        onPause: () => pauseCurrencyRates(),
        onResume: () => {
          releaseForReseed();
          resumeCurrencyRates();
          reload?.();
        },
      }),
    [reload]
  );

  /**
   * A two-sided quote for a symbol.
   *
   * bid and ask are derived from the mid and the instrument's spreads, the
   * same way the backend derives an entry price — buy above the mid, sell
   * below it, each by its own percentage. Using the feed's own buy_p/sell_p
   * where present, because those are what the server actually quoted.
   */
  const quoteFor = useCallback(
    (symbol) => {
      const instrument =
        symbol && typeof symbol === 'object' && symbol.id != null
          ? getInstrumentById(symbol.id) || getInstrument(symbol)
          : getInstrument(symbol);
      const liveRate = resolveLiveRate(rates, instrument.id);
      const mid = Number(getMarkLivePrice(liveRate)) || 0;

      if (!mid) {
        return { mid: 0, bid: 0, ask: 0, fresh: false, updatedAt: null, source: null, instrument };
      }

      // The asset list endpoint and the live broadcast name the two quoted prices the opposite way
      // round (buy_p is mid + spread in one and mid - spread in the other), so the names cannot be
      // trusted: the ask is always the higher price (what a buyer pays) and the bid the lower.
      const feedBuy = Number(liveRate?.buy_p) > 0 ? Number(liveRate.buy_p) : 0;
      const feedSell = Number(liveRate?.sell_p) > 0 ? Number(liveRate.sell_p) : 0;
      const quotedAsk = feedBuy && feedSell ? Math.max(feedBuy, feedSell) : mid + (instrument.buySpread / 100) * mid;
      const quotedBid = feedBuy && feedSell ? Math.min(feedBuy, feedSell) : mid - (instrument.sellSpread / 100) * mid;

      return {
        mid,
        bid: quotedBid,
        ask: quotedAsk,
        fresh: isLiveRateFresh(liveRate, instrument.type),
        updatedAt: liveRate?.updatedAt ?? null,
        source: liveRate?.source ?? null,
        instrument,
      };
    },
    [rates, getInstrument, getInstrumentById]
  );

  /** The mid price for a symbol, or 0 when nothing has arrived yet. */
  const priceFor = useCallback((symbol) => quoteFor(symbol).mid, [quoteFor]);

  const tradeStatusFor = useCallback(
    (symbol, serverTradable) => {
      const instrument = getInstrument(symbol);
      const liveRate = resolveLiveRate(rates, instrument.id);
      const args = {
        liveRate,
        assetId: instrument.id,
        assetType: instrument.type,
        assetMeta: instrument,
        serverTradable,
      };
      return { tradeable: isAssetTradeableNow(args), reason: marketClosedReason(args) };
    },
    [rates, getInstrument]
  );

  const value = useMemo(
    () => ({ rates, quoteFor, priceFor, tradeStatusFor, idOfSymbol }),
    [rates, quoteFor, priceFor, tradeStatusFor, idOfSymbol]
  );

  return <LiveRatesContext.Provider value={value}>{children}</LiveRatesContext.Provider>;
};

export const useLiveRates = () => {
  const ctx = useContext(LiveRatesContext);
  if (!ctx) throw new Error('useLiveRates must be used inside a LiveRatesProvider');
  return ctx;
};
