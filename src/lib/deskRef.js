/**
 * The referral token that attributes a new account to the desk that sent it.
 *
 * It arrives as ?desk_ref= on the very first link the prospect follows and
 * has to survive until the account is actually created — which may be several
 * screens and, if they close the tab and come back, several sessions later.
 * Hence localStorage rather than a route param.
 *
 * Losing this loses the commission on the account, which is why it is
 * captured before React mounts rather than inside a component that a
 * redirect might never render.
 */

export const DESK_REF_KEY = 'signup_desk_ref';

const MAX_LENGTH = 512;

const readFromSearch = (search) => {
  if (typeof search !== 'string') return null;
  try {
    const value = new URLSearchParams(search.startsWith('?') ? search : `?${search}`).get('desk_ref');
    const trimmed = value?.trim();
    return trimmed && trimmed.length <= MAX_LENGTH ? trimmed : null;
  } catch {
    return null;
  }
};

/** Called once on load, before the first render. */
export const captureDeskRef = () => {
  const ref = readFromSearch(window.location.search);
  if (!ref) return;
  try {
    localStorage.setItem(DESK_REF_KEY, ref);
  } catch {
    // Private mode or a full quota. The referral is lost; nothing else is.
  }
};

export const getDeskRef = () => {
  try {
    const value = localStorage.getItem(DESK_REF_KEY)?.trim();
    return value && value.length <= MAX_LENGTH ? value : null;
  } catch {
    return null;
  }
};

export const clearDeskRef = () => {
  try {
    localStorage.removeItem(DESK_REF_KEY);
  } catch {
    // Nothing to do.
  }
};
