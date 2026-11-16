import React, { useEffect, useRef, memo } from 'react';

function ForexScreenerWidget() {
  const container = useRef();

  useEffect(
    () => {
      // The ref is empty when the effect runs against an unmounted
      // container — leaving the page mid-load threw an uncaught
      // TypeError here every time.
      if (!container.current) return;
      if (container.current.querySelector('script, iframe')) return;
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = `
        {
          "market": "forex",
          "showToolbar": true,
          "defaultColumn": "overview",
          "defaultScreen": "general",
          "isTransparent": false,
          "locale": "en",
          "colorTheme": "dark",
          "width": "100%",
          "height": 550
        }`;
      container.current.appendChild(script);
    },
    []
  );

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: 550, width: '100%' }}>
      <div className="tradingview-widget-container__widget"></div>
      <div className="tradingview-widget-copyright"><a href="https://www.tradingview.com/markets/currencies/" rel="noopener nofollow" target="_blank"><span className="blue-text">Forex Screener</span></a><span className="trademark"> by TradingView</span></div>
    </div>
  );
}

export default memo(ForexScreenerWidget);
