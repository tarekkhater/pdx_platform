import React, { useEffect, useRef, memo } from 'react';

function CryptoScreenerWidget() {
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
          "defaultColumn": "overview",
          "screener_type": "crypto_mkt",
          "displayCurrency": "USD",
          "colorTheme": "dark",
          "isTransparent": false,
          "locale": "en",
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
      <div className="tradingview-widget-copyright"><a href="https://www.tradingview.com/markets/cryptocurrencies/prices-all/" rel="noopener nofollow" target="_blank"><span className="blue-text">Crypto markets</span></a><span className="trademark"> by TradingView</span></div>
    </div>
  );
}

export default memo(CryptoScreenerWidget);
