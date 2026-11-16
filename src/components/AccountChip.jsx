import React from 'react';
import { useTrading } from '@/context/TradingContext';
import { useAccount } from '@/context/AccountContext';
import { accountTone } from '@/config/brand';

/**
 * The account badge: type stripe, initial, online dot.
 *
 * One component for both breakpoints. The desktop header used to carry a
 * plain grey avatar over its own dropdown — a second, thinner copy of the
 * account sheet that listed the language picker and logout and nothing else,
 * and that drifted from the sheet every time the sheet gained a feature.
 * Tapping this opens the same sheet everywhere.
 */
const AccountChip = ({ onClick }) => {
  const { account } = useTrading();

  return (
    <button onClick={onClick} className="relative flex items-center self-center flex-shrink-0">
      <span
        className={`${accountTone(account.type)} text-white text-[6px] font-bold tracking-wider px-[2px] py-1 rounded-l [writing-mode:vertical-rl] rotate-180`}
      >
        {account.type}
      </span>
      <span className="w-7 h-7 bg-overlay-strong rounded-r flex items-center justify-center text-[11px] font-semibold text-content">
        {account.initial}
      </span>
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-surface-raised" />
    </button>
  );
};

/** Today's P&L, sized to sit beside the chip in either bar. */
export const AccountPnl = () => {
  const { balance } = useAccount();
  const pnl = Number(balance?.pnl) || 0;

  return (
    <div className="flex flex-col items-end justify-center leading-none flex-shrink-0">
      <span className="text-[8px] font-semibold uppercase tracking-wider text-content-faint">P&amp;L</span>
      <span
        className={`text-[11px] font-semibold font-tabular ${
          pnl > 0 ? 'text-gain' : pnl < 0 ? 'text-loss' : 'text-content'
        }`}
      >
        ${pnl.toFixed(2)}
      </span>
    </div>
  );
};

export default AccountChip;
