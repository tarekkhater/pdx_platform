/**
 * Quote currency → account currency (USD), the same rule as the server (App\Services\Trading\Fx).
 *
 * price × lots × contract size is in the pair's QUOTE currency: yen for USDJPY and EURJPY, francs
 * for USDCHF. It has to be converted before it is shown as dollars, or 1,000 yen reads as $1,000.
 *
 * Instruments carry `sym` (base currency) and `base` (QUOTE currency), e.g. EURJPY → sym EUR, base JPY.
 *   QUOTE/USD pair exists → × its price      (GBP → USD: × GBPUSD)
 *   USD/QUOTE pair exists → ÷ its price      (JPY → USD: ÷ USDJPY)
 */
const USD = new Set(['USD', 'USDT', 'USDC', 'BUSD', '']);

const up = (v) => String(v ?? '').trim().toUpperCase();

export const quoteToUsd = (quote, instruments = [], priceFor = () => 0) => {
  const q = up(quote);
  if (USD.has(q)) return 1;

  const forex = instruments.filter((i) => i && i.type === 'forex');
  const direct = forex.find((i) => up(i.sym) === q && up(i.base) === 'USD');
  if (direct) {
    const p = Number(priceFor(direct)) || Number(direct.price) || 0;
    if (p > 0) return p;
  }
  const inverse = forex.find((i) => up(i.sym) === 'USD' && up(i.base) === q);
  if (inverse) {
    const p = Number(priceFor(inverse)) || Number(inverse.price) || 0;
    if (p > 0) return 1 / p;
  }
  return 1;
};
