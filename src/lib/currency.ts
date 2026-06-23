import type { StoreCurrencyCode } from '../types/settings';
import type { StorefrontLanguage } from '../hooks/useStorefront';

export function getCurrencyLocale(
  currency: StoreCurrencyCode,
  storefrontLanguage: StorefrontLanguage = 'en-US',
) {
  switch (currency) {
    case 'BRL':
      return 'pt-BR';
    case 'USD':
      return 'en-US';
    case 'CAD':
      return 'en-CA';
    case 'AUD':
      return 'en-AU';
    case 'GBP':
      return 'en-GB';
    case 'EUR':
      return storefrontLanguage === 'pt-BR' ? 'pt-PT' : 'en-IE';
    default:
      return storefrontLanguage;
  }
}

export function formatCurrencyValue(
  value: number,
  currency: StoreCurrencyCode,
  storefrontLanguage: StorefrontLanguage = 'en-US',
) {
  return new Intl.NumberFormat(getCurrencyLocale(currency, storefrontLanguage), {
    style: 'currency',
    currency,
  }).format(value);
}
