import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Title row for pages that are not in the bottom navigation.
 *
 * Those pages are reached from the account sheet, so without a back control
 * they are dead ends — the only way out is to pick an unrelated tab. Pages
 * that do have a nav entry should render their own heading instead; a back
 * arrow there would be redundant.
 */
const PageHeader = ({ title, actions, backOnMobileOnly = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // 'default' means this is the first entry in the session's history, so
  // there is nothing to go back to — send the user to the trade station
  // rather than out of the app.
  const goBack = () => {
    if (location.key && location.key !== 'default') navigate(-1);
    else navigate('/');
  };

  return (
    <div className="flex items-center gap-1.5 mb-3">
      {/* Pages that have their own entry in the desktop header nav do not
          need a back arrow there — it only exists because the phone reaches
          them through the account sheet. */}
      <button
        onClick={goBack}
        aria-label={t('common.back')}
        title={t('common.back')}
        className={`flex-shrink-0 w-8 h-8 -ml-1.5 items-center justify-center rounded-lg text-content-muted hover:text-content hover:bg-overlay transition-colors ${
          backOnMobileOnly ? 'flex lg:hidden' : 'flex'
        }`}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <h1 className="text-lg sm:text-xl font-bold text-content truncate">{title}</h1>
      {actions && <div className="ml-auto flex-shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
