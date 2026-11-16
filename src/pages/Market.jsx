
import React from 'react';
import { motion } from 'framer-motion';
import TickerTapeWidget from '@/components/widgets/TickerTapeWidget';
import MiniChartWidget from '@/components/widgets/MiniChartWidget';
import CryptoScreenerWidget from '@/components/widgets/CryptoScreenerWidget';
import ForexScreenerWidget from '@/components/widgets/ForexScreenerWidget';
import EventsWidget from '@/components/widgets/EventsWidget';
import TimelineWidget from '@/components/widgets/TimelineWidget';
import EconomicMapWidget from '@/components/widgets/EconomicMapWidget';

const Market = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="glassmorphism rounded-lg overflow-hidden">
        <TickerTapeWidget />
      </div>

      <h1 className="text-xl font-bold text-content">Market</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glassmorphism rounded-lg p-4 sm:p-6 space-y-4">
          <MiniChartWidget />
          <h2 className="text-sm font-bold text-content-muted uppercase tracking-wide">Crypto Markets</h2>
          <CryptoScreenerWidget />
        </div>

        <div className="glassmorphism rounded-lg p-4 sm:p-6">
          <TimelineWidget />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 glassmorphism rounded-lg p-4 sm:p-6">
          <h2 className="text-sm font-bold mb-3 text-content-muted uppercase tracking-wide">Forex Market</h2>
          <ForexScreenerWidget />
        </div>

        <div className="glassmorphism rounded-lg p-4 sm:p-6">
          <h2 className="text-sm font-bold mb-3 text-content-muted uppercase tracking-wide">Economic Calendar</h2>
          <EventsWidget />
        </div>
      </div>

      <div className="glassmorphism rounded-lg p-4 sm:p-6">
        <h2 className="text-sm font-bold mb-3 text-content-muted uppercase tracking-wide">Economic Map</h2>
        <EconomicMapWidget />
      </div>
    </motion.div>
  );
};

export default Market;
