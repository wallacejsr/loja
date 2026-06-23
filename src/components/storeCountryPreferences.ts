import { type AddressCountryCode, getAddressCountry } from '../lib/customerForm';

type StorefrontLocale = 'pt-BR' | 'en-US';

const LOCALE_PRIORITY_COUNTRIES: Record<StorefrontLocale, AddressCountryCode[]> = {
  'pt-BR': ['BR', 'US', 'PT', 'AR', 'GB', 'CA'],
  'en-US': ['US', 'GB', 'CA', 'AU', 'BR', 'PT'],
};

export function getPreferredCountryCodes(
  locale: StorefrontLocale,
  selectedCountry?: AddressCountryCode,
) {
  const resolvedSelectedCountry = selectedCountry ? getAddressCountry(selectedCountry).code : undefined;
  const priorityCountries = LOCALE_PRIORITY_COUNTRIES[locale] || LOCALE_PRIORITY_COUNTRIES['en-US'];

  return [resolvedSelectedCountry, ...priorityCountries].filter(
    (countryCode, index, array): countryCode is AddressCountryCode =>
      Boolean(countryCode) && array.indexOf(countryCode) === index,
  );
}

