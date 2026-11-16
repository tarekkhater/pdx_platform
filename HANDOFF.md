# Backend handoff

A React + Vite front end for a white-label trading platform. Everything it
shows is real UI over placeholder data; nothing talks to a server yet. This
note lists the exact files to replace and the shapes to match.

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # -> dist/
```

Read `SECURITY.md` alongside this — it covers the response headers the built
site needs and the security items that only the backend can close.

---

## Where the data lives

Every placeholder is isolated in one of these files. Swap the file, and the UI
above it needs no changes.

| File | Holds | Replace with |
| --- | --- | --- |
| `src/data/account.js` | balance, equity, margin, credit, deposits, withdrawals | account + transaction endpoints |
| `src/data/trades.js` | pending orders, closed trades, the fill rule | order + history endpoints |
| `src/context/TradingContext.jsx` | open positions and the actions on them | positions endpoint + order API |
| `src/config/instruments.js` | the tradeable instruments | instrument list from the CRM |
| `src/data/clientDocuments.js` | document definitions and submissions | document endpoints |
| `public/locales/*/translation.json` | all UI copy, 4 languages | leave as files, or serve from the CRM |

**The record shapes are documented in `src/data/trades.js`** — field by field,
with the reasoning. Read that file before designing the endpoints. Two
conventions hold everywhere:

- **money is a number, never a formatted string** (`1725.0`, not `"$1,725.00"`)
- **timestamps are ISO 8601** (`"2026-09-16T08:02:55"`)

The UI formats both in the language the user is reading, which it cannot do
with `"$2,396.16"` or `"09/10/2025 10:03:22"`.

---

## The actions the UI already calls

All in `src/context/TradingContext.jsx`. They mutate local state today; each
one is where a request goes.

| Action | Means |
| --- | --- |
| `addPosition(position)` | a market order filled |
| `closePosition(id)` | client closed one position |
| `closeAllPositions()` | client closed everything |
| `addPendingOrder(order)` | a resting order was accepted |
| `cancelOrder(id)` | client cancelled a resting order |
| `fillPendingOrders(asset, price)` | the market reached an order's target |

### Pending orders

One kind only: the client names a price, and the order opens when the market
reaches it. No limit/stop distinction, no time-in-force. `shouldFill()` in
`src/data/trades.js` is the whole rule — direction comes from `placedPrice`,
the market price when the order was accepted.

**This must run server-side for every instrument on every tick.** In this build
it runs off the price ticker, which only ticks the instrument on screen, so an
order fills while its owner is watching and not otherwise. An order on XAU/USD
has to fill while the client is asleep.

---

## Three things that need a decision

1. **Contract size is missing.** `src/config/instruments.js` has no units-per-lot,
   so margin is computed as though one lot were one unit — 0.01 lots of XRP is
   priced as 0.01 XRP, and the ticket shows `$0.0003`. Add the field, and the
   order ticket, positions list and stats bar all correct together. **Tell us
   the convention you use and we will match it.**

2. **There is no authentication.** Every route renders without a session:
   `/wallets`, `/profile` and `/transactions` are reachable by typing the URL.
   The seams are ready — `src/pages/Login.jsx` and `Register.jsx` validate and
   navigate, `src/hooks/use-logout.js` is the single place every Log Out button
   goes through. A route guard is waiting on a real session to guard.

3. **Document acceptance is in `localStorage`** (`src/data/clientDocuments.js`,
   key `qp-documents`) — including Leverage Increase Requests. A client can
   edit it from the browser console. Acceptance records need server-side
   timestamps the client cannot author.

---

## Things worth knowing before you change anything

- **Prices on the chart are real, prices in the order panel are not.** The
  chart and the technicals gauge are TradingView widgets showing live market
  data; the order panel's bid/ask comes from a simulated ticker in
  `src/pages/TradeStation.jsx`. They will not agree. Point both at your feed.

- **`src/config/brand.js`** carries the broker name and account types. It is
  the rebrand point — the name reaches every translated string through i18n's
  `{{brand}}` variable.

- **Instrument codes** (`BTC/USD`, `XAU/USD`) map to TradingView symbols in
  `src/config/tradingViewSymbols.js`. A broker on a different liquidity
  provider edits that table and nothing else.

- **The layout is verified from 320px to 1920px.** If you add fields to a row,
  re-check the narrow widths — the trade station's panel is half the window and
  is the first place things overflow.
