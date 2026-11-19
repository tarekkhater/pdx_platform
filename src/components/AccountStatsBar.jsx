import React from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { useTrading } from '@/context/TradingContext';
import { useInstruments } from '@/context/InstrumentsContext';
import { useAccount } from '@/context/AccountContext';
import { displaySym } from '@/adapters/instrument';

/**
 * Terminal header: which instrument is open, what it costs, and where the
 * account stands.
 *
 * Replaced two rows — a market-stats bar and the old balance strip — which
 * between them repeated the instrument selector the Markets panel already
 * provides. 24h session figures are absent because there is no market-data
 * feed, and inventing them on a screen people trade from would be worse than
 * leaving them out.
 */

const money = (n) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const AccountStatsBar = ({ asset, currentPrice }) => {
  const { t } = useTranslation();
  const { isFavourite, toggleFavourite } = useTrading();
  const { getInstrument } = useInstruments();
  const { balance: BALANCE } = useAccount();
  const instrument = getInstrument(asset);
  const pinned = isFavourite(asset);

  const pnlTone =
    BALANCE.pnl > 0 ? 'text-gain' : BALANCE.pnl < 0 ? 'text-loss' : 'text-content';

  /**
   * Ordered by how often a trader actually looks at them: what the account is
   * worth, what it is making, then what is committed and what is left.
   *
   * Free margin carries its percentage inline rather than as a second column —
   * they are one fact, and split across two columns they shared a label and
   * printed "Free Margin" twice.
   */
  const stats = [
    { key: 'balance', label: t('balanceBar.balance'), value: money(BALANCE.balance), strong: true },
    { key: 'equity', label: t('balanceBar.equity'), value: money(BALANCE.equity), strong: true },
    { key: 'pnl', label: t('balanceBar.pnl'), value: money(BALANCE.pnl), tone: pnlTone, strong: true },
    { key: 'margin', label: t('balanceBar.margin'), value: money(BALANCE.margin) },
    {
      key: 'freeMargin',
      label: t('balanceBar.freeMargin'),
      value: money(BALANCE.freeMargin),
      suffix: `${BALANCE.freeMarginPercent.toFixed(2)}%`,
    },
    { key: 'credit', label: t('balanceBar.credit'), value: money(BALANCE.credit) },
    {
      key: 'awaitingDeposit',
      label: t('balanceBar.awaitingDeposit'),
      value: money(BALANCE.awaitingDeposit),
      tone: 'text-yellow-600 dark:text-yellow-400',
    },
  ];

  return (
    <div className="flex items-stretch h-11 rounded-lg glassmorphism overflow-x-auto custom-scrollbar">
      <div className="flex items-center gap-2.5 pl-3 pr-3.5 flex-shrink-0">
        <button
          onClick={() => toggleFavourite(asset)}
          aria-label={t('marketStats.pin')}
          className="text-content-faint hover:text-yellow-500 transition-colors"
        >
          <Star className={`w-[15px] h-[15px] ${pinned ? 'fill-yellow-500 text-yellow-500' : ''}`} />
        </button>

        <div className="min-w-0">
          <p className="text-[13px] font-bold text-content leading-tight truncate">{displaySym(instrument, asset)}</p>
          {instrument.name && !String(instrument.name).includes(':') && (
            <p className="text-[9.5px] text-content-faint leading-tight truncate">{instrument.name}</p>
          )}
        </div>

        <p className="text-[16px] font-bold font-tabular text-gain leading-none ml-1">
          {/* forex is quoted in its second currency (yen for USD/JPY), not dollars */}
          {String(instrument.type).toLowerCase() === 'forex' ? '' : '$'}{currentPrice.toFixed(instrument.decimals)}
        </p>
      </div>

      {stats.map((s, i) => (
        <React.Fragment key={s.key}>
          {i > 0 && <div className="w-px bg-hairline flex-shrink-0 my-2.5" />}
          <div className="flex flex-col justify-center px-3.5 flex-shrink-0">
            <span className="text-[9.5px] font-semibold uppercase tracking-wider text-content-faint leading-tight whitespace-nowrap">
              {s.label}
            </span>
            <span className="flex items-baseline gap-1 leading-tight whitespace-nowrap">
              <span
                className={`font-tabular ${s.strong ? 'text-[13px] font-semibold' : 'text-[12.5px]'} ${
                  s.tone || 'text-content'
                }`}
              >
                {s.value}
              </span>
              {s.suffix && <span className="text-[10.5px] font-tabular text-content-faint">{s.suffix}</span>}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

export default AccountStatsBar;
