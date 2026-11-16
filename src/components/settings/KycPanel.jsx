import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, CheckCircle2, Clock, UploadCloud, FileText, Upload, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import SubSheet from './SubSheet';
import { fetchKyc, uploadKyc } from '@/services/profile.service';
import { useAuth } from '@/context/AuthContext';

/**
 * The four documents the platform asks for, mapped to the column names the
 * KYC table actually stores. The ids stay camelCase so the copy keys in
 * locales do not have to change.
 */
const DOCUMENTS = [
  { id: 'frontId', field: 'front_id' },
  { id: 'backId', field: 'back_id' },
  { id: 'selfie', field: 'selfy' },
  { id: 'proofOfAddress', field: 'por' },
];

const STATUS_STYLES = {
  approved: { icon: CheckCircle2, text: 'text-gain', bg: 'bg-emerald-500/10' },
  pending: { icon: Clock, text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10' },
  missing: { icon: UploadCloud, text: 'text-content-faint', bg: 'bg-hairline' },
};

const statusOf = (record, field, kycApproved) => {
  if (!record?.[field]) return 'missing';
  return kycApproved || String(record.status).toLowerCase() === 'approved' ? 'approved' : 'pending';
};

const KycPanel = ({ isOpen, onBack }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const fileRef = useRef(null);
  const [pendingId, setPendingId] = useState(null);
  const [record, setRecord] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const result = await fetchKyc();
    const rows = result.documents;
    // Uploads made before the list was read correctly each created their own
    // record, so the newest one is the one to update.
    setRecord(rows.length ? rows.reduce((latest, row) => (row.id > latest.id ? row : latest)) : null);
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const kycApproved = Boolean(user?.kycApproved);
  const approved = DOCUMENTS.filter((d) => statusOf(record, d.field, kycApproved) === 'approved').length;

  const openPicker = (id) => {
    setPendingId(id);
    fileRef.current?.click();
  };

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const doc = DOCUMENTS.find((d) => d.id === pendingId);
    if (!file || !doc) return;

    setBusy(true);
    const result = await uploadKyc({ name: doc.field, file, id: record?.id });
    setBusy(false);
    setPendingId(null);

    if (!result.ok) {
      toast({ title: t('kyc.uploadFailedTitle'), description: result.message, variant: 'destructive' });
      return;
    }

    toast({
      title: t('kyc.uploadedTitle'),
      description: t('kyc.uploadedDesc', { document: t(`kyc.documents.${doc.id}`) }),
    });
    await load();
  };

  return (
    <SubSheet isOpen={isOpen} onBack={onBack} title={t('settings.kyc')}>
      <div className="rounded-xl bg-surface-raised border border-hairline p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-yellow-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-yellow-500" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-content">
              {kycApproved ? t('kyc.status.approved') : t('kyc.inReview')}
            </p>
            <p className="text-[12px] text-content-muted">
              {t('kyc.progress', { approved, total: DOCUMENTS.length })}
            </p>
          </div>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-hairline overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(approved / DOCUMENTS.length) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-yellow-500"
          />
        </div>
      </div>

      <p className="px-1 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-content-faint">
        {t('kyc.requiredDocuments')}
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={onFileChosen}
        className="hidden"
      />

      <div className="rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden">
        {DOCUMENTS.map((doc) => {
          const status = statusOf(record, doc.field, kycApproved);
          const { icon: Icon, text, bg } = STATUS_STYLES[status];
          return (
            <div key={doc.id} className="flex items-center gap-3 px-3.5 py-3">
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${text} ${bg}`}>
                <Icon className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] text-content truncate">{t(`kyc.documents.${doc.id}`)}</span>
                <span className="block text-[11.5px] truncate">
                  <span className={`font-semibold ${text}`}>{t(`kyc.status.${status}`)}</span>
                  <span className="text-content-faint">
                    {' · '}
                    {record?.[doc.field] ? t('kyc.uploadedLabel') : t('kyc.notUploaded')}
                  </span>
                </span>
              </span>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() => openPicker(doc.id)}
                disabled={busy}
                title={t('kyc.upload')}
                className={`flex-shrink-0 h-8 px-2.5 rounded-lg flex items-center gap-1.5 text-[11.5px] font-semibold transition-colors disabled:opacity-60 ${
                  status === 'missing'
                    ? 'bg-yellow-500 text-black hover:bg-yellow-600'
                    : 'bg-overlay text-content-muted hover:bg-overlay-strong hover:text-content'
                }`}
              >
                {busy && pendingId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {status === 'missing' ? t('kyc.upload') : t('kyc.replace')}
              </motion.button>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 mt-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-[11.5px] text-yellow-700 dark:text-yellow-300">
        <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
        {t('kyc.notice')}
      </div>
    </SubSheet>
  );
};

export default KycPanel;
