/**
 * Backend user shapes → the shape the interface reads.
 *
 * This is one half of the boundary described in INTEGRATION.md: below it the
 * API's snake_case exists, above it nothing does. A component never reads
 * `ai_trading`, and the day that field is renamed server-side, this file is
 * the only one that changes.
 */

/**
 * Laravel returns booleans as 0/1, "0"/"1", true/false and occasionally null
 * depending on whether a value came from the database, a cast or a literal.
 * Treating "0" as truthy — which it is in JavaScript — would let a blocked
 * account straight through the login check.
 */
const bool = (value) => value === true || value === 1 || value === '1';

const LEGAL_FALLBACKS = [
  { key: 'client_agreement', title: 'Client Agreement', action: 'sign', doneFlag: 'client_agreement' },
  { key: 'risk_acknowledgement', title: 'Risk Acknowledgement', action: 'review', doneFlag: 'risk_acknowledgement' },
];

export const toLegalDocument = (row = {}, completedFallback = false) => {
  const completed = row.completed !== undefined ? bool(row.completed) : bool(completedFallback);
  const action = row.action === 'review' ? 'review' : 'sign';
  return {
    key: row.key ?? null,
    title: row.title ?? '',
    completed,
    status: row.status === 'completed' || completed ? 'completed' : 'pending',
    statusLabel: row.status_label || (completed ? (action === 'review' ? 'Reviewed' : 'Signed') : 'Awaiting your action'),
    action,
    completedAt: row.completed_at ?? null,
  };
};

/**
 * The two onboarding documents, as the profile and login payloads send them.
 *
 * An empty `legal_documents` array still has to become a list — the complete
 * endpoints have returned `[]` in the docs — so the booleans are the fallback.
 */
export const toLegalDocuments = (rows, source = {}) => {
  if (Array.isArray(rows) && rows.length) return rows.map((row) => toLegalDocument(row));
  return LEGAL_FALLBACKS.map((item) =>
    toLegalDocument(
      { key: item.key, title: item.title, action: item.action, completed: source[item.doneFlag] },
      source[item.doneFlag]
    )
  );
};

export const legalStateFrom = (data = {}) => ({
  clientAgreement: bool(data.client_agreement),
  riskAcknowledgement: bool(data.risk_acknowledgement),
  legalDocuments: toLegalDocuments(data.legal_documents, data),
});

/** The session user, as returned inside the login / register response. */
export const toUser = (data = {}) => ({
  id: data.id ?? null,
  name: data.name ?? '',
  surname: data.surname ?? '',
  email: data.email ?? '',
  image: data.image || null,
  role: data.role ?? null,
  accountType: data.type ?? null,
  verified: bool(data.verified),
  kycApproved: bool(data.kyc),
  blocked: bool(data.block),
  aiTrading: bool(data.ai_trading),
  ...legalStateFrom(data),
});

/** The full profile behind Settings → My Profile. */
export const toProfile = (data = {}) => ({
  ...toUser(data),
  phone: data.phone ?? '',
  country: data.country ?? '',
  currency: data.currency ?? '',
  postal: data.postal ?? '',
  address: data.address ?? '',
  permanentAddress: data.permanent_address ?? '',
});

/** The reverse direction, for profile updates. */
export const fromProfile = (profile = {}) => ({
  name: profile.name,
  surname: profile.surname,
  phone: profile.phone,
  country: profile.country,
  currency: profile.currency,
  postal: profile.postal,
  address: profile.address,
  permanent_address: profile.permanentAddress,
});
