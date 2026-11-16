
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, Minus, Plus, ArrowUpDown, ArrowLeftRight, ArrowUp, ArrowDown, X } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useTrading } from '@/context/TradingContext';
import { useInstruments } from '@/context/InstrumentsContext';
import { useLiveRates } from '@/context/LiveRatesContext';
import { useAccount } from '@/context/AccountContext';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  getEntryPrice,
  getSpreadPercent,
  computeMargin,
  computeNotional,
  lotsForMargin,
  priceLevelToAmount,
  parseLotInput,
  isLotInputPartial,
  formatTicketSize,
} from '@/domain/order';

const LOT_STEP = 0.01;
const MIN_LOT = 0.001;
const LOT_DECIMALS = 3;
const USD_STEP = 10;
const DEFAULT_LEVERAGE = 30;
const MAX_LEVERAGE = 100;
const LEVERAGE_OPTIONS = [10, 20, 30, 40, 50, 100, 200, 300, 400, 500];
const UNITS = ['lots', 'USD'];
const EXECUTIONS = ['market', 'pending'];

const Toggle = ({ checked, onChange }) => (
  <motion.span
    role="switch"
    aria-checked={checked}
    whileTap={{ scale: 0.9 }}
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
    transition={{ duration: 0.15 }}
    // The off-state track has to follow the theme, so it comes from the
    // overlay token rather than a baked-in white.
    className={`relative inline-flex w-8 h-[18px] rounded-full flex-shrink-0 cursor-pointer transition-colors ${
      checked ? 'bg-yellow-500' : 'bg-overlay-strong'
    }`}
  >
    <motion.span
      layout
      animate={{ x: checked ? 17 : 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
      className={`absolute top-0.5 w-3.5 h-3.5 rounded-full ${checked ? 'bg-white' : 'bg-content-muted'}`}
    />
  </motion.span>
);

// A compact, native-feeling picker used for both the execution and unit
// selectors — springy scale-in instead of a flat fade, a colored accent dot
// on the active row instead of a plain checkmark, and sized to its content
// rather than a fixed oversized box.
const SelectMenu = ({ open, options, value, onSelect, align = 'left', direction = 'down' }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: direction === 'down' ? -4 : 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: direction === 'down' ? -4 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ transformOrigin: `${direction === 'down' ? 'top' : 'bottom'} ${align === 'left' ? 'left' : 'right'}` }}
        className={`absolute ${direction === 'down' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'} min-w-[104px] max-h-56 overflow-y-auto custom-scrollbar ${
          align === 'left' ? 'left-0' : 'right-0'
        } rounded-lg bg-surface-raised border border-hairline shadow-xl shadow-black/50 divide-y divide-hairline z-20`}
      >
        {options.map(({ value: v, label }) => {
          const active = v === value;
          return (
            <button
              key={v}
              onClick={() => onSelect(v)}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-[12px] font-semibold uppercase tracking-wide transition-colors ${
                active ? 'bg-yellow-600/15 text-yellow-600 dark:text-yellow-400' : 'text-content-muted hover:bg-overlay'
              }`}
            >
              {label}
              {active && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 flex-shrink-0" />}
            </button>
          );
        })}
      </motion.div>
    )}
  </AnimatePresence>
);


// Leverage gets its own compact grid instead of the vertical SelectMenu list —
// 8 stacked rows was tall enough to spill past the viewport and force a page
// scroll; a 4-column grid fits the same options in a fraction of the height.
const LeverageMenu = ({ open, value, onSelect }) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ transformOrigin: 'bottom right' }}
        className="absolute right-0 bottom-full mb-1.5 w-44 p-1.5 grid grid-cols-4 gap-1 rounded-lg bg-surface-raised border border-hairline shadow-xl shadow-black/50 z-20"
      >
        {LEVERAGE_OPTIONS.map((l) => {
          const overMax = l > MAX_LEVERAGE;
          return (
            <button
              key={l}
              onClick={() => onSelect(l)}
              className={`h-8 rounded text-[11px] font-bold font-tabular transition-colors ${
                l === value
                  ? 'bg-yellow-600 text-black'
                  : overMax
                    ? 'text-content-faint/40 cursor-not-allowed'
                    : 'text-content-muted hover:bg-overlay-strong'
              }`}
            >
              {l}x
            </button>
          );
        })}
      </motion.div>
    )}
  </AnimatePresence>
);

const OrderPanel = ({ currentPrice, asset, serverTradable }) => {
  const { t } = useTranslation();
  const { addPosition, addPendingOrder, tradingBlocked } = useTrading();
  const { getInstrument } = useInstruments();
  const { quoteFor, tradeStatusFor } = useLiveRates();
  const { balance } = useAccount();
  const [submitting, setSubmitting] = useState(false);
  // The desktop terminal has a whole column for the ticket, so it is never
  // collapsed there — the collapsed strip exists to save space on a phone.
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [expanded, setExpanded] = useState(false);
  const [execution, setExecution] = useState('market'); // market | pending
  const [lots, setLots] = useState(0.01);
  const [lotsInput, setLotsInput] = useState('0.01');
  const [unit, setUnit] = useState('lots');
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [leverageMenuOpen, setLeverageMenuOpen] = useState(false);
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);
  const [slOn, setSlOn] = useState(false);
  const [tpOn, setTpOn] = useState(false);
  const [slValue, setSlValue] = useState('');
  const [tpValue, setTpValue] = useState('');
  const [pulse, setPulse] = useState(null); // { side, id } — a one-shot flash on the tapped button
  const [confirmSide, setConfirmSide] = useState(null); // 'buy' | 'sell' | null — pending confirmation
  // The price a pending order waits for. Kept as text while it is being typed
  // so a half-entered "62" is not read as a target of sixty-two dollars.
  const [targetInput, setTargetInput] = useState('');

  const instrument = getInstrument(asset);
  const decimals = instrument.decimals;

  // Switching instrument puts the ticket back on the book default. A value
  // the client picked for gold must not size a bitcoin order.
  useEffect(() => {
    setLeverage(DEFAULT_LEVERAGE);
  }, [asset]);

  /**
   * The two-sided quote, from the broker's own feed.
   *
   * The spread is a percentage of the mid and differs by side — it is not a
   * single price-unit amount split evenly, which is what this used to assume.
   * On Bitcoin the difference between the two readings is thousands of
   * dollars.
   */
  const { bid, ask } = quoteFor(asset);

  const contractSize = instrument.contractSize || 1;

  /**
   * Both input modes resolve to the one formula the server uses:
   *
   *   margin = lots × contractSize × entry ÷ leverage
   *
   * In lots mode the trader names the size and the margin follows. In USD
   * mode they name the margin and the size follows — the inverse of the same
   * equation, not a second rule. Contract size appears in both; without it a
   * fractional lot of a cheap instrument priced out at fractions of a cent.
   */
  const step = unit === 'lots' ? LOT_STEP : USD_STEP;
  const referencePrice = currentPrice || instrument.price || ((bid + ask) / 2) || 0;

  // Recalc from what is in the box, the way the previous ticket did — waiting
  // for blur left margin, notional and SL/TP stuck on the last committed lot.
  // An empty or half-typed box (".", "0.", "001.") falls back to the last
  // committed size so tapping Buy after selecting 0.01 does not reject.
  const typedSize = parseLotInput(lotsInput);
  const liveSize =
    Number.isFinite(typedSize) && !isLotInputPartial(lotsInput)
      ? typedSize
      : lots > 0
        ? lots
        : 0;

  const effectiveLots =
    unit === 'lots'
      ? liveSize
      : lotsForMargin({ margin: liveSize, contractSize, entryPrice: referencePrice, leverage });

  const notional = computeNotional({ lots: effectiveLots, contractSize, entryPrice: referencePrice });
  const initialMargin =
    unit === 'lots'
      ? computeMargin({ lots: effectiveLots, contractSize, entryPrice: referencePrice, leverage })
      : liveSize;

  const marginPct = balance.equity > 0 ? (initialMargin / balance.equity) * 100 : 0;

  // Whether this instrument can be traded at all right now.
  const { tradeable, reason: closedReason } = tradeStatusFor(asset, serverTradable);
  const canTrade = tradeable && !tradingBlocked && !submitting;

  const targetPrice = parseFloat(targetInput);
  const targetValid = Number.isFinite(targetPrice) && targetPrice > 0;

  // Opening the pending ticket seeds the target with the current price, so the
  // client edits a real number instead of facing an empty box. Switching back
  // to market clears it: a stale target from three instruments ago is worse
  // than no target at all.
  useEffect(() => {
    if (execution === 'pending') setTargetInput(currentPrice.toFixed(decimals));
    else setTargetInput('');
    // Only when the mode or the instrument changes — not on every tick, which
    // would overwrite whatever the client is typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [execution, asset]);

  // Keep the box in sync with +/- and unit switches, but not while the
  // trader is typing — toFixed would rewrite "0.1" as "0.10" mid-keystroke.
  const lotsFieldFocused = useRef(false);
  useEffect(() => {
    if (lotsFieldFocused.current) return;
    setLotsInput(formatTicketSize(lots, unit));
  }, [lots, unit]);

  const stepLots = (dir) => {
    setLots((prev) => {
      const decimals = unit === 'lots' ? LOT_DECIMALS : 2;
      const min = unit === 'lots' ? MIN_LOT : USD_STEP;
      const next = parseFloat((prev + dir * step).toFixed(decimals));
      return next < min ? min : next;
    });
  };

  // Let the trader type an exact amount instead of only tapping +/-. Free
  // typing is allowed while focused; lots accept three decimals (0.001)
  // the way the previous ticket did — do not snap that back to 0.01.
  const commitLotsInput = () => {
    const parsed = parseLotInput(lotsInput);
    const min = unit === 'lots' ? MIN_LOT : USD_STEP;
    const decimals = unit === 'lots' ? LOT_DECIMALS : 2;
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setLots(lots > 0 ? lots : min);
      return;
    }
    const rounded = parseFloat(parsed.toFixed(decimals));
    setLots(rounded < min ? min : rounded);
  };

  // Switching units resets the amount to a sensible default for that unit —
  // 0.01 lots and $10 mean very different position sizes, so carrying the raw
  // number across would silently 20x (or 1/20th) the position.
  const changeUnit = (nextUnit) => {
    if (nextUnit === unit) return;
    setUnit(nextUnit);
    setLots(nextUnit === 'lots' ? LOT_STEP : 100);
  };

  // Tapping SELL/BUY no longer fires the order straight away — it opens a
  // confirmation summary first; handlePlaceOrder is the actual submit,
  // invoked from that modal's Confirm button.
  const requestOrder = (orderSide) => {
    /**
     * Refuse here rather than let the server do it. A closed venue, a
     * suspended instrument or an account barred from trading all produce the
     * same rejection a second later, and the client is owed the reason now.
     */
    if (tradingBlocked) {
      toast({
        title: t('orderPanel.toast.tradingBlockedTitle'),
        description: t('orderPanel.toast.tradingBlockedDesc'),
        variant: 'destructive',
      });
      return;
    }
    if (!tradeable) {
      toast({
        title: t('orderPanel.toast.marketClosedTitle'),
        description: t(`orderPanel.toast.marketClosed.${closedReason || 'closed'}`),
        variant: 'destructive',
      });
      return;
    }

    // A pending order needs a price, and the field that holds it only exists
    // on the expanded ticket — so open it rather than rejecting the tap. On
    // desktop the ticket is always expanded and `expanded` stays false, which
    // is why this has to ask about the breakpoint and not just the flag.
    if (execution === 'pending' && !expanded && !isDesktop) {
      setExpanded(true);
      return;
    }
    if (execution === 'pending' && !targetValid) {
      toast({
        title: t('orderPanel.toast.invalidTargetTitle'),
        description: t('orderPanel.toast.invalidTargetDesc'),
        variant: 'destructive',
      });
      return;
    }
    commitLotsInput();
    const size = Number.isFinite(typedSize) && !isLotInputPartial(lotsInput)
      ? typedSize
      : lots > 0
        ? lots
        : 0;
    if (!size || size <= 0) {
      toast({
        title: t('orderPanel.toast.invalidAmountTitle'),
        description: t('orderPanel.toast.invalidAmountDesc'),
        variant: 'destructive',
      });
      return;
    }
    setConfirmSide(orderSide);
  };

  /**
   * The dollar threshold the server stores for a protective price.
   *
   * The trader types a price. The backend closes by P&L (`profit >= TP` /
   * `profit <= -SL`), and both columns are `min:0`, so the ticket converts
   * the level into a positive USD amount before it leaves.
   */
  const protectiveAmount = (value, entryPrice) => {
    const parsed = parseFloat(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return priceLevelToAmount({
      level: parsed,
      entryPrice,
      lots: effectiveLots,
      contractSize,
    });
  };

  // Live preview of that conversion — the side is not chosen yet, so the
  // mid (or the pending target) is close enough for the figure next to the box.
  const previewEntry = execution === 'pending' && targetValid ? targetPrice : currentPrice;

  const handlePlaceOrder = async (orderSide) => {
    setConfirmSide(null);
    setPulse({ side: orderSide, id: Date.now() });
    setSubmitting(true);

    const isPending = execution === 'pending';

    /**
     * The entry price is the side of the book the order crosses, derived the
     * same way the server derives it. A pending order opens at the level the
     * client named instead.
     */
    const entryPrice = isPending ? targetPrice : getEntryPrice(orderSide, currentPrice, instrument);

    const ticket = {
      symbol: instrument.ex_sym || instrument.symbol || asset,
      side: orderSide,
      entryPrice,
      lots: Number(Number(effectiveLots).toFixed(6)),
      contractSize,
      leverage,
      margin: computeMargin({ lots: effectiveLots, contractSize, entryPrice, leverage }),
      spread: getSpreadPercent(orderSide, instrument),
      stopLoss: slOn ? protectiveAmount(slValue, entryPrice) : 0,
      takeProfit: tpOn ? protectiveAmount(tpValue, entryPrice) : 0,
      pendingPrice: isPending ? targetPrice : 0,
    };

    // The server decides whether this becomes a position or joins the resting
    // queue, from pendingOrder; both go through the same endpoint.
    const result = isPending ? await addPendingOrder(ticket) : await addPosition(ticket);
    setSubmitting(false);

    if (!result?.ok) {
      toast({
        title: t('orderPanel.toast.rejectedTitle'),
        description: result?.message || t('orderPanel.toast.rejectedDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (isPending) {
      toast({
        title: t('orderPanel.toast.pendingPlacedTitle'),
        description: t('orderPanel.toast.pendingPlacedDesc', {
          orderType: t(`orderPanel.${orderSide}`),
          amount: lots,
          asset,
          price: targetPrice.toFixed(decimals),
        }),
      });
      return;
    }

    toast({
      title: orderSide === 'buy' ? t('orderPanel.toast.buyOrderPlaced') : t('orderPanel.toast.sellOrderPlaced'),
      description: t('orderPanel.toast.orderDesc', {
        orderType: t(`orderPanel.${orderSide}`),
        amount: lots,
        asset,
        price: entryPrice.toFixed(decimals),
        leverage,
      }),
    });
  };

  const marginLine = (
    <p className="text-center text-[10.5px] text-content-muted font-tabular leading-none">
      {t('orderPanel.initMargin')}: <span className="text-content">~${initialMargin.toFixed(2)}</span>{' '}
      <span className="text-content-faint">({marginPct.toFixed(2)}%)</span>{' '}
      <span className="text-content-faint">· {leverage}x</span>
    </p>
  );

  const lotStepper = (
    <div className="flex-1 flex items-center justify-between rounded-md bg-overlay h-8 px-0.5">
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => stepLots(-1)}
        className="w-6 h-6 flex items-center justify-center text-content-muted hover:text-content transition-colors flex-shrink-0"
      >
        <Minus className="w-3.5 h-3.5" />
      </motion.button>
      <div className="text-center leading-none">
        <input
          type="text"
          inputMode="decimal"
          dir="ltr"
          lang="en"
          autoComplete="off"
          value={lotsInput}
          onChange={(e) => {
            const v = e.target.value;
            const allowed = unit === 'lots'
              ? /^[0-9٠-٩۰-۹]*[.,٫]?[0-9٠-٩۰-۹]{0,3}$/
              : /^[0-9٠-٩۰-۹]*[.,٫]?[0-9٠-٩۰-۹]{0,2}$/;
            if (!allowed.test(v)) return;
            setLotsInput(v);
            const parsed = parseLotInput(v);
            if (Number.isFinite(parsed)) setLots(parsed);
          }}
          onBlur={() => {
            lotsFieldFocused.current = false;
            commitLotsInput();
          }}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          onFocus={() => {
            lotsFieldFocused.current = true;
          }}
          className="w-16 text-center text-[13.5px] leading-none font-semibold text-content font-tabular bg-transparent focus:outline-none focus:bg-overlay-strong rounded"
        />
        <div className="text-[9.5px] text-content-faint leading-none mt-px">{unit === 'lots' ? t('orderPanel.lots') : 'USD'}</div>
      </div>
      <motion.button
        whileTap={{ scale: 0.8 }}
        onClick={() => stepLots(1)}
        className="w-6 h-6 flex items-center justify-center text-content-muted hover:text-content transition-colors flex-shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
      </motion.button>
    </div>
  );

  // The bottom action bar is the same one-tap SELL/lots/BUY control in both
  // the collapsed and expanded states — no separate "which side" toggle needed.
  const flash = (side) => (
    <AnimatePresence>
      {pulse?.side === side && (
        <motion.span
          key={pulse.id}
          initial={{ opacity: 0.55, scale: 0.6 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          onAnimationComplete={() => setPulse((p) => (p?.id === pulse.id ? null : p))}
          className="absolute inset-0 rounded-lg bg-white pointer-events-none"
        />
      )}
    </AnimatePresence>
  );

  const quoteBar = (
    <div className="flex items-stretch gap-1">
      <motion.button
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => requestOrder('buy')}
        className="relative overflow-hidden flex-1 min-w-0 h-8 rounded-md bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-colors flex flex-col items-center justify-center px-1"
      >
        {flash('buy')}
        <span className="text-[9.5px] font-semibold text-white/85 leading-none">{t('orderPanel.buyLong')}</span>
        <span className="text-[13.5px] font-bold text-white font-tabular leading-none mt-0.5">{bid.toFixed(decimals)}</span>
      </motion.button>

      {lotStepper}

      <motion.button
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        onClick={() => requestOrder('sell')}
        className="relative overflow-hidden flex-1 min-w-0 h-8 rounded-md bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors flex flex-col items-center justify-center px-1"
      >
        {flash('sell')}
        <span className="text-[9.5px] font-semibold text-white/85 leading-none">{t('orderPanel.sellShort')}</span>
        <span className="text-[13.5px] font-bold text-white font-tabular leading-none mt-0.5">{ask.toFixed(decimals)}</span>
      </motion.button>
    </div>
  );

  /**
   * Order confirmation.
   *
   * A ticket is a list of facts, so it is laid out as one: label on the left,
   * value on the right, one line each. It used to open with the price set at
   * 26px under a coloured side badge, with the size, execution and leverage
   * folded into a sentence below — a panel twice this tall that still had to
   * be read twice to find the leverage.
   *
   * Centred on a desktop, where a sheet climbing out of the bottom edge of a
   * 1500px window is the wrong gesture; still a bottom sheet on a phone.
   */
  /**
   * Margin gains decimals as it shrinks, so a small commitment is still a
   * number rather than $0.00.
   *
   * It shrinks this far because `lots` is being multiplied as though one lot
   * were one unit of the instrument — 0.01 lots of XRP is priced as 0.01 XRP.
   * Once src/config/instruments.js carries a contract size per instrument
   * this reads like a real ticket; the formatting is not the bug.
   */
  const marginText = `$${
    initialMargin < 0.01
      ? initialMargin.toFixed(4)
      : initialMargin < 1
      ? initialMargin.toFixed(3)
      : initialMargin.toFixed(2)
  }`;

  const confirmEntry = confirmSide
    ? execution === 'pending'
      ? targetPrice
      : getEntryPrice(confirmSide, currentPrice, instrument)
    : 0;
  const confirmSlUsd = slOn ? protectiveAmount(slValue, confirmEntry) : 0;
  const confirmTpUsd = tpOn ? protectiveAmount(tpValue, confirmEntry) : 0;

  const confirmRows = confirmSide
    ? [
        { id: 'pair', label: t('orderPanel.pair'), value: instrument.sym || instrument.symbol || asset },
        { id: 'type', label: t('orderPanel.type'), value: execution === 'market' ? t('orderPanel.market') : t('orderPanel.pending'), upper: true },
        { id: 'margin', label: t('openTrades.margin'), value: marginText },
        { id: 'leverage', label: t('orderPanel.leverage'), value: `${leverage}x` },
        {
          id: 'lot',
          label: unit === 'lots' ? t('orderPanel.lot') : 'USD',
          value: formatTicketSize(liveSize || lots, unit),
        },
        {
          id: 'entry',
          label: t('orderPanel.entryPrice'),
          value: confirmEntry.toFixed(decimals),
          strong: true,
        },
        // Protective levels only earn a line when there is one to show.
        // The box is a price; the figure in brackets is the USD that will
        // actually be sent — the two are not the same number.
        ...(slOn || tpOn
          ? [
              {
                id: 'sltp',
                label: `${t('openTrades.sl')} / ${t('openTrades.tp')}`,
                value: `${
                  slOn && slValue ? `${slValue} ($${confirmSlUsd.toFixed(2)})` : '—'
                } / ${
                  tpOn && tpValue ? `${tpValue} ($${confirmTpUsd.toFixed(2)})` : '—'
                }`,
              },
            ]
          : []),
      ]
    : [];

  const confirmMotion = isDesktop
    ? {
        initial: { opacity: 0, scale: 0.96, y: 6 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.97, y: 4 },
        transition: { type: 'spring', stiffness: 520, damping: 36 },
      }
    : {
        initial: { y: '100%' },
        animate: { y: 0 },
        exit: { y: '100%' },
        transition: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.26 },
      };

  // Portalled to <body>. The page wrapper settles at opacity 0.999512 after
  // framer's route transition, and any opacity < 1 opens a stacking context —
  // which would trap this sheet's z-index inside the page and let the fixed
  // bottom nav paint over it, however high we set the number.
  const confirmModal = createPortal(
    <AnimatePresence>
      {confirmSide && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setConfirmSide(null)}
            className="fixed inset-0 z-[90] bg-black/60"
          />

          {/* The frame does not take clicks, so anything outside the card
              still reaches the backdrop and closes the ticket. */}
          <div
            className={`fixed inset-0 z-[91] flex justify-center pointer-events-none ${
              isDesktop ? 'items-center p-4' : 'items-end'
            }`}
          >
            <motion.div
              {...confirmMotion}
              className={`pointer-events-auto w-full overflow-hidden border-hairline bg-surface-raised ${
                isDesktop
                  ? 'w-[336px] rounded-2xl border shadow-2xl shadow-black/50'
                  : 'rounded-t-2xl border-t'
              }`}
            >
              {/* The instrument by name and which way the trade goes — the two
                  things worth reading before the numbers. */}
              <div className="flex items-center justify-between gap-3 h-11 px-4 border-b border-hairline">
                <div className="flex items-center gap-2 min-w-0">
                  <h3 className="text-[14px] font-semibold text-content truncate">{instrument.sym || instrument.symbol || instrument.name}</h3>
                  <span
                    className={`flex items-center gap-0.5 text-[12px] font-semibold flex-shrink-0 ${
                      confirmSide === 'buy' ? 'text-gain' : 'text-loss'
                    }`}
                  >
                    {confirmSide === 'buy' ? t('orderPanel.buy') : t('orderPanel.sell')}
                    {confirmSide === 'buy' ? (
                      <ArrowUp className="w-3 h-3" strokeWidth={2.5} />
                    ) : (
                      <ArrowDown className="w-3 h-3" strokeWidth={2.5} />
                    )}
                  </span>
                </div>
                <button
                  onClick={() => setConfirmSide(null)}
                  className="flex-shrink-0 w-6 h-6 -mr-1 flex items-center justify-center rounded-md text-content-faint hover:text-content hover:bg-overlay transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-4 divide-y divide-hairline">
                {confirmRows.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 py-[7px]">
                    <span className="text-[12px] text-content-faint">{row.label}</span>
                    <span
                      className={`text-[12.5px] font-tabular truncate ${
                        row.strong ? 'font-semibold' : ''
                      } ${row.upper ? 'uppercase tracking-wide' : ''} ${row.tone || 'text-content'}`}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className={`flex gap-2 px-4 pt-3 ${isDesktop ? 'pb-4' : 'pb-5'}`}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setConfirmSide(null)}
                  className="flex-1 h-9 rounded-lg border border-hairline text-content-muted hover:bg-overlay hover:text-content font-semibold text-[13px] transition-colors"
                >
                  {t('orderPanel.cancel')}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handlePlaceOrder(confirmSide)}
                  className={`flex-[1.6] h-9 rounded-lg text-white font-bold text-[13px] transition-colors ${
                    confirmSide === 'buy'
                      ? 'bg-emerald-600 hover:bg-emerald-500'
                      : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {t('orderPanel.confirm')} {confirmSide === 'buy' ? t('orderPanel.buy') : t('orderPanel.sell')}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );

  // Label + toggle on top (with a clean segmented Price/$ control appearing
  // next to the switch only once it's relevant), a full-width input below —
  // no nested boxes, no cramped abbreviations.
  /**
   * One row per field: label, value, unit, switch. The value used to drop onto
   * a second full-width line below, so an enabled Stop Loss and Take Profit
   * cost four rows between them. This costs two, and nothing moves when you
   * toggle one on — the input expands into the space already there.
   */
  const slTpField = (label, on, setOn, value, setValue, placeholder) => {
    const usd = on ? protectiveAmount(value, previewEntry) : 0;
    return (
      <div
        className={`flex items-center gap-2 h-8 rounded-md px-2 transition-colors ${
          on ? 'bg-overlay' : 'bg-transparent'
        }`}
      >
        <span
          className={`text-[13px] flex-shrink-0 transition-colors ${
            on ? 'text-content' : 'text-content-muted'
          }`}
        >
          {label}
        </span>

        <AnimatePresence initial={false} mode="popLayout">
          {on && (
            <motion.div
              key="value"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ type: 'spring', stiffness: 460, damping: 38 }}
              className="flex-1 min-w-0 flex items-center gap-1.5 overflow-hidden"
            >
              <div className="relative flex-1 min-w-0">
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={placeholder}
                  className="w-full h-[24px] px-2 rounded bg-surface text-[13px] text-content font-tabular placeholder:text-content-faint focus:outline-none focus:ring-1 focus:ring-yellow-500/50 transition-shadow"
                />
              </div>
              {/* The dollar figure that will be sent. The box is a price. */}
              <span className="flex-shrink-0 text-[10px] font-tabular text-content-faint min-w-[3.5rem] text-right">
                {usd > 0 ? `$${usd.toFixed(2)}` : '—'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`flex items-center flex-shrink-0 ${on ? '' : 'ml-auto'}`}>
          <Toggle checked={on} onChange={setOn} />
        </div>
      </div>
    );
  };

  /* ---------- Collapsed: one-tap ticket ---------- */
  if (!expanded && !isDesktop) {
    return (
      <div className="glassmorphism rounded-lg">
        <div className="flex items-center gap-1 px-2 pt-1.5">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setExecution((e) => (e === 'market' ? 'pending' : 'market'))}
            className="flex items-center gap-1 h-[30px] px-2 rounded-md bg-overlay hover:bg-overlay-strong text-[11.5px] font-semibold text-content tracking-wide uppercase transition-colors flex-shrink-0"
          >
            {execution === 'market' ? t('orderPanel.market') : t('orderPanel.pending')}
            <ArrowUpDown className="w-3 h-3 text-content-faint" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setExpanded(true)}
            className={`h-[30px] flex-1 rounded-md text-[11.5px] font-semibold tracking-wide transition-colors ${
              slOn || tpOn ? 'bg-yellow-600/20 text-yellow-700 dark:text-yellow-300' : 'bg-overlay hover:bg-overlay-strong text-content-muted'
            }`}
          >
            {slOn || tpOn ? t('orderPanel.slTpSet') : t('orderPanel.slTp')}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => changeUnit(unit === 'lots' ? 'USD' : 'lots')}
            className="flex items-center gap-1 h-[30px] px-2 rounded-md bg-overlay hover:bg-overlay-strong text-[11.5px] font-semibold text-content tracking-wide uppercase transition-colors flex-shrink-0"
          >
            {unit === 'lots' ? t('orderPanel.lot') : 'USD'}
            <ArrowLeftRight className="w-3 h-3 text-content-faint" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setExpanded(true)}
            className="h-[30px] w-[30px] rounded-md bg-overlay hover:bg-overlay-strong flex items-center justify-center text-content-muted transition-colors flex-shrink-0"
          >
            <ChevronUp className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="py-1.5">{marginLine}</div>

        <div className="px-2 pb-2">{quoteBar}</div>

        {confirmModal}
      </div>
    );
  }

  /* ---------- Expanded: simplified order ticket — just the controls that matter ---------- */
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="glassmorphism rounded-lg p-2.5 space-y-2"
    >
      {/* Execution mode and the collapse control share one row — no dedicated
          row just for the chevron, which was leaving a gap above it. On
          desktop there is nothing to collapse to, so the two modes take the
          full width instead of leaving a 30px stub. */}
      <div className={`grid gap-1 ${isDesktop ? 'grid-cols-2' : 'grid-cols-[1fr_1fr_auto]'}`}>
        {EXECUTIONS.map((mode) => (
          <motion.button
            key={mode}
            whileTap={{ scale: 0.96 }}
            onClick={() => setExecution(mode)}
            className={`h-[30px] rounded-md text-[11.5px] font-semibold tracking-wide uppercase transition-colors ${
              execution === mode ? 'bg-yellow-600/20 text-yellow-700 dark:text-yellow-300 ring-1 ring-inset ring-yellow-500/40' : 'bg-overlay text-content-faint hover:text-content-muted'
            }`}
          >
            {mode === 'market' ? t('orderPanel.market') : t('orderPanel.pending')}
          </motion.button>
        ))}
        {!isDesktop && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setExpanded(false)}
            className="h-[30px] w-[30px] rounded-md bg-overlay-strong hover:bg-overlay-strong flex items-center justify-center text-content-muted transition-colors flex-shrink-0"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        )}
      </div>

      {/* The price a pending order waits for. It is the whole content of a
          pending ticket — without it the mode did nothing but change a label,
          which is what it used to do. */}
      <AnimatePresence initial={false}>
        {execution === 'pending' && (
          <motion.div
            key="target"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 460, damping: 38 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 h-8 rounded-md px-2 bg-overlay">
              <span className="text-[13px] text-content flex-shrink-0">{t('orderPanel.target')}</span>
              <div className="relative flex-1 min-w-0">
                <input
                  type="text"
                  inputMode="decimal"
                  value={targetInput}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (/^\d*\.?\d*$/.test(v)) setTargetInput(v);
                  }}
                  onFocus={(e) => e.target.select()}
                  placeholder={currentPrice.toFixed(decimals)}
                  className="w-full h-[24px] px-2 rounded bg-surface text-[13px] text-content font-tabular placeholder:text-content-faint focus:outline-none focus:ring-1 focus:ring-yellow-500/50 transition-shadow"
                />
              </div>
              {/* What it costs right now, so the target is chosen against a
                  number rather than from memory. */}
              <span className="flex-shrink-0 text-[10px] font-tabular text-content-faint">
                {currentPrice.toFixed(decimals)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {slTpField(t('orderPanel.stopLoss'), slOn, setSlOn, slValue, setSlValue, (bid * 0.999).toFixed(decimals))}
      {slTpField(t('orderPanel.takeProfit'), tpOn, setTpOn, tpValue, setTpValue, (ask * 1.001).toFixed(decimals))}

      <div className="flex items-stretch gap-1">
        {lotStepper}
        <div className="relative flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setLeverageMenuOpen((v) => !v)}
            className={`h-8 px-2 rounded-md flex items-center gap-1 text-[12.5px] font-semibold font-tabular transition-colors ${
              leverageMenuOpen ? 'bg-yellow-600/20 text-yellow-700 dark:text-yellow-300 ring-1 ring-yellow-500/40' : 'bg-overlay hover:bg-overlay-strong text-content'
            }`}
          >
            {leverage}x
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </motion.button>
          <LeverageMenu
            open={leverageMenuOpen}
            value={leverage}
            onSelect={(v) => {
              setLeverageMenuOpen(false);
              if (v === leverage) return;
              if (v > MAX_LEVERAGE) {
                toast({
                  title: t('orderPanel.toast.leverageMaxTitle'),
                  description: t('orderPanel.toast.leverageMax', { max: MAX_LEVERAGE }),
                });
                return;
              }
              setLeverage(v);
            }}
          />
        </div>
        <div className="relative flex-shrink-0">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setUnitMenuOpen((v) => !v)}
            className={`h-8 px-2 rounded-md flex items-center gap-1 text-[12.5px] font-semibold uppercase tracking-wide transition-colors ${
              unitMenuOpen ? 'bg-yellow-600/20 text-yellow-700 dark:text-yellow-300 ring-1 ring-yellow-500/40' : 'bg-overlay hover:bg-overlay-strong text-content'
            }`}
          >
            {unit === 'lots' ? t('orderPanel.lots') : unit}
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </motion.button>
          <SelectMenu
            open={unitMenuOpen}
            options={UNITS.map((u) => ({ value: u, label: u === 'lots' ? t('orderPanel.lots') : u }))}
            value={unit}
            align="right"
            onSelect={(v) => {
              changeUnit(v);
              setUnitMenuOpen(false);
            }}
          />
        </div>
      </div>

      {marginLine}

      {quoteBar}

      {confirmModal}
    </motion.div>
  );
};

export default OrderPanel;
