import React from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Globe, AlertTriangle } from 'lucide-react';
import SubSheet from './SubSheet';
import { ABOUT, COMPANY } from '@/data/legalContent';
import BrandMark from '@/components/BrandMark';

const AboutPanel = ({ isOpen, onBack }) => {
  const { t } = useTranslation();

  const contacts = [
    { icon: Mail, value: COMPANY.email, href: `mailto:${COMPANY.email}` },
    { icon: Phone, value: COMPANY.phone, href: `tel:${COMPANY.phone.replace(/\s/g, '')}` },
    { icon: Globe, value: COMPANY.website, href: COMPANY.websiteUrl },
  ];

  return (
    <SubSheet isOpen={isOpen} onBack={onBack} title={t('settings.aboutUs')}>
      <div className="flex flex-col items-center text-center pb-5">
        <BrandMark className="w-14 h-14 rounded-2xl" alt={COMPANY.name} />
        <h3 className="mt-3 text-[18px] font-bold text-content">{COMPANY.name}</h3>
        <p className="text-[12.5px] text-content-muted px-4">{ABOUT.tagline}</p>
      </div>

      <div className="rounded-xl bg-surface-raised border border-hairline p-4 space-y-3">
        {ABOUT.intro.map((paragraph, i) => (
          <p key={i} className="text-[12.5px] leading-relaxed text-content-muted">
            {paragraph}
          </p>
        ))}
      </div>

      <p className="px-1 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-faint">
        {t('about.whatWeStandFor')}
      </p>
      <div className="rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden">
        {ABOUT.values.map((value) => (
          <div key={value.title} className="px-3.5 py-3">
            <p className="text-[13.5px] font-semibold text-content">{value.title}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-content-muted">{value.body}</p>
          </div>
        ))}
      </div>

      <p className="px-1 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-faint">
        {t('about.contact')}
      </p>
      <div className="rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden">
        {contacts.map(({ icon: Icon, value, href }) => {
          const content = (
            <>
              <Icon className="w-[17px] h-[17px] text-content-muted flex-shrink-0" strokeWidth={1.8} />
              <span className="text-[13.5px] text-content truncate">{value}</span>
            </>
          );
          return href ? (
            <a
              key={value}
              href={href}
              {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="flex items-center gap-3 px-3.5 py-3 hover:bg-overlay transition-colors"
            >
              {content}
            </a>
          ) : (
            <div key={value} className="flex items-center gap-3 px-3.5 py-3">
              {content}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 mt-5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-[11.5px] leading-relaxed text-yellow-700 dark:text-yellow-300">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        {ABOUT.regulatory}
      </div>

      <p className="px-1 pt-4 text-center text-[11px] text-content-faint">
        {COMPANY.legalName} · {COMPANY.registration}
      </p>
    </SubSheet>
  );
};

export default AboutPanel;
