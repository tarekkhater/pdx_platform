import React, { useEffect, useRef, memo } from 'react';

function MiniChartWidget() {
  const container = useRef();

  useEffect(
    () => {
      // The ref is empty when the effect runs against an unmounted
      // container — leaving the page mid-load threw an uncaught
      // TypeError here every time.
      if (!container.current) return;
      if (container.current.querySelector('script, iframe')) return;
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = `
        {
          "symbol": "BITSTAMP:BTCUSD",
          "width": "100%",
          "height": 220,
          "locale": "en",
          "dateRange": "12M",
          "colorTheme": "dark",
          "isTransparent": false
        }`;
      container.current.appendChild(script);
    },
    []
  );

  return (
    <div className="tradingview-widget-container" ref={container} style={{ height: 220, width: '100%' }}>
      <div className="tradingview-widget-container__widget"></div>
    </div>
  );
}

export default memo(MiniChartWidget);
