import React, { useEffect, useRef, memo } from 'react';

function TickerTapeWidget() {
  const container = useRef();

  useEffect(
    () => {
      // The ref is empty when the effect runs against an unmounted
      // container — leaving the page mid-load threw an uncaught
      // TypeError here every time.
      if (!container.current) return;
      if (container.current.querySelector('script, iframe')) return;
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = `
        {
          "symbols": [
            { "proName": "BITSTAMP:BTCUSD", "title": "Bitcoin" },
            { "proName": "BITSTAMP:ETHUSD", "title": "Ethereum" },
            { "proName": "FOREXCOM:SPXUSD", "title": "S&P 500" },
            { "proName": "FX:EURUSD", "title": "EUR/USD" },
            { "proName": "OANDA:XAUUSD", "title": "Gold" },
            { "proName": "NASDAQ:AAPL", "title": "Apple" },
            { "proName": "NASDAQ:TSLA", "title": "Tesla" }
          ],
          "showSymbolLogo": true,
          "colorTheme": "dark",
          "isTransparent": false,
          "displayMode": "adaptive",
          "locale": "en"
        }`;
      container.current.appendChild(script);
    },
    []
  );

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: 60, width: '100%' }}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

export default memo(TickerTapeWidget);
