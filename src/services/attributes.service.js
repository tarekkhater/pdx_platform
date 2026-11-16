import api, { apiErrorMessage } from '@/lib/api';

/**
 * Countries and currencies, from the platform rather than a list in the
 * bundle — the set a broker accepts is a licensing matter and changes
 * without a front-end release.
 *
 * Both are public: they are needed on the sign-up form, before there is a
 * session to authenticate with.
 */

const unwrap = (response) => response?.data?.data ?? response?.data ?? [];

export const fetchCountries = async () => {
  try {
    const rows = unwrap(await api.get('/countries/all'));
    return {
      ok: true,
      countries: (Array.isArray(rows) ? rows : []).map((row) => ({
        id: row.id,
        name: row.name ?? '',
        phoneCode: row.phonecode ?? row.phone_code ?? null,
      })),
    };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), countries: [] };
  }
};

export const fetchCurrencies = async () => {
  try {
    const rows = unwrap(await api.get('/currency/all'));
    return {
      ok: true,
      currencies: (Array.isArray(rows) ? rows : []).map((row) => ({
        id: row.id,
        code: row.code ?? row.symbol ?? '',
        name: row.name ?? '',
      })),
    };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), currencies: [] };
  }
};
