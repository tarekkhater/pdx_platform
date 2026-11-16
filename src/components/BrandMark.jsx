import React from 'react';
import { BRAND } from '@/config/brand';

/** The Bein Markets mark. Used wherever the old TrendingUp arrow stood in for a logo. */
const BrandMark = ({ className = 'w-7 h-7', alt = BRAND.name }) => (
  <img src={BRAND.mark} alt={alt} className={`flex-shrink-0 object-contain ${className}`} />
);

export default BrandMark;
