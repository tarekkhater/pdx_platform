import React from 'react';
import { motion } from 'framer-motion';
import AssetList from '@/components/AssetList';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { useTrading } from '@/context/TradingContext';

const Assets = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setSelectedAsset } = useTrading();

  const handleAssetSelection = (symbol) => {
    setSelectedAsset(symbol);
    navigate('/');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col h-[calc(100vh-8rem)]"
    >
      <PageHeader title={t('assets.title')} />
      <div className="flex-1 min-h-0">
        <AssetList setSelectedAsset={handleAssetSelection} isFullScreen={true} />
      </div>
    </motion.div>
  );
};

export default Assets;
