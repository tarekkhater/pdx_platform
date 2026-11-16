import { useState, useEffect } from 'react';

export const useMediaQuery = (query) => {
  // Read the match up front rather than starting at false and correcting in
  // an effect — components that lay out differently per breakpoint otherwise
  // paint their phone layout for one frame on desktop.
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener();
    // matchMedia fires on the breakpoint itself; a resize listener only fires
    // while the window is being dragged, and never for a zoom or an
    // orientation change.
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
};
