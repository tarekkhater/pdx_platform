/**
 * Single source of truth for the broker's identity.
 *
 * Change `name` here and it propagates everywhere: the header, the account
 * sheet, the settings screens, the legal documents and the browser tab title.
 * Every translated string refers to the brand as `{{brand}}`, which i18next
 * fills from this value — so a rebrand never means editing the locale files.
 */
export const BRAND = {
  name: 'Bein Markets',
  legalName: 'Bein Markets Ltd.',
  tagline: 'Advanced Multi-Asset Trading Platform',
  mark: '/logo-mark.svg',
};

/**
 * Account types the platform issues. `label` is what the badge prints and
 * `tone` picks its colour — a live account should never be mistaken for a
 * practice one at a glance.
 */
export const ACCOUNT_TYPES = {
  LIVE: { label: 'LIVE', tone: 'bg-emerald-600' },
  DEMO: { label: 'DEMO', tone: 'bg-purple-600' },
};

export const accountTone = (type) => (ACCOUNT_TYPES[type] || ACCOUNT_TYPES.LIVE).tone;
