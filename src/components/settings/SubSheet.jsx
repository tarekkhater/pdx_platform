import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

// Shared shell for every Settings detail screen — slides in over the Settings
// list and hands back with the same gesture, so the panels themselves only
// have to describe their content.
const SubSheet = ({ isOpen, onBack, title, children }) => (
  <AnimatePresence>
    {isOpen && (
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
        className="fixed inset-0 z-[75] bg-surface overflow-y-auto custom-scrollbar"
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 px-3 py-3 bg-surface/95 backdrop-blur border-b border-hairline">
          <button
            onClick={onBack}
            className="w-8 h-8 -ml-1 flex items-center justify-center rounded-lg text-content-muted hover:text-content hover:bg-overlay transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-[17px] font-bold text-content">{title}</h2>
        </div>

        <div className="px-4 pb-10 pt-4">{children}</div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default SubSheet;
