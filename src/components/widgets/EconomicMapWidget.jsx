import React, { useEffect } from 'react';

function EconomicMapWidget() {
  useEffect(() => {
    if (customElements.get('tv-economic-map') || document.querySelector('script[data-tv-economic-map]')) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://widgets.tradingview-widget.com/w/en/tv-economic-map.js';
    script.setAttribute('data-tv-economic-map', 'true');
    document.head.appendChild(script);
  }, []);

  return (
    <div style={{ height: 500, width: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* eslint-disable-next-line react/no-unknown-property */}
      <tv-economic-map style={{ width: '100%', height: '500px', display: 'block' }}></tv-economic-map>
    </div>
  );
}

export default EconomicMapWidget;
