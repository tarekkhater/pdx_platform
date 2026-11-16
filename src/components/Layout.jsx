import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import TopBar from '@/components/TopBar';
import AssetList from '@/components/AssetList';
import { TradingProvider, useTrading } from '@/context/TradingContext';
import { InstrumentsProvider } from '@/context/InstrumentsContext';
import { LiveRatesProvider } from '@/context/LiveRatesContext';
import { AccountProvider } from '@/context/AccountContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

const AssetPicker = () => {
  const { isAssetSheetOpen, setIsAssetSheetOpen, setSelectedAsset } = useTrading();
  const { t } = useTranslation();

  return (
    <Dialog open={isAssetSheetOpen} onOpenChange={setIsAssetSheetOpen}>
      <DialogContent
        overlayClassName="bg-transparent"
        className="p-0 gap-0 w-[95vw] max-w-sm h-[65vh] max-h-[520px] rounded-2xl flex flex-col overflow-hidden border-hairline shadow-2xl shadow-black/60"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="p-3 pb-2 border-b border-hairline flex-shrink-0">
          <DialogTitle className="text-[16px] font-bold">{t('tradeStation.selectAsset')}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow min-h-0 overflow-hidden">
          <AssetList
            isFullScreen={true}
            setSelectedAsset={(asset) => {
              setSelectedAsset(asset);
              setIsAssetSheetOpen(false);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Instruments, then prices, then trading, then the account.
 *
 * The nesting is a dependency chain, not a preference. Quotes are keyed by
 * asset id and need the instrument list to turn a symbol into one; positions
 * need a quote to mark themselves against; and equity needs the positions,
 * because the floating P&L that separates it from the settled balance only
 * exists here, where the live prices are.
 */
const Layout = ({ children }) => {
  const { pathname } = useLocation();
  const lockHome = pathname === '/';

  return (
    <InstrumentsProvider>
      <LiveRatesProvider>
        <TradingProvider>
          <AccountProvider>
            <div
              className={`bg-background text-foreground ${
                lockHome
                  ? 'h-[100dvh] overflow-hidden overscroll-none lg:h-auto lg:min-h-screen lg:overflow-visible lg:overscroll-auto'
                  : 'min-h-screen'
              }`}
            >
              <Header />
              {/* Home on a phone is a fixed terminal: chart + ticket + nav
                  must fit the screen. Other pages keep the footer gutter
                  and scroll as usual. */}
              <main
                className={
                  lockHome
                    ? 'container mx-auto max-w-[1920px] px-2 pt-2 h-[calc(100dvh-44px-env(safe-area-inset-bottom,0px))] overflow-hidden lg:h-auto lg:overflow-visible lg:px-4 lg:pt-4 lg:pb-4'
                    : 'container mx-auto px-2 sm:px-4 pt-2 sm:pt-4 pb-[52px] lg:pb-4 max-w-[1920px]'
                }
              >
                {children}
              </main>
              <TopBar />
              <AssetPicker />
            </div>
          </AccountProvider>
        </TradingProvider>
      </LiveRatesProvider>
    </InstrumentsProvider>
  );
};

export default Layout;
