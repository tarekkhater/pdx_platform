import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  X, User, Contrast, Globe, HelpCircle, Info, FileText, LogOut, ChevronRight,
  ShieldCheck, FolderOpen, TrendingUp,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { LANGUAGES } from '@/lib/languages';
import { useTheme } from '@/context/ThemeContext';
import LanguagePickerModal from '@/components/modals/LanguagePickerModal';
import { useLogout } from '@/hooks/use-logout';
import { useAuth } from '@/context/AuthContext';
import { setAiTrading } from '@/services/profile.service';
import ProfilePanel from '@/components/settings/ProfilePanel';
import KycPanel from '@/components/settings/KycPanel';
import AppearancePanel from '@/components/settings/AppearancePanel';
import LegalPanel from '@/components/settings/LegalPanel';
import AboutPanel from '@/components/settings/AboutPanel';
import DocumentsPanel from '@/components/settings/DocumentsPanel';
import SupportChat from '@/components/support/SupportChat';

const Group = ({ children }) => (
  <div className="rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden">
    {children}
  </div>
);

const Row = ({ icon: Icon, label, sub, value, danger, onClick, chevron = true }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-overlay transition-colors"
  >
    {Icon && (
      <Icon
        className={`w-[17px] h-[17px] flex-shrink-0 ${danger ? 'text-loss' : 'text-content-muted'}`}
        strokeWidth={1.8}
      />
    )}
    <span className="flex-1 min-w-0">
      <span className={`block text-[14px] truncate ${danger ? 'text-loss' : 'text-content'}`}>{label}</span>
      {sub && <span className="block text-[11.5px] text-content-faint truncate">{sub}</span>}
    </span>
    {value && <span className="text-[12px] text-content-faint flex-shrink-0">{value}</span>}
    {chevron && !danger && <ChevronRight className="w-4 h-4 text-content-faint flex-shrink-0" />}
  </button>
);

const SettingsSheet = ({ isOpen, onClose, accountName = 'Antimgreen', initialPanel = null }) => {
  const logout = useLogout();
  const { user, setUser, refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  const { mode } = useTheme();
  const [panel, setPanel] = useState(null);
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);

  // Opening straight into a panel (e.g. "My Profile" from the account sheet)
  // still leaves the Settings list underneath, so backing out lands there.
  useEffect(() => {
    if (isOpen) setPanel(initialPanel);
  }, [isOpen, initialPanel]);

  const currentLanguage = LANGUAGES[i18n.resolvedLanguage]?.nativeName || LANGUAGES.en.nativeName;
  const closePanel = () => setPanel(null);

  const toggleAi = async () => {
    if (aiBusy) return;
    const next = !user?.aiTrading;
    setAiBusy(true);
    const result = await setAiTrading(next);
    setAiBusy(false);
    if (!result.ok) {
      toast({ title: t('settings.aiTradingFailed'), description: result.message, variant: 'destructive' });
      return;
    }
    setUser((prev) => (prev ? { ...prev, aiTrading: next } : prev));
    refreshUser();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-[70] bg-surface overflow-y-auto custom-scrollbar"
          >
            <div className="flex items-center justify-between px-4 pt-4">
              <h1 className="text-[22px] font-bold text-content">{t('settings.title')}</h1>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-content-muted hover:text-content hover:bg-overlay transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pb-10 pt-4 space-y-2.5">
              <Group>
                <Row
                  icon={User}
                  label={accountName}
                  sub={t('settings.accountSub')}
                  onClick={() => setPanel('profile')}
                />
              </Group>

              <Group>
                <Row
                  icon={Contrast}
                  label={t('settings.appearance')}
                  value={t(`appearance.modes.${mode}`)}
                  onClick={() => setPanel('appearance')}
                />
                <Row
                  icon={Globe}
                  label={t('settings.language')}
                  value={currentLanguage}
                  onClick={() => setIsLanguageOpen(true)}
                />
              </Group>

              <Group>
                <Row
                  icon={ShieldCheck}
                  label={t('settings.kyc')}
                  value={user?.kycApproved ? t('kyc.status.approved') : t('kyc.status.pending')}
                  onClick={() => setPanel('kyc')}
                />
                <Row
                  icon={TrendingUp}
                  label={t('settings.aiTrading')}
                  value={user?.aiTrading ? t('settings.aiTradingOn') : t('settings.aiTradingOff')}
                  onClick={toggleAi}
                  chevron={false}
                />
                <Row icon={HelpCircle} label={t('settings.help')} onClick={() => setPanel('support')} />
                <Row icon={Info} label={t('settings.aboutUs')} onClick={() => setPanel('about')} />
                <Row icon={FileText} label={t('settings.legal')} onClick={() => setPanel('legal')} />
                <Row
                  icon={FolderOpen}
                  label={t('settings.documents')}
                  value={
                    (user?.legalDocuments || []).some((item) => !item.completed)
                      ? t('documents.status.pending')
                      : undefined
                  }
                  onClick={() => setPanel('documents')}
                />
              </Group>

              <Group>
                <Row icon={LogOut} label={t('settings.logOut')} danger onClick={() => logout(onClose)} />
              </Group>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProfilePanel isOpen={panel === 'profile'} onBack={closePanel} accountName={accountName} />
      <KycPanel isOpen={panel === 'kyc'} onBack={closePanel} />
      <AppearancePanel isOpen={panel === 'appearance'} onBack={closePanel} />
      <AboutPanel isOpen={panel === 'about'} onBack={closePanel} />
      <LegalPanel isOpen={panel === 'legal'} onBack={closePanel} />
      <DocumentsPanel isOpen={panel === 'documents'} onBack={closePanel} accountName={accountName} />
      <SupportChat isOpen={panel === 'support'} onBack={closePanel} accountName={accountName} />
      <LanguagePickerModal isOpen={isLanguageOpen} onClose={() => setIsLanguageOpen(false)} />
    </>
  );
};

export default SettingsSheet;
