import React from 'react';
import { motion } from 'framer-motion';
import { BRAND } from '@/config/brand';
import BrandMark from '@/components/BrandMark';

/**
 * Shared frame for the signed-out screens.
 *
 * Full-bleed on a phone the way the Binance app is, and a centred card from
 * the small breakpoint up. Auth pages render outside Layout, so there is no
 * bottom nav or account chrome to work around here.
 */
const AuthShell = ({ title, subtitle, children, footer }) => (
  <div className="min-h-[100dvh] bg-surface flex flex-col">
    <div className="flex-1 flex flex-col justify-center px-5 py-8 sm:px-0">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="w-full sm:max-w-[400px] sm:mx-auto sm:rounded-2xl sm:border sm:border-hairline sm:bg-surface-raised sm:p-6 sm:shadow-2xl sm:shadow-black/30"
      >
        <div className="flex items-center gap-2 mb-6">
          <BrandMark className="w-7 h-7 rounded-[7px]" />
          <span className="text-[15px] font-bold tracking-tight text-content">{BRAND.name}</span>
        </div>

        <h1 className="text-[24px] font-bold tracking-tight text-content leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-content-muted">{subtitle}</p>}

        <div className="mt-5">{children}</div>
      </motion.div>

      {footer && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-5 text-center text-[13px] text-content-muted sm:max-w-[400px] sm:mx-auto"
        >
          {footer}
        </motion.p>
      )}
    </div>
  </div>
);

/** Labelled input with inline error state. */
export const AuthField = ({ id, label, error, children }) => (
  <div>
    <label htmlFor={id} className="block text-[12.5px] font-medium text-content-muted mb-1.5">
      {label}
    </label>
    {children}
    {error && <p className="mt-1 text-[11.5px] text-loss">{error}</p>}
  </div>
);

export const authInputClass = (hasError) =>
  `w-full h-11 px-3 rounded-xl bg-surface border text-[14px] text-content placeholder:text-content-faint transition-colors focus:outline-none ${
    hasError ? 'border-loss focus:border-loss' : 'border-hairline focus:border-yellow-500'
  }`;

export default AuthShell;
