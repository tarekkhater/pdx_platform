import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, ChevronRight } from 'lucide-react';
import SubSheet from './SubSheet';
import { LEGAL_DOCUMENTS, COMPANY } from '@/data/legalContent';

const toParagraphs = (body) => (Array.isArray(body) ? body : [body]);

const LegalPanel = ({ isOpen, onBack }) => {
  const { t } = useTranslation();
  const [openDoc, setOpenDoc] = useState(null);
  const doc = LEGAL_DOCUMENTS.find((d) => d.id === openDoc);

  return (
    <>
      <SubSheet isOpen={isOpen && !doc} onBack={onBack} title={t('settings.legal')}>
        <div className="rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden">
          {LEGAL_DOCUMENTS.map((d) => (
            <button
              key={d.id}
              onClick={() => setOpenDoc(d.id)}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-overlay transition-colors"
            >
              <FileText className="w-[17px] h-[17px] text-content-muted flex-shrink-0" strokeWidth={1.8} />
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] text-content truncate">{d.title}</span>
                <span className="block text-[11.5px] text-content-faint">
                  {t('legal.updated', { date: d.updated })}
                </span>
              </span>
              <ChevronRight className="w-4 h-4 text-content-faint flex-shrink-0" />
            </button>
          ))}
        </div>

        <p className="px-1 pt-4 text-[11.5px] leading-relaxed text-content-faint">
          {COMPANY.legalName} · {COMPANY.registration}
          <br />
          {COMPANY.address}
        </p>
      </SubSheet>

      <SubSheet isOpen={!!doc} onBack={() => setOpenDoc(null)} title={doc?.title || ''}>
        {doc && (
          <>
            <p className="text-[11.5px] text-content-faint pb-3">
              {t('legal.updated', { date: doc.updated })}
            </p>
            <div className="rounded-xl bg-surface-raised border border-hairline p-4 space-y-5">
              {doc.sections.map((section) => (
                <section key={section.heading}>
                  <h3 className="text-[13px] font-semibold text-content">{section.heading}</h3>
                  {toParagraphs(section.body).map((paragraph, i) => (
                    <p key={i} className="mt-1.5 text-[12.5px] leading-relaxed text-content-muted">
                      {paragraph}
                    </p>
                  ))}
                </section>
              ))}
            </div>
          </>
        )}
      </SubSheet>
    </>
  );
};

export default LegalPanel;
