import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronDown, X, Briefcase } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useTrading } from '@/context/TradingContext';
import { useInstruments } from '@/context/InstrumentsContext';
import { displaySym } from '@/adapters/instrument';
import { calcRoi } from '@/domain/pnl';
import { cn } from '@/lib/utils';

// Every fact on a position row is written the same way — a faint uppercase
// key next to a tabular value — so the columns read as columns instead of as
// a sentence. Replaced filled coloured pills, which gave a level that is
// usually not even set the same visual weight as the P&L.
const Key = ({ children }) => (
  <span className="text-[9px] font-semibold uppercase tracking-wider text-content-faint">{children}</span>
);

const Val = ({ children, className }) => (
  <span className={cn('text-[10.5px] font-tabular text-content-muted', className)}>{children}</span>
);

/**
 * `wide` is set by the pages that hand this list the whole window; the trade
 * station's 725px panel leaves it off.
 *
 * It cannot be a CSS breakpoint. Breakpoints measure the viewport, and both
 * layouts are rendered at the same viewport width — only the container
 * differs. A wide list holds its columns in proportion and shows one more of
 * them, a field already in the data that is otherwise behind the expander.
 */
const OpenTrades = ({ wide = false }) => {
  const { t } = useTranslation();
  const { positions, closePosition, closeAllPositions, pendingOrders, cancelOrder, closedTrades } =
    useTrading();
  const { getInstrument } = useInstruments();
  const [busyId, setBusyId] = useState(null);
  const [activeTab, setActiveTab] = useState('positions');
  const [openCard, setOpenCard] = useState(null);
  const [confirmCloseAll, setConfirmCloseAll] = useState(false);

  const TABS = [
    { key: 'positions', label: t('openTrades.tabs.positions'), count: positions.length },
    { key: 'pending', label: t('openTrades.tabs.pending'), count: pendingOrders.length },
    { key: 'closed', label: t('openTrades.tabs.closed'), count: closedTrades.length },
  ];

  /**
   * Timestamps render as 16/09, 08:02 — day first, 24 hour, no year.
   *
   * Positions carry an ISO timestamp; this used to be stored preformatted as
   * "09/14/2026, 05:05:30 PM", 23 characters that were cut to "05/16/2..." in
   * the detail grid and stubbornly American whatever the language. The format
   * is fixed rather than locale-derived so a row never changes width when the
   * language changes, and so no client has to guess whether 09/16 is
   * September or a day that does not exist.
   */
  const stamp = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const money = (n) =>
    `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const signed = (n) => `${n < 0 ? '-' : '+'}${money(n)}`;

  /**
   * These now travel to the server, so the outcome is no longer certain and
   * the toast can no longer be written before it is known. The row is locked
   * while its request is in flight — closing a position twice would have the
   * second attempt fail against a position that no longer exists.
   */
  const handleClosePosition = async (id) => {
    setBusyId(id);
    const result = await closePosition(id);
    setBusyId(null);
    toast(
      result?.ok
        ? {
            title: t('openTrades.toast.tradeClosedTitle'),
            description: t('openTrades.toast.tradeClosedDesc'),
          }
        : {
            title: t('openTrades.toast.closeFailedTitle'),
            description: result?.message || t('openTrades.toast.closeFailedDesc'),
            variant: 'destructive',
          }
    );
  };

  const handleCancelOrder = async (id) => {
    setBusyId(id);
    const result = await cancelOrder(id);
    setBusyId(null);
    toast(
      result?.ok
        ? {
            title: t('openTrades.toast.orderCancelledTitle'),
            description: t('openTrades.toast.orderCancelledDesc'),
          }
        : {
            title: t('openTrades.toast.cancelFailedTitle'),
            description: result?.message || t('openTrades.toast.closeFailedDesc'),
            variant: 'destructive',
          }
    );
  };

  // Closing every position at once is irreversible and moves real money, so it
  // takes a second tap rather than firing on the first.
  const handleCloseAll = async () => {
    if (!confirmCloseAll) {
      setConfirmCloseAll(true);
      return;
    }
    const count = positions.length;
    setConfirmCloseAll(false);
    const result = await closeAllPositions();
    toast(
      result?.ok
        ? {
            title: t('openTrades.toast.allClosedTitle'),
            description: t('openTrades.toast.allClosedDesc', { count }),
          }
        : {
            title: t('openTrades.toast.closeFailedTitle'),
            description: result?.message || t('openTrades.toast.closeFailedDesc'),
            variant: 'destructive',
          }
    );
  };

  /**
   * Column widths. Fixed pixels in the panel, where they were measured
   * against its content; proportions on a full page, so the extra width goes
   * into the columns instead of into a margin down the right-hand side.
   */
  const col = {
    identity: wide ? 'lg:w-[18%]' : 'lg:w-[180px]',
    facts: wide ? 'lg:w-[24%]' : 'lg:flex-1 lg:min-w-0',
    closedFacts: wide ? 'lg:w-[26%] lg:min-w-[270px]' : 'lg:flex-1 lg:min-w-0',
    third: wide ? 'lg:w-[18%] lg:min-w-[150px]' : 'lg:w-[152px]',
    closedThird: wide ? 'lg:w-[18%] lg:min-w-[150px]' : 'lg:w-[176px]',
  };

  /**
   * In the trade station the panel is half the window, so its columns all
   * demanded more than it had: at 1280px they needed 755px of a 599px row and
   * the P&L — the number the whole row exists for — was pushed out of the card
   * and clipped. Protective levels and the close reason step aside there until
   * the window is wide enough to hold them, and stay reachable in the row's
   * own detail. On a phone, and on the full-width history page, nothing moves.
   */
  const secondary = wide ? '' : 'lg:hidden 2xl:flex';

  // The fourth column only exists on a full page. Every value in it is a
  // field the row already carries.
  const extra = (label, value) =>
    wide ? (
      <div className="hidden lg:flex items-baseline gap-1.5 lg:order-4 lg:w-[16%] lg:min-w-[120px] lg:flex-shrink-0">
        <Key>{label}</Key>
        <Val className="truncate">{value}</Val>
      </div>
    ) : null;

  /**
   * Prices are printed to the precision the instrument actually trades at.
   * A flat two decimals turned EUR/USD 1.0842 into 1.08 and XRP 0.5951 into
   * 0.60 — differences that are the whole trade at these sizes.
   */
  const price = (asset, n) => {
    const { decimals } = getInstrument(asset);
    return `$${n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  };

  const assetLabel = (asset) => displaySym(getInstrument(asset), asset);

  const empty = (message) => (
    <div className="text-center py-10 text-content-faint">
      <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-25" />
      <p className="text-[13px]">{message}</p>
    </div>
  );

  const sideBadge = (isLong) => (
    <span
      className={`px-1 py-px rounded text-[9.5px] font-semibold ${
        isLong ? 'bg-emerald-500/15 text-gain' : 'bg-red-500/15 text-loss'
      }`}
    >
      {isLong ? t('openTrades.long') : t('openTrades.short')}
    </span>
  );

  const outlineBadge = (label) => (
    <span className="px-1 py-px rounded text-[9.5px] font-semibold border border-hairline text-content-muted font-tabular">
      {label}
    </span>
  );

  /** Accent rail, border, raised surface — one shell for all three tabs. */
  const rowShell = (key, isLong, children) => (
    <div key={key} className="relative rounded-lg border border-hairline bg-surface-raised overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${isLong ? 'bg-emerald-500' : 'bg-red-500'}`} />
      {children}
    </div>
  );

  const slTpPair = (stopLoss, takeProfit, asset, className) => (
    <div
      className={cn(
        'flex items-baseline justify-end gap-3 ml-auto flex-shrink-0 lg:order-3 lg:ml-0 lg:justify-start',
        col.third,
        className
      )}
    >
      <span className="flex items-baseline gap-1">
        <Key>{t('openTrades.sl')}</Key>
        <Val className={stopLoss ? 'text-loss' : undefined}>{stopLoss ? money(stopLoss) : '—'}</Val>
      </span>
      <span className="flex items-baseline gap-1">
        <Key>{t('openTrades.tp')}</Key>
        <Val className={takeProfit ? 'text-gain' : undefined}>{takeProfit ? money(takeProfit) : '—'}</Val>
      </span>
    </div>
  );

  /* ---------- Pending: accepted, resting, not yet filled ---------- */
  const pendingList = (
    <div className="space-y-1.5">
      {pendingOrders.map((o) =>
        rowShell(
          o.id,
          o.side === 'BUY',
          <div className="pl-3 pr-2 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:flex-nowrap lg:gap-4">
            <div className={cn('flex items-center gap-1.5 min-w-0 lg:order-1 lg:flex-shrink-0', col.identity)}>
              <span className="text-[13px] font-semibold text-content truncate">{assetLabel(o.asset)}</span>
              {sideBadge(o.side === 'BUY')}
              {outlineBadge(`${o.leverage}x`)}
            </div>

            <div className="flex items-center gap-1 flex-shrink-0 ml-auto lg:order-5">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => handleCancelOrder(o.id)}
                title={t('openTrades.cancelOrder')}
                aria-label={t('openTrades.cancelOrder')}
                className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-content-faint hover:bg-red-500/15 hover:text-loss transition-colors"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* Forces the wrap: instrument and P&L own the first line. */}
            <div className="basis-full h-0 lg:hidden" />

            {/* Trigger plus both protective levels is one value more than a
                position carries, so on a phone each takes its own line rather
                than sharing the grid and squeezing the instrument name. */}
            <div className={cn('flex items-baseline gap-1.5 min-w-0 flex-shrink-0 lg:order-2', col.facts)}>
              <Key>{t('openTrades.lot')}</Key>
              <Val>{o.lots}</Val>
              <Key>{t('openTrades.target')}</Key>
              <Val className="truncate text-content">{price(o.asset, o.targetPrice)}</Val>
            </div>

            {slTpPair(o.stopLoss, o.takeProfit, o.asset)}

            {extra(t('openTrades.placed'), stamp(o.placedAt))}
          </div>
        )
      )}
    </div>
  );

  /* ---------- Closed: what the trade actually paid ---------- */
  const reasonTone = {
    takeProfit: 'text-gain',
    stopLoss: 'text-loss',
    marginCall: 'text-yellow-600 dark:text-yellow-400',
    manual: 'text-content-muted',
  };

  const closedList = (
    <div className="space-y-1.5">
      {closedTrades.map((c) => {
        const isOpen = openCard === c.id;
        return rowShell(
          c.id,
          c.side === 'BUY',
          <>
            {/* Tighter column gap than the other two tabs: a closed trade prints
                two six-figure prices where a position prints one. */}
            <div className="pl-3 pr-2 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:flex-nowrap lg:gap-3">
              <div className={cn('flex items-center gap-1.5 min-w-0 lg:order-1 lg:flex-shrink-0', col.identity)}>
                <span className="text-[13px] font-semibold text-content truncate">{assetLabel(c.asset)}</span>
                {sideBadge(c.side === 'BUY')}
                {outlineBadge(`${c.leverage}x`)}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 ml-auto lg:order-5">
                <span
                  className={`text-[13px] font-tabular font-semibold mr-1 ${
                    c.pnl > 0 ? 'text-gain' : c.pnl < 0 ? 'text-loss' : 'text-content-muted'
                  }`}
                >
                  {signed(c.pnl)}
                </span>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setOpenCard(isOpen ? null : c.id)}
                  className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors ${
                    isOpen ? 'text-content' : 'text-content-faint hover:text-content'
                  }`}
                >
                  <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.span>
                </motion.button>
              </div>

              {/* Forces the wrap: instrument and P&L own the first line. */}
              <div className="basis-full h-0 lg:hidden" />

              {/* A closed trade carries two prices where an open one carries
                  a single entry, so on a phone this takes its own full-width
                  line rather than sharing one and clipping the exit. */}
              <div className={cn('flex items-baseline gap-1.5 min-w-0 flex-shrink-0 lg:order-2', col.closedFacts)}>
                <Key>{t('openTrades.lot')}</Key>
                <Val>{c.lots}</Val>
                <Key>{t('openTrades.entry')}</Key>
                <Val>{price(c.asset, c.entryPrice)}</Val>
                <Key>{t('openTrades.closePrice')}</Key>
                <Val className="truncate text-content">{price(c.asset, c.exitPrice)}</Val>
              </div>

              {/* How it ended, and when — the two questions asked of a closed
                  trade that an open one never raises. */}
              <div
                className={cn(
                  'flex items-baseline justify-end gap-2 ml-auto flex-shrink-0 lg:order-3 lg:ml-0 lg:justify-start',
                  col.closedThird,
                  secondary
                )}
              >
                {reasonTone[c.closeReason] && (
                  <span className={`text-[10px] font-semibold ${reasonTone[c.closeReason]}`}>
                    {t(`openTrades.reason.${c.closeReason}`)}
                  </span>
                )}
                <Val>{stamp(c.closedAt)}</Val>
              </div>

              {extra(t('openTrades.opened'), stamp(c.openedAt))}
            </div>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="overflow-hidden"
                >
                  {/* Gross and net are both shown because they differ: swap
                      and commission are charged whatever the price did. */}
                  <div className="pl-3 pr-2 pb-2 pt-2 border-t border-hairline grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
                    {[
                      { label: t('openTrades.gross'), value: signed(c.grossPnl) },
                      ...(c.swap ? [{ label: t('openTrades.swap'), value: signed(c.swap) }] : []),
                      { label: t('openTrades.fee'), value: signed(c.commission) },
                      { label: t('openTrades.amount'), value: money(c.amount) },
                      {
                        label: t('openTrades.net'),
                        value: signed(c.pnl),
                        tone: c.pnl > 0 ? 'text-gain' : c.pnl < 0 ? 'text-loss' : 'text-content-muted',
                      },
                      { label: t('openTrades.margin'), value: money(c.amount) },
                      { label: t('openTrades.opened'), value: stamp(c.openedAt) },
                      {
                        label: t('openTrades.tabs.closed'),
                        value: stamp(c.closedAt),
                      },
                      ...(reasonTone[c.closeReason]
                        ? [
                            {
                              label: t('openTrades.reasonLabel'),
                              value: t(`openTrades.reason.${c.closeReason}`),
                              tone: reasonTone[c.closeReason],
                            },
                          ]
                        : []),
                    ].map((d) => (
                      <div key={d.label} className="min-w-0">
                        <p className="text-[9.5px] uppercase tracking-wide text-content-faint leading-tight">
                          {d.label}
                        </p>
                        <p className={`text-[11.5px] font-tabular leading-tight truncate ${d.tone || 'text-content'}`}>
                          {d.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        );
      })}
    </div>
  );

  const showCloseAll = activeTab === 'positions' && positions.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-4 border-b border-hairline">
        {/* No overflow container here: three short tabs never need to scroll,
            and overflow-x also forces overflow-y to auto, which turned the
            underline's 1px overhang into a scrollbar and clipped it. */}
        <div className="flex items-end gap-4 flex-1 min-w-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex items-center gap-1.5 whitespace-nowrap pb-2 text-[13px] transition-colors ${
                activeTab === tab.key ? 'font-semibold text-content' : 'font-medium text-content-faint hover:text-content-muted'
              }`}
            >
              {tab.label}
              {typeof tab.count === 'number' && (
                <span className="px-1 py-px rounded border border-hairline text-[10px] font-tabular text-content-muted">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && (
                <motion.span
                  layoutId="trades-tab-underline"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full bg-yellow-500"
                />
              )}
            </button>
          ))}
        </div>

        {showCloseAll && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleCloseAll}
            onBlur={() => setConfirmCloseAll(false)}
            onMouseLeave={() => setConfirmCloseAll(false)}
            className={`flex-shrink-0 mb-1.5 h-6 px-2 rounded-md text-[11px] font-semibold transition-colors ${
              confirmCloseAll
                ? 'bg-red-600 text-white'
                : 'border border-hairline text-content-muted hover:text-loss hover:border-loss/40'
            }`}
          >
            {confirmCloseAll ? t('openTrades.confirmCloseAll') : t('openTrades.closeAll')}
          </motion.button>
        )}
      </div>

      {activeTab === 'closed' ? (
        closedTrades.length === 0 ? empty(t('openTrades.noClosed')) : closedList
      ) : activeTab === 'pending' ? (
        pendingOrders.length === 0 ? empty(t('openTrades.noPending')) : pendingList
      ) : positions.length === 0 ? (
        <div className="text-center py-10 text-content-faint">
          <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-25" />
          <p className="text-[13px]">{t('openTrades.noTrades')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {positions.map((p) => {
            const roi = calcRoi(p.pnl, p.amount || p.margin);
            const isLong = p.side === 'BUY';
            const isOpen = openCard === p.id;

            return (
              <div key={p.id} className="relative rounded-lg border border-hairline bg-surface-raised overflow-hidden">
                <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${isLong ? 'bg-emerald-500' : 'bg-red-500'}`} />

                {/* Two rows on a phone, one aligned line on desktop. The
                    desktop columns are fixed widths so rows line up down the
                    list instead of each one breaking wherever its text ends,
                    and every label is set the same way: faint uppercase key,
                    tabular value. */}
                <div className="pl-3 pr-2 py-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:flex-nowrap lg:gap-4">
                  <div className={cn('flex items-center gap-1.5 min-w-0 lg:order-1 lg:flex-shrink-0', col.identity)}>
                    <span className="text-[13px] font-semibold text-content truncate">{assetLabel(p.asset)}</span>
                    <span
                      className={`px-1 py-px rounded text-[9.5px] font-semibold ${
                        isLong ? 'bg-emerald-500/15 text-gain' : 'bg-red-500/15 text-loss'
                      }`}
                    >
                      {isLong ? t('openTrades.long') : t('openTrades.short')}
                    </span>
                    <span className="px-1 py-px rounded text-[9.5px] font-semibold border border-hairline text-content-muted font-tabular">
                      {p.leverage}x
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0 ml-auto lg:order-5">
                    <span
                      className={`text-[13px] font-tabular font-semibold mr-1 ${
                        p.pnl > 0 ? 'text-gain' : p.pnl < 0 ? 'text-loss' : 'text-content-muted'
                      }`}
                    >
                      {signed(p.pnl)}
                    </span>

                    {/* Closing is the action people come here for — it should
                        not require expanding the row first. */}
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={() => handleClosePosition(p.id)}
                      title={t('openTrades.closePosition')}
                      aria-label={t('openTrades.closePosition')}
                      className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-content-faint hover:bg-red-500/15 hover:text-loss transition-colors"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setOpenCard(isOpen ? null : p.id)}
                      className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center transition-colors ${
                        isOpen ? 'text-content' : 'text-content-faint hover:text-content'
                      }`}
                    >
                      <motion.span animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </motion.span>
                    </motion.button>
                  </div>

                  {/* Forces the wrap: instrument and P&L own the first line. */}
                  <div className="basis-full h-0 lg:hidden" />

                  <div className={cn('flex items-baseline gap-1.5 min-w-0 lg:order-2 lg:flex-shrink-0', col.facts)}>
                    <Key>{t('openTrades.lot')}</Key>
                    <Val>{p.lots}</Val>
                        <Key>{t('openTrades.entry')}</Key>
                    <Val className="truncate">{price(p.asset, p.entryPrice)}</Val>
                  </div>

                  {/* Protective orders read as two labelled values rather than
                      two coloured pills — the pills carried a filled badge for
                      a level that is often not even set. */}
                  {/* Its own line on a phone. Sharing the row's right-hand
                      column, it set that column's width — 156px of a 304px
                      card — and squeezed the instrument name and the entry
                      price into truncation. Pending and closed rows already
                      give it a line of its own. */}
                  {slTpPair(p.stopLoss, p.takeProfit, p.asset, secondary)}

                  {extra(t('openTrades.margin'), money(p.amount))}
                </div>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="overflow-hidden"
                    >
                      {/* Detail only — the close action lives on the row now.
                          Six equal columns: the short timestamp fits one. */}
                      <div className="pl-3 pr-2 pb-2 pt-2 mt-0 border-t border-hairline grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
                        {[
                          { label: t('openTrades.market'), value: price(p.asset, p.currentPrice) },
                          { label: t('openTrades.amount'), value: money(p.amount) },
                          {
                            label: t('openTrades.pnl'),
                            value: signed(p.pnl),
                            tone: p.pnl > 0 ? 'text-gain' : p.pnl < 0 ? 'text-loss' : 'text-content-muted',
                          },
                          {
                            label: t('openTrades.roi'),
                            value: `${roi >= 0 ? '+' : ''}${roi.toFixed(2)}%`,
                            tone: roi > 0 ? 'text-gain' : roi < 0 ? 'text-loss' : 'text-content-muted',
                          },
                          { label: t('openTrades.margin'), value: money(p.amount) },
                          { label: t('openTrades.opened'), value: stamp(p.openedAt) },
                          {
                            label: t('openTrades.sl'),
                            value: p.stopLoss ? money(p.stopLoss) : '—',
                            tone: p.stopLoss ? 'text-loss' : 'text-content-faint',
                          },
                          {
                            label: t('openTrades.tp'),
                            value: p.takeProfit ? money(p.takeProfit) : '—',
                            tone: p.takeProfit ? 'text-gain' : 'text-content-faint',
                          },
                        ].map((d) => (
                          <div key={d.label} className="min-w-0">
                            <p className="text-[9.5px] uppercase tracking-wide text-content-faint leading-tight">
                              {d.label}
                            </p>
                            <p className={`text-[11.5px] font-tabular leading-tight truncate ${d.tone || 'text-content'}`}>
                              {d.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OpenTrades;
