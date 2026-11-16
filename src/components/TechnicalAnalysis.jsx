import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/context/ThemeContext';
import { toTradingViewSymbol } from '@/config/tradingViewSymbols';
import { useInstruments } from '@/context/InstrumentsContext';

/**
 * TradingView's technical analysis gauge, following the open instrument.
 *
 * Same widget as the first commit (`tv-technical-analysis`, gauge +
 * breakdown, light/dark from the app theme). It is mounted in the panel
 * rather than a `/tv/...` frame, because that path was rewritten to the
 * SPA and the panel rendered the in-app 404.
 */

const WIDGET_LOCALES = { en: 'en', de: 'de_DE' };
const widgetLocale = (lng) => WIDGET_LOCALES[String(lng || '').split('-')[0]] || 'en';

const loadedLocales = new Set();

// Closed shadow DOM — the "SYMBOL analysis by TradingView" line cannot be
// styled. It sits under the gauge (~16px type + 4px gap); clip it instead.
const FOOTER_CLIP = 32;

const loadWidget = (locale) =>
  new Promise((resolve) => {
    if (customElements.get('tv-technical-analysis') || loadedLocales.has(locale)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = `https://widgets.tradingview-widget.com/w/${locale}/tv-technical-analysis.js`;
    script.onload = () => {
      loadedLocales.add(locale);
      resolve();
    };
    script.onerror = () => {
      if (locale === 'en') {
        resolve();
        return;
      }
      loadWidget('en').then(resolve);
    };
    document.head.appendChild(script);
  });

const TechnicalAnalysis = ({ asset }) => {
  const hostRef = useRef(null);
  const { resolved } = useTheme();
  const { i18n } = useTranslation();
  const { getInstrument } = useInstruments();

  const symbol = toTradingViewSymbol(asset, getInstrument(asset));
  const theme = resolved === 'light' ? 'light' : 'dark';
  const locale = widgetLocale(i18n.resolvedLanguage);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !symbol) return undefined;

    let cancelled = false;
    let observer;
    let onResize;

    loadWidget(locale).then(() => {
      if (cancelled || !hostRef.current) return;
      host.innerHTML = '';
      host.style.overflow = 'hidden';

      const stage = document.createElement('div');
      stage.style.cssText =
        `transform-origin:top left;width:100%;height:calc(100% + ${FOOTER_CLIP}px);min-height:${380 + FOOTER_CLIP}px`;

      const el = document.createElement('tv-technical-analysis');
      el.setAttribute('symbol', symbol);
      el.setAttribute('theme', theme);
      el.setAttribute('ratings-display-mode', 'gauge-and-breakdown');
      el.style.cssText = 'display:block;width:100%;height:100%';
      stage.appendChild(el);
      host.appendChild(stage);

      let lastAvailable = -1;
      let lastNeeded = -1;
      const fit = () => {
        const prevTransform = stage.style.transform;
        const prevWidth = stage.style.width;
        stage.style.transform = 'none';
        stage.style.width = '100%';

        const available = host.clientHeight;
        const needed = Math.max(stage.offsetHeight - FOOTER_CLIP, 1);

        if (available === lastAvailable && needed === lastNeeded) {
          stage.style.transform = prevTransform;
          stage.style.width = prevWidth;
          return;
        }
        lastAvailable = available;
        lastNeeded = needed;

        if (!available || needed <= available) return;
        const k = available / needed;
        stage.style.width = `${100 / k}%`;
        stage.style.transform = `scale(${k})`;
      };

      onResize = fit;
      if (window.ResizeObserver) {
        observer = new ResizeObserver(fit);
        observer.observe(host);
      }
      window.addEventListener('resize', onResize);
      setTimeout(fit, 400);
    });

    return () => {
      cancelled = true;
      if (onResize) window.removeEventListener('resize', onResize);
      observer?.disconnect();
      host.innerHTML = '';
    };
  }, [symbol, theme, locale]);

  return (
    <div className="glassmorphism rounded-lg overflow-hidden h-full min-h-0">
      <div ref={hostRef} className="h-full w-full overflow-hidden" style={{ background: 'transparent' }} />
    </div>
  );
};

export default TechnicalAnalysis;
