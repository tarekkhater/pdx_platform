import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Star, Search, RefreshCw } from 'lucide-react';
import { useTrading } from '@/context/TradingContext';
import { useInstruments } from '@/context/InstrumentsContext';
import { useLiveRates } from '@/context/LiveRatesContext';
import { searchAssets } from '@/services/instruments.service';
import { persistSelectedAssetType, readStoredAssetTab, idsEqual } from '@/lib/lastSelectedAsset';
import { pairLabelOf, uniqueKeyOf } from '@/adapters/instrument';

const CATEGORIES = ['Favourite', 'Crypto', 'Stocks', 'Forex', 'Indices', 'Commodities'];

const AssetList = ({ setSelectedAsset, isFullScreen = false }) => {
  const { t } = useTranslation();
  const { favourites, isFavourite, toggleFavourite, selectedAsset } = useTrading();
  const { instruments, instrumentsByCategory: assetCategories, loading, reload, getInstrument } = useInstruments();
  const { quoteFor } = useLiveRates();
  const [activeTab, setActiveTab] = useState(readStoredAssetTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [remoteResults, setRemoteResults] = useState(null);

  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < 2) {
      setRemoteResults(null);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await searchAssets({ name: q });
      if (!cancelled && result.ok) setRemoteResults(result.instruments);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchTerm]);

  // Every tradeable asset, so search can match instruments outside the tab
  // currently open.
  const allAssets = instruments;

  // Same order as the pins themselves, so the Favourite tab reads top-to-bottom
  // exactly like the quick strip on the trade station.
  const favouriteAssets = useMemo(
    () =>
      favourites
        .map((symbol) => {
          const instrument = getInstrument(symbol);
          if (instrument?.id != null) {
            return allAssets.find((a) => idsEqual(a.id, instrument.id));
          }
          return allAssets.find(
            (a) =>
              uniqueKeyOf(a) === symbol ||
              a.symbol === symbol ||
              a.ex_sym === symbol ||
              pairLabelOf(a) === symbol
          );
        })
        .filter(Boolean),
    [favourites, allAssets, getInstrument]
  );

  const isSearching = searchTerm.trim().length > 0;

  const filteredAssets = isSearching
    ? (remoteResults && remoteResults.length
        ? remoteResults
        : allAssets.filter(
            (asset) =>
              (asset.sym || asset.symbol || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              (asset.ex_sym || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
              asset.name.toLowerCase().includes(searchTerm.toLowerCase())
          ))
    : activeTab === 'Favourite'
    ? favouriteAssets
    : assetCategories[activeTab] || [];

  const tabKeys = {
    Favourite: 'favourite',
    Crypto: 'crypto',
    Stocks: 'stocks',
    Forex: 'forex',
    Indices: 'indices',
    Commodities: 'commodities',
  };

  const handleAssetClick = (asset) => {
    if (setSelectedAsset) setSelectedAsset(asset);
  };

  // The star filling in and the tab appearing are the confirmation; a toast on
  // top of that is noise.
  const handleFavoriteToggle = (e, assetSymbol) => {
    e.stopPropagation();
    toggleFavourite(assetSymbol);
  };

  // Prices stream in on their own, so this re-fetches the instrument list —
  // the thing that does not update itself when the broker adds an asset.
  const handleRefresh = () => reload();

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    persistSelectedAssetType(tabKeys[tab]);
    setSearchTerm('');
  };

  return (
    <div
      className={`flex flex-col ${
        isFullScreen ? 'h-full p-2.5' : 'glassmorphism rounded-lg p-3 h-[calc(100vh-10rem)] lg:h-full'
      }`}
    >
      {!isFullScreen && (
        <div className="flex justify-between items-center mb-2.5 flex-shrink-0">
          <h2 className="text-[11px] font-bold text-content-faint uppercase tracking-widest">
            {t('assetList.title', 'Markets')}
          </h2>
          <motion.button
            whileTap={{ rotate: 180 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={handleRefresh}
            className="w-6 h-6 rounded-md flex items-center justify-center text-content-faint hover:text-content hover:bg-overlay transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      )}

      <div className="relative mb-2.5 flex-shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-faint pointer-events-none" />
        <input
          type="text"
          placeholder={t('assetList.searchPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-8 pl-8 pr-3 bg-surface border border-hairline rounded-lg text-[12.5px] text-content placeholder:text-content-faint focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
        />
      </div>

      {/* The underline slides between tabs rather than snapping, matching the
          positions list and the transactions page. */}
      <div className="flex items-stretch justify-between gap-1 mb-1 flex-shrink-0 border-b border-hairline overflow-hidden">
        {CATEGORIES.map((tab) => {
          const active = !isSearching && activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`relative flex-shrink whitespace-nowrap pb-1.5 text-[11px] font-semibold transition-colors ${
                active ? 'text-content' : 'text-content-faint hover:text-content-muted'
              }`}
            >
              {t(`assetList.tabs.${tabKeys[tab]}`)}
              {active && (
                <motion.span
                  layoutId={`assetTab-${isFullScreen ? 'sheet' : 'panel'}`}
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-yellow-500"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar -mr-2 pr-1.5">
        {loading && filteredAssets.length === 0 ? (
          <div className="text-center py-10 text-content-faint">
            <p className="text-[13px]">{t('common.loading')}</p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-10 text-content-faint">
            <p className="text-[13px]">
              {isSearching
                ? t('assetList.noResultsForSearch', 'No instruments found for "{{searchTerm}}".', { searchTerm })
                : activeTab === 'Favourite'
                ? t('assetList.noFavourites')
                : t('assetList.noAssetsFound', {
                    searchTerm,
                    activeTab: t(`assetList.tabs.${tabKeys[activeTab]}`),
                  })}
            </p>
          </div>
        ) : (
          /* Keyed on the tab so the rows re-stagger when you switch category,
             instead of swapping in place. */
          <AnimatePresence mode="wait">
            <motion.div key={isSearching ? 'search' : activeTab} className="space-y-px">
              {filteredAssets.map((asset, index) => {
                /* Both sides come from the feed. They used to be the static
                   reference price plus and minus a flat amount, which is not
                   what a spread is here — the backend quotes each side as its
                   own percentage of the mid. */
                const ticker = asset.sym || asset.symbol;
                const selected = getInstrument(selectedAsset);
                const { bid: sellPrice, ask: buyPrice, mid } = quoteFor(asset);
                const isActive = asset.id != null && idsEqual(asset.id, selected?.id);
                const pinned = isFavourite(asset);

                return (
                  <motion.div
                    key={asset.id != null ? `id:${asset.id}` : ticker}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.2), duration: 0.18 }}
                    onClick={() => handleAssetClick(asset)}
                    className={`group relative flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                      isActive ? 'bg-yellow-500/10' : 'hover:bg-overlay'
                    }`}
                  >
                    {/* Accent rail marks the open instrument, and previews on
                        hover so the row reacts before you commit to it. */}
                    <span
                      className={`absolute left-0 top-1 bottom-1 w-[2px] rounded-full transition-colors ${
                        isActive ? 'bg-yellow-500' : 'bg-transparent group-hover:bg-hairline'
                      }`}
                    />

                    {asset.image ? (
                      <img
                        src={asset.image}
                        alt=""
                        className="w-6 h-6 rounded-full flex-shrink-0 object-cover bg-overlay"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="w-6 h-6 rounded-full flex-shrink-0 bg-overlay text-[10px] font-bold text-content-muted flex items-center justify-center">
                        {(ticker || '?').slice(0, 1)}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-[12.5px] font-semibold leading-tight truncate ${
                          isActive ? 'text-yellow-600 dark:text-yellow-400' : 'text-content'
                        }`}
                      >
                        {asset.name}
                      </div>
                      {asset.name && !String(asset.name).includes(':') && String(asset.name).toUpperCase() !== ticker && (
                        <div className="text-[10px] text-content-faint leading-tight truncate font-tabular">
                          { ticker}
                        </div>
                      )}
                    </div>

                    {/* An instrument with no quote yet shows dashes rather
                        than zeros — a price of 0.00 reads as a real number. */}
                    <div className="text-right font-tabular flex-shrink-0">
                      <div className="text-[11px] font-semibold text-gain leading-tight">
                        {mid > 0 ? sellPrice.toFixed(asset.decimals) : '—'}
                      </div>
                      <div className="text-[11px] font-semibold text-loss leading-tight">
                        {mid > 0 ? buyPrice.toFixed(asset.decimals) : '—'}
                      </div>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.75 }}
                      onClick={(e) => handleFavoriteToggle(e, asset)}
                      className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center ${
                        pinned ? 'text-yellow-500' : 'text-content-faint hover:text-yellow-500'
                      }`}
                    >
                      <Star className={`w-3.5 h-3.5 ${pinned ? 'fill-yellow-500' : ''}`} />
                    </motion.button>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default AssetList;
