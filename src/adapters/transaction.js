/**
 * Backend transaction → the row the wallet and transactions pages render.
 */

const num = (value, fallback = 0) => {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/**
 * The backend's numeric status.
 *
 * 3 is "awaiting deposit", which the interface had no equivalent for — it
 * knew approved, pending and rejected only. It is mapped to its own value
 * rather than folded into pending, because the two mean different things to
 * a client waiting on money.
 */
const STATUS = {
  0: 'pending',
  1: 'approved',
  2: 'rejected',
  3: 'awaiting',
};

export const toStatus = (value) => {
  if (typeof value === 'string' && Number.isNaN(Number(value))) {
    const known = value.trim().toLowerCase();
    if (['approved', 'pending', 'rejected', 'awaiting', 'success'].includes(known)) return known;
  }
  return STATUS[Number(value)] ?? 'pending';
};

/** Payment rails, normalised to the four the interface has icons for. */
const TYPE = {
  bank: 'wire',
  wire: 'wire',
  wire_transfer: 'wire',
  bank_transfer: 'wire',
  wireaccount: 'wire',
  credit: 'credit',
  bonus: 'credit',
  bouns: 'credit',
  card: 'card',
  creditcard: 'card',
  usdt: 'crypto',
  crypto: 'crypto',
};

export const toType = (value) => TYPE[String(value ?? '').trim().toLowerCase()] ?? 'wire';

/**
 * Timestamps are returned as ISO strings, never as display text.
 *
 * The mock data this replaces stored "Aug 20, 2025", which sorts only by
 * accident and cannot be rendered in the language the client is reading.
 */
const toIso = (value) => {
  if (!value) return null;
  const date = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

export const toTransaction = (row = {}, { incoming } = {}) => ({
  id: row.id ?? row.uuid ?? null,
  type: toType(row.method ?? row.type ?? row.payment_method),
  amount: Math.abs(num(row.amount ?? row.total)),
  notes: row.note ?? row.notes ?? row.description ?? row.name ?? '',
  date: toIso(row.created_at ?? row.date ?? row.updated_at),
  status: toStatus(row.status),
  incoming: incoming ?? num(row.amount) >= 0,
});

/** Both directions in one list, newest first — the wallet's "Recent" panel. */
export const mergeRecent = (deposits = [], withdrawals = [], limit = 4) =>
  [
    ...deposits.map((row) => toTransaction(row, { incoming: true })),
    ...withdrawals.map((row) => toTransaction(row, { incoming: false })),
  ]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
    .slice(0, limit);
