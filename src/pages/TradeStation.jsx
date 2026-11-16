import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import TradingViewChart from '@/components/TradingViewChart';
import AccountStatsBar from '@/components/AccountStatsBar';
import OrderPanel from '@/components/OrderPanel';
import OpenTrades from '@/components/OpenTrades';
import TechnicalAnalysis from '@/components/TechnicalAnalysis';
import AssetList from '@/components/AssetList';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useTrading } from '@/context/TradingContext';
import { useInstruments } from '@/context/InstrumentsContext';
import { useLiveRates } from '@/context/LiveRatesContext';
import { verifyTradable } from '@/services/instruments.service';
import { useTranslation } from 'react-i18next';
import { displaySym, uniqueKeyOf } from '@/adapters/instrument';
// Only applied when the row actually overflows: the last visible tab fades out
// instead of being sliced mid-letter, which reads as "more this way".
const OVERFLOW_MASK =
  '[mask-image:linear-gradient(to_right,#000_calc(100%-24px),transparent)]';

const TradeStation = () => {
  const { selectedAsset, setSelectedAsset, openAssetSheet, quickPairs, isFavourite, toggleFavourite } = useTrading();
  const { getInstrument, loadFinance } = useInstruments();
  const { priceFor } = useLiveRates();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const { t } = useTranslation();

  /**
   * The price every panel on this screen quotes from.
   *
   * It used to be a random walk seeded from a hardcoded price, which meant
   * the order ticket and the TradingView chart beside it never agreed on what
   * the instrument was worth. Both now read the broker's own feed.
   */
  const currentPrice = priceFor(selectedAsset);

  /**
   * Contract size and leverage are not on the instrument list, and the order
   * ticket cannot size a position without them.
   */
  useEffect(() => {
    loadFinance(selectedAsset);
  }, [selectedAsset, loadFinance]);

  /**
   * Seeds the price until the socket covers this instrument.
   *
   * The broadcaster only re-sends an asset when its price moves, with a full
   * sweep every sixty seconds — so a quiet instrument opened just after a
   * sweep would show nothing for a minute. Polling stops the moment a real
   * tick arrives, because the seed can no longer overwrite it anyway.
   */
  const [serverTradable, setServerTradable] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const instrument = getInstrument(selectedAsset);
    if (!instrument?.id) return undefined;

    setServerTradable(null);

    const check = async () => {
      const result = await verifyTradable(instrument.id);
      if (cancelled) return;
      if (result.tradable != null) setServerTradable(result.tradable);
    };

    check();
    const interval = setInterval(() => {
      if (priceFor(selectedAsset) > 0) return;
      check();
    }, 4000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // priceFor changes on every tick; depending on it would restart the poll
    // constantly. The instrument is the only input that should restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAsset, getInstrument]);

  // Press-and-hold on a chip unpins it. The flag stops the click that follows
  // the hold from also switching the instrument.
  const hold = useRef({ timer: null, fired: false });

  const startHold = (symbol) => {
    hold.current.fired = false;
    hold.current.timer = setTimeout(() => {
      hold.current.fired = true;
      toggleFavourite(symbol);
    }, 500);
  };

  const cancelHold = () => clearTimeout(hold.current.timer);

  // An instrument opened from the picker that isn't pinned keeps a tab of its
  // own. It holds that slot even after you tap a favourite, so switching away
  // doesn't throw away what you were just looking at — it's only replaced when
  // you open a different unpinned instrument, or pin it.
  const [recentUnpinned, setRecentUnpinned] = useState(null);
  const scrollerRef = useRef(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    if (!isFavourite(selectedAsset)) setRecentUnpinned(selectedAsset);
  }, [selectedAsset, isFavourite]);

  // Every pin is rendered. Around seven fit without scrolling; beyond that the
  // strip scrolls and fades at the edge. The open-but-unpinned instrument
  // leads as an extra tab rather than displacing one of the pins.
  const instrumentTabs = useMemo(() => {
    const loose = recentUnpinned && !isFavourite(recentUnpinned) ? [recentUnpinned] : [];
    const seen = new Set();
    const tabs = [];
    [...loose, ...quickPairs].forEach((key) => {
      const instrument = getInstrument(key);
      const id = instrument?.id != null ? `id:${instrument.id}` : String(key);
      if (seen.has(id)) return;
      seen.add(id);
      tabs.push(uniqueKeyOf(instrument) || instrument?.symbol || key);
    });
    return tabs;
  }, [recentUnpinned, quickPairs, isFavourite, getInstrument]);

  // Watch the strip rather than guessing from the tab count — symbol lengths
  // and screen width both decide whether it fits.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const check = () => setOverflowing(el.scrollWidth > el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [instrumentTabs]);

  const handleChipClick = (symbol) => {
    if (hold.current.fired) {
      hold.current.fired = false;
      return;
    }
    setSelectedAsset(symbol);
  };

  const pageVariants = {
    initial: { opacity: 0, x: 0 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: 0 },
  };

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.4,
  };

  // Shared by both layouts: the same instrument strip, favourites and all.
  //
  // Every tab prints the base symbol, so nothing resizes when you switch —
  // weight and the underline carry the selection. Tabs are separated by a
  // hairline that fades out at both ends, so it reads as a soft break rather
  // than a table rule. Outer spacing belongs to whichever layout renders it.
  const instrumentBar = (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-stretch gap-2.5 h-8 flex-shrink-0 border-b border-hairline"
    >
      {/* Browse-all sits first and never scrolls, so the control that
          reaches every instrument is always in the same place. Everything
          to its right is the user's own pinned list. */}
      <motion.button
        whileTap={{ scale: 0.88, rotate: 90 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        onClick={openAssetSheet}
        aria-label={t('tradeStation.selectAsset')}
        title={t('tradeStation.selectAsset')}
        className="self-center flex items-center justify-center flex-shrink-0 w-6 h-6 rounded-md border border-hairline bg-overlay text-content-faint transition-colors hover:bg-yellow-500/10 hover:border-yellow-500/40 hover:text-yellow-500"
      >
        <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
      </motion.button>

      {/* Separates the control from the pinned list. Plain flex item, so
          the row gap sits evenly on both sides of it. */}
      <span
        aria-hidden
        className="w-px h-3.5 self-center flex-shrink-0 bg-gradient-to-b from-transparent via-yellow-500/60 to-transparent"
      />

      {/* No flex-1: the pinned list shrinks to its content and only takes
          the slack once it outgrows the row, at which point it scrolls. */}
      <div ref={scrollerRef}
        className={`flex items-center gap-2.5 min-w-0 overflow-x-auto no-scrollbar ${
          overflowing ? OVERFLOW_MASK : ''
        }`}>
        {/* popLayout lets the survivors slide into place when a pin is
            removed instead of snapping. */}
        <AnimatePresence initial={false} mode="popLayout">
        {instrumentTabs.map((symbol, i) => {
          const instrument = getInstrument(symbol);
          const label = displaySym(instrument, symbol);
          const isActive = instrument?.id != null
            ? getInstrument(selectedAsset)?.id === instrument.id
            : symbol === selectedAsset;
          const pinned = isFavourite(symbol);
          return (
            <motion.button
              key={instrument?.id != null ? `id:${instrument.id}` : symbol}
              layout
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => handleChipClick(instrument || symbol)}
              onPointerDown={pinned ? () => startHold(instrument || symbol) : undefined}
              onPointerUp={cancelHold}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
              onContextMenu={(e) => e.preventDefault()}
              title={pinned ? `${label} — ${t('tradeStation.favourites.holdToRemove')}` : label}
              className={`relative h-full flex items-center flex-shrink-0 text-[13px] tracking-tight select-none transition-colors duration-200 ${
                isActive ? 'font-bold text-content' : 'font-medium text-content-faint hover:text-content-muted'
              }`}
            >
              {i > 0 && (
                <span
                  aria-hidden
                  className="absolute -left-[5px] top-1/2 -translate-y-1/2 w-px h-3.5 bg-gradient-to-b from-transparent via-yellow-500/60 to-transparent"
                />
              )}
              {label}
              {isActive && (
                <motion.span
                  layoutId="instrumentTabUnderline"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-yellow-500"
                />
              )}
            </motion.button>
          );
          })}
        </AnimatePresence>
      </div>

    </motion.div>

  );

  /**
   * Desktop terminal.
   *
   * No instrument strip here: the Markets panel on the left already lists and
   * switches every instrument, so the favourites strip and its + would be a
   * second control doing the same job. It stays on mobile, where there is no
   * room for a permanent markets sidebar.
   *
   * Markets and the order column run the full height, the way Binance runs
   * its order book and market list; only the middle column splits, into chart
   * over positions.
   *
   * -mt-2 leaves an 8px gap under the header, matching the gap between the
   * panels themselves rather than butting straight up against it. -mx-4 breaks
   * out of the page gutter so the panels run to the window edges like the
   * header does, with px-1 keeping a hairline of breathing room.
   * 73px = header (49) + that 8px gap + the page's bottom padding (16).
   */
  const renderDesktopView = () => (
    <div className="flex flex-col gap-2 h-[calc(100dvh-73px)] -mt-2 -mx-4 px-1">
      <AccountStatsBar asset={selectedAsset} currentPrice={currentPrice} />

      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="col-span-3 min-h-0 h-full"
        >
          <AssetList setSelectedAsset={setSelectedAsset} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="col-span-6 min-h-0 flex flex-col gap-3"
        >
          <div className="flex-1 min-h-0">
            <TradingViewChart asset={selectedAsset} />
          </div>
          <div className="h-[208px] flex-shrink-0 overflow-y-auto custom-scrollbar glassmorphism rounded-lg px-3 py-2">
            <OpenTrades />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="col-span-3 min-h-0 h-full flex flex-col gap-3"
        >
          <div className="flex-shrink-0">
            <OrderPanel currentPrice={currentPrice} asset={selectedAsset} serverTradable={serverTradable} />
          </div>
          <div className="flex-1 min-h-0">
            <TechnicalAnalysis asset={selectedAsset} />
          </div>
        </motion.div>
      </div>
    </div>
  );

  const renderMobileView = () => (
    <AnimatePresence mode="wait">
      <motion.div
        key="trade-mobile"
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="flex flex-col h-full overflow-hidden"
      >
        <div className="-mt-1 mb-1.5 flex-shrink-0">{instrumentBar}</div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <TradingViewChart asset={selectedAsset} />
        </div>
        <div className="flex-shrink-0 mt-2">
          <OrderPanel currentPrice={currentPrice} asset={selectedAsset} serverTradable={serverTradable} />
        </div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <>{isDesktop ? renderDesktopView() : renderMobileView()}</>
  );
};

export default TradeStation;