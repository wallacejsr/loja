import { useCallback, useMemo } from 'react';
import { getCurrencyLocale } from '../lib/currency';
import { useSettings } from './useSettings';

export function useAdminCurrency() {
  const { settings } = useSettings();

  const currencyLocale = useMemo(
    () => getCurrencyLocale(settings.storeCurrency, settings.siteLanguage),
    [settings.siteLanguage, settings.storeCurrency],
  );

  const formatter = useMemo(
    () =>
      new Intl.NumberFormat(currencyLocale, {
        style: 'currency',
        currency: settings.storeCurrency,
      }),
    [currencyLocale, settings.storeCurrency],
  );

  const formatCurrency = useCallback((value: number) => formatter.format(value), [formatter]);

  return {
    formatCurrency,
    currencyCode: settings.storeCurrency,
    currencyLocale,
  };
}
