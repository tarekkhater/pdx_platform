import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Bell, X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/use-media-query';

const NotificationsSheet = ({ isOpen, onClose, items = [] }) => {
  const { t } = useTranslation();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const empty = items.length === 0;

  const panelMotion = isDesktop
    ? {
        hidden: { opacity: 0, scale: 0.96, y: -10 },
        visible: {
          opacity: 1,
          scale: 1,
          y: 0,
          transition: { type: 'spring', stiffness: 480, damping: 34 },
        },
        exit: { opacity: 0, scale: 0.97, y: -8, transition: { duration: 0.15 } },
      }
    : {
        hidden: { y: '100%' },
        visible: { y: 0, transition: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.3 } },
        exit: { y: '100%', transition: { type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.25 } },
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
            className="fixed inset-0 z-[60] bg-black/60 lg:bg-black/25"
          />
          <motion.div
            variants={panelMotion}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={isDesktop ? { transformOrigin: 'top right' } : undefined}
            className="fixed inset-x-0 bottom-0 z-[61] max-h-[88vh] overflow-y-auto custom-scrollbar bg-surface-raised rounded-t-2xl border-t border-hairline sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[400px] sm:rounded-2xl sm:border lg:top-[53px] lg:bottom-auto lg:max-h-[calc(100vh-69px)] lg:shadow-2xl lg:shadow-black/50"
          >
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
              <h2 className="text-[17px] font-bold text-content">{t('notifications.title')}</h2>
              <button
                onClick={onClose}
                className="flex-shrink-0 w-7 h-7 -mr-1 flex items-center justify-center rounded-lg text-content-muted hover:text-content hover:bg-overlay transition-colors"
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>

            {empty ? (
              <div className="flex flex-col items-center justify-center text-center px-6 py-16">
                <span className="w-12 h-12 rounded-2xl bg-overlay flex items-center justify-center mb-3">
                  <Bell className="w-6 h-6 text-content-faint" strokeWidth={1.7} />
                </span>
                <p className="text-[15px] font-semibold text-content">{t('notifications.empty')}</p>
                <p className="mt-1 text-[12.5px] text-content-muted">{t('notifications.emptyDesc')}</p>
              </div>
            ) : (
              <div className="px-4 pb-4 divide-y divide-hairline">
                {items.map((item) => (
                  <div key={item.id} className="py-3">
                    <p className="text-[13.5px] font-semibold text-content">{item.title}</p>
                    {item.body && (
                      <p className="mt-0.5 text-[12.5px] text-content-muted leading-relaxed">{item.body}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationsSheet;
