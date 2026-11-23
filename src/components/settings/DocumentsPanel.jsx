import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FileSignature, FileCheck2, Clock, Inbox, ChevronRight, TrendingUp, Landmark } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import SubSheet from './SubSheet';
import DocumentViewer from './DocumentViewer';
import {
  AGREEMENTS,
  ADDITIONAL_DOCUMENTS,
  DOC_KINDS,
  legalContentFor,
  readSubmissions,
  writeSubmissions,
} from '@/data/clientDocuments';
import { useAuth } from '@/context/AuthContext';
import { signClientAgreement, reviewRiskAcknowledgement } from '@/services/profile.service';

const TABS = [
  { id: 'agreements', docs: AGREEMENTS },
  { id: 'additional', docs: ADDITIONAL_DOCUMENTS },
];

const KIND_ICON = {
  [DOC_KINDS.SIGN]: FileSignature,
  [DOC_KINDS.ACKNOWLEDGE]: FileCheck2,
  [DOC_KINDS.LEVERAGE]: TrendingUp,
  [DOC_KINDS.TAX]: Landmark,
};

const STATUS_STYLE = {
  signed: 'bg-emerald-500/15 text-gain',
  completed: 'bg-emerald-500/15 text-gain',
  review: 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400',
  pending: 'bg-yellow-500 text-black',
};

const LEGAL_KEY = {
  clientAgreement: 'client_agreement',
  riskAcknowledgement: 'risk_acknowledgement',
};

const legalKeyOf = (doc) => doc?.key || LEGAL_KEY[doc?.id] || null;

const toViewerDoc = (item, content) => {
  const kind = item.action === 'review' ? DOC_KINDS.ACKNOWLEDGE : DOC_KINDS.SIGN;
  return {
    ...content,
    id: content?.id || item.key,
    key: item.key,
    title: item.title || content?.title,
    kind,
    action: item.action,
    completed: item.completed,
    status: item.status,
    statusLabel: item.statusLabel,
    completedAt: item.completedAt,
    sections: content?.sections || [],
    source: 'legal',
  };
};

