import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Renders an ISO timestamp in the language the client is reading.
 *
 * This is the reason money and dates cross the wire as numbers and ISO
 * strings rather than as display text: a server that formats "Aug 20, 2025"
 * has already decided the reader is English, and nothing downstream can undo
 * that.
 */
export const useDateFormat = () => {
  const { i18n } = useTranslation();

  return useCallback(
    (value, options) => {
      if (!value) return '—';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return String(value);

      return new Intl.DateTimeFormat(i18n.language, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        ...options,
      }).format(date);
    },
    [i18n.language]
  );
};

export default useDateFormat;
