import api, { apiErrorMessage } from '@/lib/api';
import { toTransaction } from '@/adapters/transaction';

const unwrap = (response) => response?.data?.data ?? response?.data ?? {};

/**
 * Laravel's NoHtmlInjection rule is `strip_tags($value) === $value`.
 * A JSON number fails that (strip_tags returns a string), which is why the
 * previous client sent money as `"100.00"` and not `100`.
 */
const toMoneyString = (value) => {
  const parsed = parseFloat(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '';
};

const toText = (value) => String(value ?? '').trim();

/** Balance, margin and pending deposits. P&L is computed from live prices. */
export const fetchFinance = async () => {
  try {
    return { ok: true, finance: unwrap(await api.get('/users/Home/finance')) };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), finance: {} };
  }
};

export const fetchWallets = async () => {
  try {
    const data = unwrap(await api.get('/users/wallet'));
    const rows = Array.isArray(data) ? data : data?.wallets ?? [];
    return {
      ok: true,
      wallets: rows.map((row) => ({ name: row.name ?? '', amount: Number(row.amount) || 0 })),
    };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), wallets: [] };
  }
};

export const fetchStatistics = async () => {
  try {
    return { ok: true, statistics: unwrap(await api.get('/users/profile/statistics')) };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), statistics: {} };
  }
};

/**
 * Deposits and withdrawals share one endpoint, separated by `type`.
 *
 * Direction cannot be read off the row — the amount is positive either way —
 * so it is carried in from the request that asked for it.
 */
export const fetchTransactions = async ({ type = 'deposit', page = 1, search = '' } = {}) => {
  try {
    const response = await api.post(`/users/transactions?page=${page}`, { type, search });
    const body = response?.data?.data ?? response?.data ?? {};
    const rows = Array.isArray(body) ? body : body.data ?? [];
    const incoming = type === 'deposit';

    return {
      ok: true,
      transactions: rows.map((row) => toTransaction(row, { incoming })),
      pagination: {
        page: body.current_page ?? page,
        lastPage: body.last_page ?? 1,
        total: body.total ?? rows.length,
      },
    };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), transactions: [], pagination: null };
  }
};

/* ---------------------------------------------------------------- deposits */

export const fetchDepositWallets = async () => {
  try {
    const data = unwrap(await api.get('/users/Deposits/wallets'));
    const rows = Array.isArray(data) ? data : [];
    return {
      ok: true,
      wallets: rows.map((row) => ({
        id: row.id,
        name: row.name ?? '',
        symbol: row.symbol ?? '',
        address: row.wallet ?? row.address ?? '',
        logo: row.logo ?? null,
        barcode: row.barcode ?? null,
      })),
    };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), wallets: [] };
  }
};

const DEPOSIT_ENDPOINTS = {
  card: '/users/Deposits/store/credit',
  crypto: '/users/Deposits/store/usdt',
  bank: '/users/Deposits/store/bank',
};

export const createDeposit = async (method, payload) => {
  const endpoint = DEPOSIT_ENDPOINTS[method];
  if (!endpoint) return { ok: false, message: `Unsupported deposit method: ${method}` };
  try {
    const data = unwrap(await api.post(endpoint, { ...payload, amount: toMoneyString(payload.amount) }));
    return { ok: true, deposit: data };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The deposit could not be submitted.') };
  }
};

/**
 * Card details go to a dedicated endpoint rather than the generic deposit
 * one. Nothing about the card is kept in the browser after this call.
 *
 * Field names and types match the previous ticket: amount is a 2-decimal
 * string, expiry year is four digits.
 */
export const storeCard = async (payload) => {
  const month = String(payload.card_expiry_month ?? '').trim();
  let year = String(payload.card_expiry_year ?? '').trim();
  if (year.length === 2) year = `20${year}`;

  const body = {
    amount: toMoneyString(payload.amount),
    card_holder: String(payload.card_holder || '').trim(),
    card_number: String(payload.card_number || '').replace(/\s/g, ''),
    card_cvv: String(payload.card_cvv || '').trim(),
    card_expiry_month: month,
    card_expiry_year: year,
  };
  const zip = String(payload.zip_code || '').trim();
  if (zip) body.zip_code = zip;

  try {
    const data = unwrap(await api.post('/users/account-bank/store', body));
    return { ok: true, card: data };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The card could not be saved.') };
  }
};

/* ------------------------------------------------------------- withdrawals */

const WITHDRAWAL_ENDPOINTS = {
  bank: '/users/withdrawal/store/wireaccount',
  crypto: '/users/withdrawal/store/usdt',
};

/**
 * BankRequest wants every required field as a string (amount included —
 * a JSON number fails both `string` and NoHtmlInjection). Country / IBAN
 * stay required even on USD / card payouts, so missing ones get a safe
 * fallback the previous ticket always collected.
 */
const buildBankWithdrawal = (payload) => {
  const currency = toText(payload.currency) || 'USD';
  const country = toText(payload.country) || (currency === 'EUR' ? 'DE' : 'US');
  const iban = toText(payload.iban).replace(/\s/g, '');

  const body = {
    amount: toMoneyString(payload.amount),
    firstName: toText(payload.firstName),
    lastName: toText(payload.lastName),
    country,
    currency,
    iban,
    type: toText(payload.type) || 'withdrawal',
    method: 'bank_transfer',
  };

  const email = toText(payload.email);
  if (email) body.email = email;

  const accountType = toText(payload.accountType);
  if (accountType) body.accountType = accountType;

  const swift = toText(payload.swift_code || payload.bic);
  if (swift) body.swift_code = swift;

  const sort = toText(payload.sort_code || payload.routing_number);
  if (sort) body.sort_code = sort;

  return body;
};

/** CryptoRequest: amount is numeric+NoHtmlInjection, so send `"100.00"`. */
const buildCryptoWithdrawal = (payload) => ({
  amount: toMoneyString(payload.amount),
  address: toText(payload.address),
  name: toText(payload.name),
  type: toText(payload.type) || 'withdrawal',
  crypto_type: toText(payload.crypto_type),
  crypto_symbol: toText(payload.crypto_symbol),
  network: toText(payload.network),
  method: 'crypto',
});

export const createWithdrawal = async (method, payload) => {
  const endpoint = WITHDRAWAL_ENDPOINTS[method];
  if (!endpoint) return { ok: false, message: `Unsupported withdrawal method: ${method}` };
  const body = method === 'bank' ? buildBankWithdrawal(payload) : buildCryptoWithdrawal(payload);
  try {
    const data = unwrap(await api.post(endpoint, body));
    return { ok: true, withdrawal: data };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The withdrawal could not be submitted.') };
  }
};
