# Security notes

Findings from the review of 20 September 2026, what was fixed, and what the
backend still has to carry. Everything below was verified against a real
production build (`npm run build`) served over `vite preview`, not read off
the source alone.

---

## Fixed

### 1. The built page leaked runtime data to any embedding site — high

`vite.config.js` injected four scaffold scripts into **production** HTML:

| Script | What it did |
| --- | --- |
| runtime error handler | `window.onerror` → `postMessage(..., '*')` with name, message and full stack |
| Vite overlay handler | build/overlay errors → `postMessage(..., '*')` |
| console hook | every `console.error` argument → `postMessage(..., '*')` |
| fetch monkey-patch | read the **body of every failed response** and `console.error`'d it — which the hook above then posted out |

The target origin was `*`, so any page that framed the app received all of it.
With no `frame-ancestors`, framing was possible. Once the CRM is connected, a
failed auth or account call would have handed its response body — tokens, PII,
error detail — to the embedder verbatim.

They are now injected in development only, where the parent frame is the
editor. The built `index.html` went from 4.05 kB to 1.46 kB and contains no
`postMessage`, no `window.parent`, and no fetch patch. Consider deleting them
outright; nothing in the product uses them.

### 2. No Content-Security-Policy — high

Added, and verified not to break anything. Injected as `<meta>` at build time
by `vite.config.js`, and served as a real header via `public/_headers`.
Production runs **zero inline JavaScript**, so `script-src` needs no
`'unsafe-inline'`. `style-src` does keep it: React and framer-motion write
style attributes on every animated element.

Two things the policy caught that source review had not:

- the framed `/tv/technical-analysis.html` was blocked until `frame-src`
  included `'self'`;
- that page carried an inline `<script>`, which the same policy blocks on that
  document. It now lives in `public/tv/technical-analysis.js`.

### 3. Clickjacking — medium

`frame-ancestors 'none'` plus `X-Frame-Options: DENY` in `public/_headers`. A
`<meta>` policy cannot carry `frame-ancestors`, so **the header file has to be
honoured by the host** — see *Deployment* below.

### 4. Development server open to any origin — medium

`server.cors: true` and `allowedHosts: true` meant any website a developer
visited could read project source from `localhost:3000`, and the
DNS-rebinding check was off. This is what turns the known esbuild dev-server
advisory into a live one. Now `host: 'localhost'`, `cors: false`,
`allowedHosts: ['localhost', '127.0.0.1']`.

### 5. Dependencies — 22 advisories down to 2

`npm audit fix` cleared 18. `react-router-dom` was upgraded 6 → 7.18.4, which
closes the open-redirect and XSS advisories; the build and the app were
re-verified afterwards.

### 6. The production build was broken

`src/i18n.js` used a top-level `await`, which the configured browser targets
reject — the app could be run in development but never shipped. Translations
now load in `initI18n()`, awaited in `main.jsx` before the first render, so
there is still no flash of raw keys. `debug` follows `import.meta.env.DEV`
instead of always logging.

---

## Accepted, with reasons

**esbuild / vite dev-server advisory (moderate).** Fixing it requires
`vite@8`, four majors up from `vite@4`. Neither package ships to production —
`dist/` contains no build tooling — and the exposure it describes is now
limited by the dev-server lockdown above. Worth scheduling as its own upgrade,
not worth bundling into a security pass.

**`interpolation.escapeValue: false` in i18n — not a finding.** This is correct
for React, which escapes everything it renders as a child. Turning it on would
double-escape: a broker named `Smith & Co` would render as `Smith &amp; Co`.
Checked that no translated string reaches `dangerouslySetInnerHTML` — nothing
in the codebase uses it.

**React Router redirect advisories — not reachable today.** Every `navigate()`
and `<Link to>` target in the codebase is a literal. There is no
`useSearchParams`, `useParams` or `location.search` anywhere. Upgraded anyway,
because a real login flow usually adds `?redirect=`, and that is the moment it
would become reachable.

---

## Still open — these need the backend

1. **There is no authentication.** Every route renders without a session.
   `/wallets`, `/profile`, `/transactions` are reachable by typing the URL.
   The login form validates its fields and navigates; it authenticates
   nothing. `useLogout` navigates and clears nothing, because there is nothing
   to clear. This is the single largest gap and cannot be closed in the front
   end alone — a route guard over a fake session would only be theatre.

2. **Document acceptance is stored in `localStorage`** (`qp-documents`, see
   `src/data/clientDocuments.js`). A client can edit it from the console —
   including a Leverage Increase Request. For a regulated broker, signature
   and acceptance records have to be written server-side with a timestamp the
   client cannot author.

3. **Account figures are client-side constants** (`src/data/account.js`). Fine
   for a demo; every one of them must come from the CRM and be authoritative
   there, never trusted from the browser.

4. **No version control.** This directory is not a git repository, so there is
   no audit trail of who changed what — and no way to recover from a bad
   overwrite. `git init` before anything else.

---

## Deployment

`public/_headers` ships to `dist/_headers` and is read as-is by Netlify and
Cloudflare Pages. On nginx the same set is:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://s3.tradingview.com https://widgets.tradingview-widget.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.tradingview.com https://*.tradingview-widget.com; frame-src 'self' https://*.tradingview.com https://*.tradingview-widget.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

When the CRM lands, add its origin to `connect-src`. If a broker adds their own
analytics or chat widget, add that origin too — and only that origin.