const DocumentsPanel = ({ isOpen, onBack, accountName = 'Antimgreen' }) => {
  const { t } = useTranslation();
  const { user, setUser, refreshUser } = useAuth();
  const [tab, setTab] = useState('agreements');
  const [submissions, setSubmissions] = useState(readSubmissions);
  const [openDoc, setOpenDoc] = useState(null);

  useEffect(() => {
    writeSubmissions(submissions);
  }, [submissions]);

  useEffect(() => {
    if (!isOpen) {
      setOpenDoc(null);
      return;
    }
    refreshUser();
  }, [isOpen, refreshUser]);

  const legalItems = user?.legalDocuments ?? [];
  const legalOf = (doc) => legalItems.find((item) => item.key === legalKeyOf(doc));

  const statusOf = (doc) => {
    const legal = legalOf(doc);
    if (legal) return legal.completed ? 'completed' : legal.status || 'pending';
    return submissions[doc.id]?.status || 'pending';
  };

  const docs = TABS.find((x) => x.id === tab).docs;
  const outstanding = [...AGREEMENTS, ...ADDITIONAL_DOCUMENTS].filter((d) => statusOf(d) === 'pending').length;

  const open = (doc) => {
    const legal = legalOf(doc);
    if (legal) {
      setOpenDoc(toViewerDoc(legal, legalContentFor(legal.key) || doc));
      return;
    }
    setOpenDoc(doc);
  };

  const handleSubmit = async (docOrId, record) => {
    if (record) {
      setSubmissions((prev) => ({ ...prev, [docOrId]: record }));
      setOpenDoc(null);
      toast({
        title: t(record.status === 'review' ? 'documents.submittedReviewTitle' : 'documents.submittedTitle'),
        description: t(
          record.status === 'review' ? 'documents.submittedReviewDesc' : 'documents.submittedDesc'
        ),
        variant: record.status === 'review' ? 'pending' : 'success',
      });
      return true;
    }

    const doc = docOrId;
    const run =
      doc.action === 'review' || doc.key === 'risk_acknowledgement'
        ? reviewRiskAcknowledgement
        : signClientAgreement;
    const result = await run();
    if (!result.ok) {
      toast({
        title: t('documents.submitFailedTitle'),
        description: result.message,
        variant: 'destructive',
      });
      return false;
    }
    setUser((prev) => (prev ? { ...prev, ...result.legal } : prev));
    setOpenDoc(null);
    toast({
      title: t('documents.submittedTitle'),
      description: t('documents.submittedDesc'),
    });
    return true;
  };

  return (
    <>
      <SubSheet isOpen={isOpen} onBack={onBack} title={t('settings.documents')}>
        {outstanding > 0 && (
          <div className="flex items-start gap-2.5 mb-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3">
            <FileSignature className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] leading-relaxed text-yellow-700 dark:text-yellow-300">
              {t('documents.pendingBanner', { count: outstanding })}
            </p>
          </div>
        )}

        <div className="flex items-stretch gap-5 border-b border-hairline mb-3">
          {TABS.map(({ id }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`relative pb-2 text-[14px] transition-colors ${
                  active ? 'font-semibold text-content' : 'font-medium text-content-faint hover:text-content-muted'
                }`}
              >
                {t(`documents.tabs.${id}`)}
                {active && (
                  <motion.span
                    layoutId="documentsTabUnderline"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-yellow-500"
                  />
                )}
              </button>
            );
          })}
        </div>

        {docs.length === 0 ? (
          <div className="rounded-xl border border-hairline bg-surface-raised px-4 py-10 flex flex-col items-center text-center">
            <Inbox className="w-7 h-7 text-content-faint mb-2" strokeWidth={1.6} />
            <p className="text-[13px] text-content-muted">{t('documents.emptyAdditional')}</p>
          </div>
        ) : (
          <div className="rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden">
            {docs.map((doc) => {
              const legal = legalOf(doc);
              const status = statusOf(doc);
              const Icon = KIND_ICON[doc.kind] || FileSignature;
              const pending = status === 'pending';
              const subtitle = legal
                ? legal.statusLabel
                : `${doc.from ? `${doc.from} · ` : ''}${t(`documents.status.${status}`)}`;
              const badge = pending
                ? t(`documents.cta.${doc.kind}`)
                : legal
                  ? legal.statusLabel
                  : t(`documents.status.${status}`);
              return (
                <button
                  key={doc.id}
                  onClick={() => open(doc)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-overlay transition-colors"
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      status === 'signed' || status === 'completed' ? 'bg-emerald-500/10 text-gain' : 'bg-overlay text-content-muted'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.9} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] text-content truncate">{legal?.title || doc.title}</span>
                    <span className="block text-[11.5px] text-content-faint truncate">{subtitle}</span>
                  </span>
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      STATUS_STYLE[status] || STATUS_STYLE.pending
                    }`}
                  >
                    {badge}
                  </span>
                  <ChevronRight className="w-4 h-4 text-content-faint flex-shrink-0 -ml-1" />
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-start gap-2 mt-4 rounded-xl bg-surface-raised border border-hairline p-3">
          <Clock className="w-4 h-4 text-content-muted flex-shrink-0 mt-0.5" />
          <p className="text-[11.5px] leading-relaxed text-content-muted">{t('documents.notice')}</p>
        </div>
      </SubSheet>

      <DocumentViewer
        doc={openDoc}
        submission={
          openDoc?.source === 'legal'
            ? {
                status: openDoc.status,
                at: openDoc.completedAt,
                statusLabel: openDoc.statusLabel,
              }
            : openDoc
              ? submissions[openDoc.id]
              : null
        }
        isOpen={!!openDoc}
        onBack={() => setOpenDoc(null)}
        onSubmit={handleSubmit}
        accountName={accountName}
      />
    </>
  );
};

export default DocumentsPanel;
