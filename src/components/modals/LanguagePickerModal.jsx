import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X, Check } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages';

const LanguagePickerModal = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/60"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 }}
            className="fixed inset-x-0 bottom-0 z-[81] max-h-[75vh] overflow-y-auto custom-scrollbar bg-surface-raised rounded-t-2xl border-t border-hairline sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-6 sm:w-[380px] sm:rounded-2xl sm:border"
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              <h2 className="text-[18px] font-bold text-content">{t('settings.language')}</h2>
              <button onClick={onClose} className="text-content-muted hover:text-content transition-colors p-1 -mr-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-3 pb-6 space-y-0.5">
              {Object.keys(LANGUAGES).map((lng) => {
                const active = i18n.resolvedLanguage === lng;
                return (
                  <button
                    key={lng}
                    onClick={() => changeLanguage(lng)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-colors ${
                      active ? 'bg-yellow-500/10' : 'hover:bg-overlay'
                    }`}
                  >
                    <span className="text-[20px] flex-shrink-0">{LANGUAGES[lng].flag}</span>
                    <span className={`flex-1 text-[15px] ${active ? 'text-yellow-500 font-semibold' : 'text-content'}`}>
                      {LANGUAGES[lng].nativeName}
                    </span>
                    {active && <Check className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LanguagePickerModal;
