/*
 * Behaviour for the framed technical-analysis page.
 *
 * Kept in its own file rather than inline in the HTML so the site's
 * Content-Security-Policy needs no 'unsafe-inline' in script-src: with
 * this external, the whole production site runs zero inline JavaScript.
 */
(function () {
  var params = new URLSearchParams(location.search);
  var symbol = params.get('symbol') || 'BINANCE:BTCUSDT';
  var theme = params.get('theme') === 'light' ? 'light' : 'dark';
  var locale = /^[a-zA-Z_]{2,8}$/.test(params.get('locale') || '') ? params.get('locale') : 'en';
  var stage = document.getElementById('stage');

  // The widget picks its palette from the computed CSS color-scheme, not from
  // the theme attribute — with no color-scheme set it resolved to light and
  // painted a white attribution bar under a dark terminal. Setting it here is
  // also what makes the panel follow the app's theme rather than the OS one.
  document.documentElement.style.colorScheme = theme;

  // Built with setAttribute rather than markup, so a symbol coming from the
  // instrument table can never be interpreted as HTML.
  var el = document.createElement('tv-technical-analysis');
  el.setAttribute('symbol', symbol);
  el.setAttribute('theme', theme);
  el.setAttribute('ratings-display-mode', 'gauge-and-breakdown');
  stage.appendChild(el);

  // The widget renders at its natural height. Where the column is shorter
  // than that, scale the whole thing down to fit instead of letting the frame
  // scroll or cutting the gauge off at the bottom.
  var lastAvailable = -1;
  var lastNeeded = -1;
  function fit() {
    var prevTransform = stage.style.transform;
    var prevWidth = stage.style.width;
    stage.style.transform = 'none';
    stage.style.width = '100%';

    var available = document.documentElement.clientHeight;
    var needed = stage.offsetHeight;

    // Nothing has actually changed since the last pass, so put the previous
    // scale back untouched. Without this the observer would see its own
    // writes and re-enter on every frame.
    if (available === lastAvailable && needed === lastNeeded) {
      stage.style.transform = prevTransform;
      stage.style.width = prevWidth;
      return;
    }
    lastAvailable = available;
    lastNeeded = needed;

    if (!needed || !available || needed <= available) return;
    var k = available / needed;
    // Widen first so that, once scaled, the panel still spans the full column.
    stage.style.width = (100 / k) + '%';
    stage.style.transform = 'scale(' + k + ')';
  }

  if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
  window.addEventListener('resize', fit);

  var script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://widgets.tradingview-widget.com/w/' + locale + '/tv-technical-analysis.js';
  // TradingView only publishes some locales; the rest answer 403 and the tag
  // never upgrades, leaving an empty panel — fall back to English instead.
  script.onerror = function () {
    if (locale === 'en') return;
    var fallback = document.createElement('script');
    fallback.type = 'module';
    fallback.src = 'https://widgets.tradingview-widget.com/w/en/tv-technical-analysis.js';
    document.head.appendChild(fallback);
  };
  script.onload = function () { setTimeout(fit, 400); };
  document.head.appendChild(script);
})();
