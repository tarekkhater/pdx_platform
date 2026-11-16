import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Compass } from 'lucide-react';

/**
 * Unknown paths used to render an empty page inside the full account chrome,
 * which reads as a screen that failed to load rather than an address that
 * does not exist.
 */
const NotFound = () => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center text-center py-24 px-6"
    >
      <Compass className="w-8 h-8 text-content-faint mb-3" strokeWidth={1.6} />
      <h1 className="text-[20px] font-bold text-content">{t('notFound.title')}</h1>
      <p className="mt-1 text-[13px] text-content-muted max-w-sm">{t('notFound.description')}</p>
      <Link
        to="/"
        className="mt-5 h-10 px-5 inline-flex items-center rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-[13.5px] transition-colors"
      >
        {t('notFound.action')}
      </Link>
    </motion.div>
  );
};

export default NotFound;
