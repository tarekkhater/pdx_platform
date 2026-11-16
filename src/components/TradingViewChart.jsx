import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { useMediaQuery } from '@/hooks/use-media-query';
import { toTradingViewSymbol, toTradingViewLocale } from '@/config/tradingViewSymbols';
import { useInstruments } from '@/context/InstrumentsContext';

const EMBED_SRC = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

/**
 * TradingView's Advanced Chart, following the instrument the user has open.
 *
 * The embed reads its configuration once, from the JSON body of the script
 * tag, and exposes no update API — so changing symbol, theme or language
 * means tearing the widget down and building a new one. That is what the
 * effect below does, keyed on exactly those three values.
 */
const TradingViewChart = ({ asset, interval = '60' }) => {
  const container = useRef(null);
  const { resolved } = useTheme();
  const { i18n } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const { getInstrument } = useInstruments();
  const symbol = toTradingViewSymbol(asset, getInstrument(asset));
  const locale = toTradingViewLocale(i18n.resolvedLanguage);
  const theme = resolved === 'light' ? 'light' : 'dark';

  useEffect(() => {
    const host = container.current;
    if (!host) return undefined;

    // Clear the previous widget before mounting the next one, otherwise each
    // symbol change stacks another chart inside the same container.
    host.innerHTML = '';

    const widget = document.createElement('div');
    widget.className = 'tradingview-widget-container__widget';
    widget.style.height = '100%';
    widget.style.width = '100%';
    host.appendChild(widget);

    const script = document.createElement('script');
    script.src = EMBED_SRC;
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme,
      style: '1',
      locale,
      // The instrument is chosen by the tab strip above, so the chart's own
      // symbol search would be a second, conflicting way to change it.
      allow_symbol_change: false,
      // Drawing tools, on both breakpoints. The toolbar costs ~58px of width
      // on a phone, which the candles can absorb; losing the tools entirely
      // is the worse trade.
      hide_side_toolbar: false,
      details: false,
      hotlist: false,
      calendar: false,
      withdateranges: isDesktop,
      hide_top_toolbar: false,
      hide_legend: false,
      // A phone can't show a full legend and a volume pane and still leave
      // room for candles; drop the legend and keep the price action.
      hide_volume: !isDesktop,
      save_image: false,
      enable_publishing: false,
      // EMA is an overlay and costs no height. RSI opens a second pane, which
      // on a phone leaves the candles too short to read — so it is desktop
      // only. Both remain one tap away in the indicators menu.
      studies: isDesktop ? ['STD;EMA', 'STD;RSI'] : ['STD;EMA'],
      backgroundColor: theme === 'light' ? '#ffffff' : '#0a0b0d',
      support_host: 'https://www.tradingview.com',
    });
    host.appendChild(script);

    return () => {
      host.innerHTML = '';
    };
  }, [symbol, interval, theme, locale, isDesktop]);

  return (
    <div className="h-full w-full rounded-lg overflow-hidden border border-hairline bg-surface-raised">
      <div ref={container} className="tradingview-widget-container h-full w-full" />
    </div>
  );
};

export default TradingViewChart;
