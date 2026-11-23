import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Loader2, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';
import { fetchCertificates, buyCertificate } from '@/services/profile.service';

const AVAILABLE = [
  { id: 1, name: 'BRONZE', price: 100, from: 8, to: 14 },
  { id: 2, name: 'SILVER', price: 1000, from: 8, to: 14 },
  { id: 3, name: 'GOLD', price: 5000, from: 8, to: 14 },
  { id: 4, name: 'PLATINUM', price: 10000, from: 8, to: 14 },
];

const PERIODS = [
  { labelKey: 'year', value: 1 },
  { labelKey: 'years3', value: 3 },
  { labelKey: 'years5', value: 5 },
];

const DISTRIBUTIONS = [
  { labelKey: 'monthly', value: 1 },
  { labelKey: 'quarterly', value: 2 },
  { labelKey: 'semiAnnually', value: 3 },
  { labelKey: 'annually', value: 4 },
];

const money = (n) =>
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const Certificates = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState('mine');
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [selected, setSelected] = useState(null);
  const [period, setPeriod] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [agreed, setAgreed] = useState(false);

  const load = async () => {
    setLoading(true);
    const result = await fetchCertificates();
    setMine(result.ok ? result.certificates : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const closeBuy = () => {
    setSelected(null);
    setPeriod(null);
    setDistribution(null);
    setAgreed(false);
  };

  const confirmBuy = async () => {
    if (!period || !distribution || !agreed) {
      toast({
        title: t('certificates.incompleteTitle'),
        description: t('certificates.incompleteDesc'),
        variant: 'warning',
      });
      return;
    }

    setBuying(true);
    const result = await buyCertificate({
      id: selected.id,
      duration: period,
      distributionPeriod: distribution,
    });
    setBuying(false);

    if (!result.ok) {
      toast({ title: t('certificates.buyFailedTitle'), description: result.message, variant: 'destructive' });
      return;
    }

    toast({ title: t('certificates.boughtTitle'), description: t('certificates.boughtDesc', { name: selected.name }) });
    closeBuy();
    setTab('mine');
    load();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl space-y-3"
    >
      <PageHeader title={t('accountSheet.certificates')} />

      <div className="flex items-stretch gap-5 border-b border-hairline">
        {[
          { id: 'mine', label: t('certificates.mine') },
          { id: 'buy', label: t('certificates.available') },
        ].map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`relative pb-2 text-[14px] transition-colors ${
                active ? 'text-content font-semibold' : 'text-content-faint hover:text-content-muted'
              }`}
            >
              {item.label}
              {active && (
                <motion.span
                  layoutId="certTab"
                  className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-yellow-500"
                />
              )}
            </button>
          );
        })}
      </div>

      {tab === 'mine' && (
        loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-content-faint" />
          </div>
        ) : mine.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-center text-content-faint border-2 border-dashed border-hairline rounded-lg">
            <Award className="w-16 h-16 opacity-20 mb-3" />
            <h2 className="text-[16px] font-semibold text-content">{t('certificates.emptyTitle')}</h2>
            <p className="max-w-md text-[13px] mt-1">{t('certificates.emptyDesc')}</p>
            <button
              onClick={() => setTab('buy')}
              className="mt-4 h-10 px-4 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-black text-[13px] font-semibold"
            >
              {t('certificates.browse')}
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {mine.map((cert, i) => (
              <div key={cert.id || i} className="rounded-xl border border-hairline bg-surface-raised p-4">
                <p className="text-[11px] uppercase tracking-wider text-content-faint">{t('certificates.owned')}</p>
                <p className="text-[18px] font-bold text-content mt-1">{cert.name || cert.title || `#${cert.id}`}</p>
                {cert.duration != null && (
                  <p className="text-[12.5px] text-content-muted mt-1">
                    {t('certificates.durationLine', { years: cert.duration })}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {tab === 'buy' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {AVAILABLE.map((cert) => (
            <button
              key={cert.id}
              onClick={() => setSelected(cert)}
              className="text-left rounded-xl border border-hairline bg-surface-raised p-4 hover:border-yellow-500/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[18px] font-bold text-content">{cert.name}</p>
                  <p className="text-[12.5px] text-content-muted mt-1">
                    {t('certificates.returnRange', { from: cert.from, to: cert.to })}
                  </p>
                </div>
                <span className="text-[16px] font-semibold font-tabular text-yellow-500">{money(cert.price)}</span>
              </div>
              <span className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-content-muted">
                <ShoppingCart className="w-3.5 h-3.5" />
                {t('certificates.buy')}
              </span>
            </button>
          ))}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && closeBuy()}>
        <DialogContent className="max-w-md bg-surface border-hairline">
          <DialogTitle className="text-[18px] font-bold text-content">
            {selected ? t('certificates.buyTitle', { name: selected.name }) : ''}
          </DialogTitle>

          <div className="space-y-3 mt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-faint">
              {t('certificates.period')}
            </p>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setPeriod(item.value)}
                  className={`h-9 px-3 rounded-lg text-[12.5px] font-semibold border transition-colors ${
                    period === item.value
                      ? 'bg-yellow-500 border-yellow-500 text-black'
                      : 'border-hairline text-content-muted hover:text-content'
                  }`}
                >
                  {t(`certificates.periods.${item.labelKey}`)}
                </button>
              ))}
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-wider text-content-faint pt-1">
              {t('certificates.distribution')}
            </p>
            <div className="flex flex-wrap gap-2">
              {DISTRIBUTIONS.map((item) => (
                <button
                  key={item.value}
                  onClick={() => setDistribution(item.value)}
                  className={`h-9 px-3 rounded-lg text-[12.5px] font-semibold border transition-colors ${
                    distribution === item.value
                      ? 'bg-yellow-500 border-yellow-500 text-black'
                      : 'border-hairline text-content-muted hover:text-content'
                  }`}
                >
                  {t(`certificates.distributions.${item.labelKey}`)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAgreed((v) => !v)}
              className="flex items-start gap-2.5 text-left w-full pt-1"
            >
              <span
                className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded flex items-center justify-center border ${
                  agreed ? 'bg-yellow-500 border-yellow-500' : 'border-hairline'
                }`}
              >
                {agreed && (
                  <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-black" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M2 6.5L4.5 9L10 3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="text-[12.5px] text-content-muted">{t('certificates.agreeTerms')}</span>
            </button>

            <button
              onClick={confirmBuy}
              disabled={buying}
              className="w-full h-11 rounded-xl bg-yellow-500 hover:bg-yellow-600 disabled:opacity-70 text-black font-semibold text-[14px] flex items-center justify-center gap-2"
            >
              {buying && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('certificates.confirmBuy')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Certificates;
