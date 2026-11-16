import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, User, Lock, ChevronRight } from 'lucide-react';

// Shared by the /profile page and Settings → My Profile. They used to be two
// separate copies, which is how they ended up looking nothing alike.

// Identity documents live under Settings → KYC Verification, so this is purely
// the account holder's own details. Split into two groups so the form is half
// as tall on a wide screen, and so the break reads as identity / location
// rather than an arbitrary cut.
//
// The email is read-only because it identifies the account: changing it is a
// support operation, not a form field.
export const IDENTITY = [
  { id: 'email', readOnly: true },
  { id: 'firstName' },
  { id: 'lastName' },
  { id: 'phone' },
];

export const LOCATION = [{ id: 'country' }, { id: 'city' }, { id: 'address' }, { id: 'postalCode' }];

export const ALL_FIELDS = [...IDENTITY, ...LOCATION];

/**
 * The profile as the form holds it.
 *
 * `city` has no column server-side — the address is one free-text field there
 * — so it stays empty rather than being invented from the address string.
 */
export const fromProfile = (profile = {}) => ({
  email: profile.email ?? '',
  firstName: profile.name ?? '',
  lastName: profile.surname ?? '',
  phone: profile.phone ?? '',
  country: profile.country ?? '',
  city: profile.city ?? '',
  address: profile.address ?? '',
  postalCode: profile.postal ?? '',
});

export const toProfilePayload = (values = {}) => ({
  name: values.firstName,
  surname: values.lastName,
  phone: values.phone,
  country: values.country,
  address: values.address,
  permanent_address: values.address,
  postal: values.postalCode,
});

const SECTION = 'px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-faint';
const CARD = 'rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden';

// Compact header: small avatar, name and email on one line. A large centred
// portrait cost ~60px of vertical space for no extra information.
export const ProfileHeader = ({ photo, onPickPhoto, name, email }) => {
  const fileRef = useRef(null);
  return (
    <div className="rounded-xl bg-surface-raised border border-hairline p-3 flex items-center gap-3">
      <button onClick={() => fileRef.current?.click()} className="relative flex-shrink-0">
        <span className="w-12 h-12 rounded-full bg-surface-subtle border border-hairline flex items-center justify-center overflow-hidden">
          {photo ? (
            <img src={photo} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-content-faint" strokeWidth={1.6} />
          )}
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-yellow-500 text-black flex items-center justify-center border-2 border-surface-raised">
          <Camera className="w-2.5 h-2.5" />
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold text-content truncate">{name}</p>
        <p className="text-[12px] text-content-muted truncate">{email}</p>
      </div>
    </div>
  );
};

// Label left, value right. Stacking them doubled the height of every row, and
// the input needs no box of its own — the card and its dividers already group
// them.
const Field = ({ field, value, onChange, t }) => (
  <div className="flex items-center gap-3 px-3.5 py-2">
    <label htmlFor={`profile-${field.id}`} className="text-[13px] text-content-muted flex-shrink-0">
      {t(`profile.fields.${field.id}`)}
    </label>
    <input
      id={`profile-${field.id}`}
      value={value}
      readOnly={field.readOnly}
      onChange={(e) => onChange(field.id, e.target.value)}
      className={`flex-1 min-w-0 bg-transparent text-right text-[14px] text-content focus:outline-none ${
        field.readOnly ? 'text-content-muted cursor-not-allowed' : ''
      }`}
    />
  </div>
);

export const ProfileFields = ({ values, onChange }) => {
  const { t } = useTranslation();
  const render = (f) => (
    <Field key={f.id} field={f} value={values[f.id]} onChange={onChange} t={t} />
  );

  return (
    <div>
      <p className={SECTION}>{t('profile.personalInfo')}</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className={CARD}>{IDENTITY.map(render)}</div>
        <div className={CARD}>{LOCATION.map(render)}</div>
      </div>
    </div>
  );
};

export const SecuritySection = ({ onChangePassword }) => {
  const { t } = useTranslation();
  return (
    <div>
      <p className={`${SECTION} pt-2`}>{t('profile.security')}</p>
      <div className="rounded-xl bg-surface-raised border border-hairline overflow-hidden">
        <button
          onClick={onChangePassword}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-overlay transition-colors"
        >
          <Lock className="w-[17px] h-[17px] text-content-muted" strokeWidth={1.8} />
          <span className="flex-1 text-[14px] text-content">{t('profile.changePassword')}</span>
          <ChevronRight className="w-4 h-4 text-content-faint" />
        </button>
      </div>
    </div>
  );
};
