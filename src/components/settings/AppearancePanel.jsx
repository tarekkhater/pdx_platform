import React from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun, MonitorSmartphone, Check } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import SubSheet from './SubSheet';

const OPTIONS = [
  { mode: 'dark', icon: Moon },
  { mode: 'light', icon: Sun },
  { mode: 'system', icon: MonitorSmartphone },
];

const AppearancePanel = ({ isOpen, onBack }) => {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();

  return (
    <SubSheet isOpen={isOpen} onBack={onBack} title={t('settings.appearance')}>
      <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-faint">
        {t('appearance.theme')}
      </p>
      <div className="rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden">
        {OPTIONS.map(({ mode: value, icon: Icon }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              onClick={() => setMode(value)}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-overlay transition-colors"
            >
              <Icon
                className={`w-[17px] h-[17px] ${active ? 'text-yellow-500' : 'text-content-muted'}`}
                strokeWidth={1.8}
              />
              <span className="flex-1 min-w-0">
                <span className={`block text-[14px] ${active ? 'text-yellow-500 font-semibold' : 'text-content'}`}>
                  {t(`appearance.modes.${value}`)}
                </span>
                <span className="block text-[11.5px] text-content-faint">
                  {t(`appearance.descriptions.${value}`)}
                </span>
              </span>
              {active && <Check className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      <p className="px-1 pt-3 text-[11.5px] text-content-faint">{t('appearance.note')}</p>
    </SubSheet>
  );
};

export default AppearancePanel;
