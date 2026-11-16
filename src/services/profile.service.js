import api, { apiErrorMessage, writeToken } from '@/lib/api';
import { toProfile, fromProfile, legalStateFrom } from '@/adapters/profile';

const unwrap = (response) => response?.data?.data ?? response?.data ?? {};

export const fetchProfile = async () => {
  try {
    return { ok: true, profile: toProfile(unwrap(await api.get('/users/profile/index'))) };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), profile: null };
  }
};

/**
 * Accepts either a domain profile or a plain object of already-named fields,
 * so the onboarding wizard can post its suitability answers through the same
 * endpoint without pretending they are profile fields.
 */
export const updateProfile = async (payload) => {
  try {
    const body = payload.permanentAddress !== undefined ? fromProfile(payload) : payload;
    const data = unwrap(await api.post('/users/account/update', body));
    return { ok: true, profile: toProfile(data) };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The profile could not be saved.') };
  }
};

/**
 * Changing the password reissues the token.
 *
 * The previous platform stored the new one in localStorage only, while every
 * request read from the cookie — so after a password change the client kept
 * presenting the old token until it expired. writeToken updates both.
 */
export const changePassword = async ({ currentPassword, password, confirmPassword }) => {
  try {
    const data = unwrap(
      await api.post('/users/account/change/password', {
        old_password: currentPassword,
        password,
        confirm_password: confirmPassword,
      })
    );
    if (data?.token) writeToken(data.token, { remember: true });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The password could not be changed.') };
  }
};

export const updateAvatar = async (file) => {
  try {
    const form = new FormData();
    form.append('image', file);
    const data = unwrap(
      await api.post('/users/account/update/image', form, { headers: { 'Content-Type': 'multipart/form-data' } })
    );
    return { ok: true, image: data?.image ?? null };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The photo could not be uploaded.') };
  }
};

export const setAiTrading = async (enabled) => {
  try {
    await api.post('/users/profile/ai-trading', { ai_trading: enabled ? 1 : 0 });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error) };
  }
};

const postLegalDocument = async (path) => {
  try {
    const data = unwrap(await api.post(path));
    return { ok: true, legal: legalStateFrom(data) };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The document could not be recorded.'), legal: null };
  }
};

/** Empty body — the token is the signature. Completing again is a no-op. */
export const signClientAgreement = () => postLegalDocument('/users/profile/client-agreement');

export const reviewRiskAcknowledgement = () => postLegalDocument('/users/profile/risk-acknowledgement');

/* -------------------------------------------------------------------- KYC */

export const fetchKyc = async () => {
  try {
    const data = unwrap(await api.get('/users/kyc'));
    // The endpoint is paginated: the rows sit under `data.data`.
    const rows = Array.isArray(data) ? data : data?.data ?? data?.documents ?? [];
    return { ok: true, documents: Array.isArray(rows) ? rows : [] };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), documents: [] };
  }
};

/**
 * @param name  the document type, e.g. 'passport'
 * @param id    present when replacing a rejected document rather than adding
 */
export const uploadKyc = async ({ name, file, id }) => {
  try {
    const form = new FormData();
    // Creating a document posts the file under the document-type name, which
    // is what the store endpoint reads. Replacing one posts `file` + `name`.
    if (id) {
      form.append('name', name);
      form.append('file', file);
    } else {
      form.append(name, file);
    }
    const url = id ? `/users/kyc/update/${id}` : '/users/kyc/store';
    const data = unwrap(await api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } }));
    return { ok: true, document: data };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The document could not be uploaded.') };
  }
};

/* ----------------------------------------------------------- certificates */

export const fetchCertificates = async () => {
  try {
    const data = unwrap(await api.get('/users/certificates'));
    return { ok: true, certificates: Array.isArray(data) ? data : data?.data ?? [] };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error), certificates: [] };
  }
};

export const buyCertificate = async ({ id, duration, distributionPeriod }) => {
  try {
    await api.post('/users/certificates/post', {
      id,
      duration,
      distribution_period: distributionPeriod,
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, 'The certificate could not be purchased.') };
  }
};
