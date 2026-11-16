import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import SubSheet from './SubSheet';
import { DOC_KINDS, LEVERAGE_OPTIONS, DEFAULT_LEVERAGE } from '@/data/clientDocuments';

const inputClass = (hasError) =>
  `w-full h-11 px-3 rounded-xl bg-surface border text-[14px] text-content placeholder:text-content-faint transition-colors focus:outline-none ${
    hasError ? 'border-loss focus:border-loss' : 'border-hairline focus:border-yellow-500'
  }`;

const Checkbox = ({ checked, onChange, children }) => (
  <button type="button" onClick={onChange} className="flex items-start gap-2.5 text-left w-full">
    <span
      className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded flex items-center justify-center border transition-colors ${
        checked ? 'bg-yellow-500 border-yellow-500' : 'border-hairline bg-surface'
      }`}
    >
      {checked && (
        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M2 6.5L4.5 9L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
    <span className="text-[12.5px] leading-relaxed text-content-muted">{children}</span>
  </button>
);

/**
 * Renders one document and the action it requires.
 *
 * Four documents, four different actions — a leverage increase is an
 * application with a value attached, a tax declaration collects fields, and
 * only the agreement actually needs a signature. Treating them all as
 * "tick and sign" would have been wrong for three of them.
 */
const DocumentViewer = ({ doc, submission, isOpen, onBack, onSubmit, accountName }) => {
  const { t } = useTranslation();
  const [agreed, setAgreed] = useState(false);
  const [signature, setSignature] = useState('');
  const [leverage, setLeverage] = useState(String(LEVERAGE_OPTIONS[1]));
  const [taxCountry, setTaxCountry] = useState('');
  const [tin, setTin] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const done =
    Boolean(doc?.completed) ||
    submission?.status === 'completed' ||
    submission?.status === 'signed' ||
    submission?.status === 'review';

  // Reset whenever a different document is opened, so answers never leak
  // between documents.
  useEffect(() => {
    setAgreed(false);
    setSignature('');
    setLeverage(String(LEVERAGE_OPTIONS[1]));
    setTaxCountry('');
    setTin('');
    setErrors({});
    setBusy(false);
  }, [doc?.id, isOpen]);

  const validate = () => {
    const found = {};
    if (!agreed) found.agreed = t('documents.errors.mustAgree');
    if (doc.kind === DOC_KINDS.SIGN) {
      if (!signature.trim()) found.signature = t('documents.errors.signatureRequired');
      else if (signature.trim().length < 3) found.signature = t('documents.errors.signatureShort');
    }
    if (doc.kind === DOC_KINDS.TAX) {
      if (!taxCountry.trim()) found.taxCountry = t('documents.errors.countryRequired');
      if (!tin.trim()) found.tin = t('documents.errors.tinRequired');
    }
    return found;
  };

  const handleSubmit = async () => {
    if (busy) return;
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;

    const isLegal = doc.source === 'legal' || doc.key === 'client_agreement' || doc.key === 'risk_acknowledgement';
    if (isLegal) {
      setBusy(true);
      await onSubmit(doc);
      setBusy(false);
      return;
    }

    const status = doc.kind === DOC_KINDS.LEVERAGE ? 'review' : 'signed';
    onSubmit(doc.id, {
      status,
      at: new Date().toISOString(),
      version: doc.version,
      ...(doc.kind === DOC_KINDS.SIGN && { signature: signature.trim() }),
      ...(doc.kind === DOC_KINDS.LEVERAGE && { requested: Number(leverage) }),
      ...(doc.kind === DOC_KINDS.TAX && { taxCountry: taxCountry.trim(), tin: tin.trim() }),
    });
  };

  const completedLabel = () => {
    if (submission?.status === 'review') {
      return t('documents.underReviewSince', {
        date: submission.at ? new Date(String(submission.at).replace(' ', 'T')).toLocaleDateString() : '',
        leverage: submission.requested,
      });
    }
    const raw = submission?.at || doc?.completedAt;
    const date = raw ? new Date(String(raw).replace(' ', 'T')) : null;
    const formatted = date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : '';
    if (submission?.statusLabel && formatted) return `${submission.statusLabel} · ${formatted}`;
    if (submission?.statusLabel) return submission.statusLabel;
    return t('documents.completedOn', { date: formatted });
  };

  const actionLabel = useMemo(() => {
    if (!doc) return '';
    if (doc.kind === DOC_KINDS.LEVERAGE) return t('documents.actions.submitRequest');
    if (doc.kind === DOC_KINDS.TAX) return t('documents.actions.submitDeclaration');
    if (doc.action === 'review' || doc.kind === DOC_KINDS.ACKNOWLEDGE) return t('documents.actions.acknowledge');
    return t('documents.actions.sign');
  }, [doc, t]);

  if (!doc) return null;

  return (
    <SubSheet isOpen={isOpen} onBack={onBack} title={doc.title}>
      {doc.version && (
        <p className="text-[11.5px] text-content-faint">
          {t('documents.versionLine', { version: doc.version, date: doc.updated })}
        </p>
      )}

      {done && (
        <div className="flex items-start gap-2.5 mt-3 rounded-xl border p-3 bg-emerald-500/10 border-emerald-500/20">
          {submission?.status === 'review' ? (
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-gain flex-shrink-0 mt-0.5" />
          )}
          <p
            className={`text-[12px] leading-relaxed ${
              submission?.status === 'review' ? 'text-yellow-700 dark:text-yellow-300' : 'text-gain'
            }`}
          >
            {completedLabel()}
          </p>
        </div>
      )}

      {doc.highlight && (
        <div className="flex items-start gap-2.5 mt-3 rounded-xl bg-red-500/10 border border-red-500/20 p-3">
          <AlertTriangle className="w-4 h-4 text-loss flex-shrink-0 mt-0.5" />
          <p className="text-[12px] leading-relaxed text-loss">{doc.highlight}</p>
        </div>
      )}

      <div className="mt-4 space-y-4">
        {(doc.sections || []).map((section) => (
          <div key={section.heading}>
            <h3 className="text-[13.5px] font-semibold text-content mb-1">{section.heading}</h3>
            {section.body.map((para, i) => (
              <p key={i} className="text-[12.5px] leading-relaxed text-content-muted mb-1.5">
                {para}
              </p>
            ))}
          </div>
        ))}
      </div>

      {!done && (
        <div className="mt-6 pt-5 border-t border-hairline space-y-3.5">
          {doc.kind === DOC_KINDS.LEVERAGE && (
            <>
              <div className="rounded-xl bg-surface-raised border border-hairline divide-y divide-hairline overflow-hidden">
                <div className="flex items-center justify-between px-3.5 py-2.5">
                  <span className="text-[13px] text-content-muted">{t('documents.currentLeverage')}</span>
                  <span className="text-[14px] font-semibold font-tabular text-content">1:{DEFAULT_LEVERAGE}</span>
                </div>
              </div>
              <div>
                <label htmlFor="doc-leverage" className="block text-[12.5px] font-medium text-content-muted mb-1.5">
                  {t('documents.requestedLeverage')}
                </label>
                <select
                  id="doc-leverage"
                  value={leverage}
                  onChange={(e) => setLeverage(e.target.value)}
                  className={`${inputClass(false)} appearance-none`}
                >
                  {LEVERAGE_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      1:{l}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {doc.kind === DOC_KINDS.TAX && (
            <>
              <div>
                <label htmlFor="doc-tax-country" className="block text-[12.5px] font-medium text-content-muted mb-1.5">
                  {t('documents.taxCountry')}
                </label>
                <input
                  id="doc-tax-country"
                  value={taxCountry}
                  onChange={(e) => {
                    setTaxCountry(e.target.value);
                    setErrors((p) => ({ ...p, taxCountry: undefined }));
                  }}
                  className={inputClass(errors.taxCountry)}
                />
                {errors.taxCountry && <p className="mt-1 text-[11.5px] text-loss">{errors.taxCountry}</p>}
              </div>
              <div>
                <label htmlFor="doc-tin" className="block text-[12.5px] font-medium text-content-muted mb-1.5">
                  {t('documents.tin')}
                </label>
                <input
                  id="doc-tin"
                  value={tin}
                  onChange={(e) => {
                    setTin(e.target.value);
                    setErrors((p) => ({ ...p, tin: undefined }));
                  }}
                  placeholder={t('documents.tinPlaceholder')}
                  className={inputClass(errors.tin)}
                />
                {errors.tin && <p className="mt-1 text-[11.5px] text-loss">{errors.tin}</p>}
              </div>
            </>
          )}

          <div>
            <Checkbox checked={agreed} onChange={() => { setAgreed((a) => !a); setErrors((p) => ({ ...p, agreed: undefined })); }}>
              {t(`documents.consent.${doc.kind}`)}
            </Checkbox>
            {errors.agreed && <p className="mt-1 text-[11.5px] text-loss">{errors.agreed}</p>}
          </div>

          {doc.kind === DOC_KINDS.SIGN && (
            <div>
              <label htmlFor="doc-signature" className="block text-[12.5px] font-medium text-content-muted mb-1.5">
                {t('documents.signatureLabel')}
              </label>
              <input
                id="doc-signature"
                value={signature}
                onChange={(e) => {
                  setSignature(e.target.value);
                  setErrors((p) => ({ ...p, signature: undefined }));
                }}
                placeholder={accountName}
                className={`${inputClass(errors.signature)} font-semibold`}
              />
              {errors.signature ? (
                <p className="mt-1 text-[11.5px] text-loss">{errors.signature}</p>
              ) : (
                <p className="mt-1 text-[11px] text-content-faint">{t('documents.signatureHint')}</p>
              )}
            </div>
          )}

          {doc.kind === DOC_KINDS.LEVERAGE ? (
            <div className="flex items-start gap-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 p-3 text-[12px] text-yellow-700 dark:text-yellow-300">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {t('documents.leverageNeedsBackend')}
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: busy ? 1 : 0.98 }}
              onClick={handleSubmit}
              disabled={busy}
              className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black font-semibold text-[14px] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {actionLabel}
            </motion.button>
          )}
        </div>
      )}
    </SubSheet>
  );
};

export default DocumentViewer;
