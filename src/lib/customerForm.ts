import { AsYouType, getCountryCallingCode, type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js/min';

export type AddressCountryCode =
  | 'AR'
  | 'AU'
  | 'BE'
  | 'BO'
  | 'BR'
  | 'CA'
  | 'CL'
  | 'CN'
  | 'CO'
  | 'DE'
  | 'ES'
  | 'FR'
  | 'GB'
  | 'IE'
  | 'IN'
  | 'IT'
  | 'JP'
  | 'KR'
  | 'MX'
  | 'NL'
  | 'NZ'
  | 'OTHER'
  | 'PE'
  | 'PT'
  | 'PY'
  | 'UY'
  | 'US'
  | 'ZA';

type StorefrontLanguage = 'pt-BR' | 'en-US';

type CountryLabel = Record<StorefrontLanguage, string>;

type AddressCountry = {
  code: AddressCountryCode;
  label: CountryLabel;
  lookupProvider: 'manual' | 'viacep' | 'zippopotam';
  minLookupLength: number;
  postalCodeLabel: CountryLabel;
  postalPlaceholder: string;
  regionLabel: CountryLabel;
};

export type PostalLookupResult = {
  city: string;
  neighborhood: string;
  postalCode: string;
  region: string;
  street: string;
};

export type TaxIdFieldKind = 'none' | 'cpf' | 'cnpj' | 'ein' | 'generic';

type TaxIdFieldConfig = {
  adminLabel: string;
  format: (value: string) => string;
  helpText?: string;
  inputMode: 'numeric' | 'text';
  kind: TaxIdFieldKind;
  label: string;
  maxWidthClass: string;
  placeholder: string;
  required: boolean;
  visible: boolean;
};

const ADDRESS_COUNTRIES: AddressCountry[] = [
  {
    code: 'BR',
    label: { 'pt-BR': 'Brasil', 'en-US': 'Brazil' },
    lookupProvider: 'viacep',
    minLookupLength: 8,
    postalCodeLabel: { 'pt-BR': 'CEP', 'en-US': 'ZIP Code' },
    postalPlaceholder: '00000-000',
    regionLabel: { 'pt-BR': 'Estado', 'en-US': 'State' },
  },
  {
    code: 'US',
    label: { 'pt-BR': 'Estados Unidos', 'en-US': 'United States' },
    lookupProvider: 'zippopotam',
    minLookupLength: 5,
    postalCodeLabel: { 'pt-BR': 'ZIP code', 'en-US': 'ZIP Code' },
    postalPlaceholder: '12345',
    regionLabel: { 'pt-BR': 'Estado', 'en-US': 'State' },
  },
  {
    code: 'CA',
    label: { 'pt-BR': 'Canada', 'en-US': 'Canada' },
    lookupProvider: 'zippopotam',
    minLookupLength: 6,
    postalCodeLabel: { 'pt-BR': 'Postal code', 'en-US': 'Postal Code' },
    postalPlaceholder: 'A1A 1A1',
    regionLabel: { 'pt-BR': 'Provincia', 'en-US': 'Province' },
  },
  {
    code: 'MX',
    label: { 'pt-BR': 'Mexico', 'en-US': 'Mexico' },
    lookupProvider: 'zippopotam',
    minLookupLength: 5,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '01000',
    regionLabel: { 'pt-BR': 'Estado', 'en-US': 'State' },
  },
  {
    code: 'AR',
    label: { 'pt-BR': 'Argentina', 'en-US': 'Argentina' },
    lookupProvider: 'zippopotam',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '1000',
    regionLabel: { 'pt-BR': 'Provincia', 'en-US': 'Province' },
  },
  {
    code: 'CL',
    label: { 'pt-BR': 'Chile', 'en-US': 'Chile' },
    lookupProvider: 'zippopotam',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '8320000',
    regionLabel: { 'pt-BR': 'Regiao', 'en-US': 'Region' },
  },
  {
    code: 'CO',
    label: { 'pt-BR': 'Colombia', 'en-US': 'Colombia' },
    lookupProvider: 'zippopotam',
    minLookupLength: 6,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '110111',
    regionLabel: { 'pt-BR': 'Departamento', 'en-US': 'Department' },
  },
  {
    code: 'PE',
    label: { 'pt-BR': 'Peru', 'en-US': 'Peru' },
    lookupProvider: 'zippopotam',
    minLookupLength: 5,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '15001',
    regionLabel: { 'pt-BR': 'Regiao', 'en-US': 'Region' },
  },
  {
    code: 'UY',
    label: { 'pt-BR': 'Uruguai', 'en-US': 'Uruguay' },
    lookupProvider: 'zippopotam',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '11000',
    regionLabel: { 'pt-BR': 'Departamento', 'en-US': 'Department' },
  },
  {
    code: 'PY',
    label: { 'pt-BR': 'Paraguai', 'en-US': 'Paraguay' },
    lookupProvider: 'manual',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '1209',
    regionLabel: { 'pt-BR': 'Departamento', 'en-US': 'Department' },
  },
  {
    code: 'BO',
    label: { 'pt-BR': 'Bolivia', 'en-US': 'Bolivia' },
    lookupProvider: 'manual',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '0000',
    regionLabel: { 'pt-BR': 'Departamento', 'en-US': 'Department' },
  },
  {
    code: 'PT',
    label: { 'pt-BR': 'Portugal', 'en-US': 'Portugal' },
    lookupProvider: 'zippopotam',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '1000-001',
    regionLabel: { 'pt-BR': 'Distrito', 'en-US': 'District' },
  },
  {
    code: 'ES',
    label: { 'pt-BR': 'Espanha', 'en-US': 'Spain' },
    lookupProvider: 'zippopotam',
    minLookupLength: 5,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '28001',
    regionLabel: { 'pt-BR': 'Provincia', 'en-US': 'Province' },
  },
  {
    code: 'FR',
    label: { 'pt-BR': 'Franca', 'en-US': 'France' },
    lookupProvider: 'zippopotam',
    minLookupLength: 5,
    postalCodeLabel: { 'pt-BR': 'Code postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '75001',
    regionLabel: { 'pt-BR': 'Regiao', 'en-US': 'Region' },
  },
  {
    code: 'DE',
    label: { 'pt-BR': 'Alemanha', 'en-US': 'Germany' },
    lookupProvider: 'zippopotam',
    minLookupLength: 5,
    postalCodeLabel: { 'pt-BR': 'Postleitzahl', 'en-US': 'Postal Code' },
    postalPlaceholder: '10115',
    regionLabel: { 'pt-BR': 'Estado', 'en-US': 'State' },
  },
  {
    code: 'IT',
    label: { 'pt-BR': 'Italia', 'en-US': 'Italy' },
    lookupProvider: 'zippopotam',
    minLookupLength: 5,
    postalCodeLabel: { 'pt-BR': 'CAP', 'en-US': 'Postal Code' },
    postalPlaceholder: '00118',
    regionLabel: { 'pt-BR': 'Provincia', 'en-US': 'Province' },
  },
  {
    code: 'NL',
    label: { 'pt-BR': 'Paises Baixos', 'en-US': 'Netherlands' },
    lookupProvider: 'zippopotam',
    minLookupLength: 6,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '1012 JS',
    regionLabel: { 'pt-BR': 'Provincia', 'en-US': 'Province' },
  },
  {
    code: 'BE',
    label: { 'pt-BR': 'Belgica', 'en-US': 'Belgium' },
    lookupProvider: 'zippopotam',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '1000',
    regionLabel: { 'pt-BR': 'Regiao', 'en-US': 'Region' },
  },
  {
    code: 'IE',
    label: { 'pt-BR': 'Irlanda', 'en-US': 'Ireland' },
    lookupProvider: 'manual',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Eircode', 'en-US': 'Eircode' },
    postalPlaceholder: 'D02 X285',
    regionLabel: { 'pt-BR': 'Condado', 'en-US': 'County' },
  },
  {
    code: 'GB',
    label: { 'pt-BR': 'Reino Unido', 'en-US': 'United Kingdom' },
    lookupProvider: 'zippopotam',
    minLookupLength: 5,
    postalCodeLabel: { 'pt-BR': 'Postcode', 'en-US': 'Postcode' },
    postalPlaceholder: 'SW1A 1AA',
    regionLabel: { 'pt-BR': 'County / Region', 'en-US': 'County / Region' },
  },
  {
    code: 'AU',
    label: { 'pt-BR': 'Australia', 'en-US': 'Australia' },
    lookupProvider: 'zippopotam',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Postcode', 'en-US': 'Postcode' },
    postalPlaceholder: '2000',
    regionLabel: { 'pt-BR': 'State / Territory', 'en-US': 'State / Territory' },
  },
  {
    code: 'NZ',
    label: { 'pt-BR': 'Nova Zelandia', 'en-US': 'New Zealand' },
    lookupProvider: 'zippopotam',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Postcode', 'en-US': 'Postcode' },
    postalPlaceholder: '6011',
    regionLabel: { 'pt-BR': 'Region', 'en-US': 'Region' },
  },
  {
    code: 'JP',
    label: { 'pt-BR': 'Japao', 'en-US': 'Japan' },
    lookupProvider: 'zippopotam',
    minLookupLength: 7,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '100-0001',
    regionLabel: { 'pt-BR': 'Prefeitura', 'en-US': 'Prefecture' },
  },
  {
    code: 'KR',
    label: { 'pt-BR': 'Coreia do Sul', 'en-US': 'South Korea' },
    lookupProvider: 'manual',
    minLookupLength: 5,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '04524',
    regionLabel: { 'pt-BR': 'Province / City', 'en-US': 'Province / City' },
  },
  {
    code: 'CN',
    label: { 'pt-BR': 'China', 'en-US': 'China' },
    lookupProvider: 'manual',
    minLookupLength: 6,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: '100000',
    regionLabel: { 'pt-BR': 'Province', 'en-US': 'Province' },
  },
  {
    code: 'IN',
    label: { 'pt-BR': 'India', 'en-US': 'India' },
    lookupProvider: 'manual',
    minLookupLength: 6,
    postalCodeLabel: { 'pt-BR': 'PIN code', 'en-US': 'PIN Code' },
    postalPlaceholder: '110001',
    regionLabel: { 'pt-BR': 'State', 'en-US': 'State' },
  },
  {
    code: 'ZA',
    label: { 'pt-BR': 'Africa do Sul', 'en-US': 'South Africa' },
    lookupProvider: 'manual',
    minLookupLength: 4,
    postalCodeLabel: { 'pt-BR': 'Postal code', 'en-US': 'Postal Code' },
    postalPlaceholder: '2000',
    regionLabel: { 'pt-BR': 'Province', 'en-US': 'Province' },
  },
  {
    code: 'OTHER',
    label: { 'pt-BR': 'Outro pais', 'en-US': 'Other country' },
    lookupProvider: 'manual',
    minLookupLength: 3,
    postalCodeLabel: { 'pt-BR': 'Codigo postal', 'en-US': 'Postal Code' },
    postalPlaceholder: 'Postal code',
    regionLabel: { 'pt-BR': 'Estado / Provincia / Regiao', 'en-US': 'State / Province / Region' },
  },
];

export function onlyDigits(value: string) {
  return value.replace(/\D/g, '');
}

export function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function formatCnpj(value: string) {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function formatBirthDate(value: string, locale: StorefrontLanguage = 'pt-BR') {
  const isoDateMatch = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return locale === 'en-US' ? `${month}/${day}/${year}` : `${day}/${month}/${year}`;
  }

  const digits = onlyDigits(value).slice(0, 8);
  return digits
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

export function getBirthDatePlaceholder(locale: StorefrontLanguage) {
  return locale === 'en-US' ? 'MM/DD/YYYY' : 'DD/MM/AAAA';
}

export function isBirthDateComplete(value: string) {
  return onlyDigits(value).length === 8;
}

export function isBirthDateValid(value: string, locale: StorefrontLanguage = 'pt-BR') {
  const formattedValue = formatBirthDate(value, locale);

  if (!isBirthDateComplete(formattedValue)) {
    return false;
  }

  const parts = formattedValue.split('/');
  if (parts.length !== 3) {
    return false;
  }

  const [first, second, yearPart] = parts;
  const month = Number(locale === 'en-US' ? first : second);
  const day = Number(locale === 'en-US' ? second : first);
  const year = Number(yearPart);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return false;
  }

  if (year < 1900) {
    return false;
  }

  const today = new Date();
  const currentYear = today.getFullYear();

  if (year > currentYear || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const candidate = new Date(year, month - 1, day);

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return false;
  }

  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return candidate <= normalizedToday;
}

export function formatEin(value: string) {
  const digits = onlyDigits(value).slice(0, 9);

  if (digits.length <= 2) {
    return digits;
  }

  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function formatGenericTaxId(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9 ./-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 24)
    .trimStart();
}

export function getAdminTaxIdLabel(countryCode?: string, registrationType: 'F' | 'J' = 'F') {
  const country = getAddressCountry(countryCode).code;

  if (registrationType === 'J') {
    if (country === 'BR') return 'CNPJ';
    if (country === 'US') return 'EIN';
    return 'Documento fiscal';
  }

  return country === 'BR' ? 'CPF' : 'Documento fiscal';
}

export function getTaxIdFieldConfig(
  countryCode: string,
  registrationType: 'F' | 'J',
  locale: StorefrontLanguage,
): TaxIdFieldConfig {
  const country = getAddressCountry(countryCode).code;
  const isPortuguese = locale === 'pt-BR';

  if (registrationType === 'F') {
    if (country === 'BR') {
      return {
        adminLabel: 'CPF',
        format: formatCpf,
        inputMode: 'numeric',
        kind: 'cpf',
        label: 'CPF',
        maxWidthClass: 'max-w-[160px]',
        placeholder: '000.000.000-00',
        required: true,
        visible: true,
      };
    }

    if (country === 'US') {
      return {
        adminLabel: isPortuguese ? 'Documento fiscal' : 'Tax ID',
        format: (value) => value,
        helpText: isPortuguese
          ? 'Nao exigimos documento fiscal para pessoa fisica neste pais.'
          : 'No tax ID is required for individual customers in this country.',
        inputMode: 'text',
        kind: 'none',
        label: isPortuguese ? 'Documento fiscal' : 'Tax ID',
        maxWidthClass: 'max-w-[240px]',
        placeholder: '',
        required: false,
        visible: false,
      };
    }

    return {
      adminLabel: isPortuguese ? 'Documento fiscal' : 'Tax ID',
      format: formatGenericTaxId,
      inputMode: 'text',
      kind: 'generic',
      label: isPortuguese ? 'Documento fiscal' : 'Tax ID',
      maxWidthClass: 'max-w-[240px]',
      placeholder: 'Tax ID / VAT / National ID',
      required: false,
      visible: true,
    };
  }

  if (country === 'BR') {
    return {
      adminLabel: 'CNPJ',
      format: formatCnpj,
      inputMode: 'numeric',
      kind: 'cnpj',
      label: 'CNPJ',
      maxWidthClass: 'max-w-[190px]',
      placeholder: '00.000.000/0000-00',
      required: true,
      visible: true,
    };
  }

  if (country === 'US') {
    return {
      adminLabel: 'EIN',
      format: formatEin,
      inputMode: 'numeric',
      kind: 'ein',
      label: 'EIN',
      maxWidthClass: 'max-w-[180px]',
      placeholder: '12-3456789',
      required: true,
      visible: true,
    };
  }

  return {
    adminLabel: isPortuguese ? 'Documento fiscal' : 'Tax ID',
    format: formatGenericTaxId,
    inputMode: 'text',
    kind: 'generic',
    label: isPortuguese ? 'Documento fiscal da empresa' : 'Business Tax ID',
    maxWidthClass: 'max-w-[240px]',
    placeholder: 'VAT / Tax ID / Registration',
    required: false,
    visible: true,
  };
}

function getPhoneCountryCode(countryCode?: string): CountryCode | undefined {
  const country = getAddressCountry(countryCode);
  return country.code === 'OTHER' ? undefined : (country.code as CountryCode);
}

export function getCountryFlagImageUrl(countryCode?: string) {
  const code = getAddressCountry(countryCode).code;

  if (code === 'OTHER') {
    return '';
  }

  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
}

export function getPhoneDialCode(countryCode?: string) {
  const code = getPhoneCountryCode(countryCode);

  if (!code) {
    return '+';
  }

  return `+${getCountryCallingCode(code)}`;
}

function normalizePhoneInput(value: string) {
  const trimmedValue = value.trim();
  const digits = onlyDigits(trimmedValue).slice(0, 15);

  if (!digits) {
    return trimmedValue.startsWith('+') ? '+' : '';
  }

  return trimmedValue.startsWith('+') ? `+${digits}` : digits;
}

export function formatPhone(value: string, countryCode: string = 'BR') {
  const normalizedValue = normalizePhoneInput(value);

  if (!normalizedValue) {
    return '';
  }

  return new AsYouType(getPhoneCountryCode(countryCode)).input(normalizedValue);
}

export function getPhonePlaceholder(countryCode: string) {
  switch (getAddressCountry(countryCode).code) {
    case 'BR':
      return '(11) 91234-5678';
    case 'US':
    case 'CA':
      return '(555) 123-4567';
    case 'GB':
      return '07400 123456';
    case 'AU':
      return '0412 345 678';
    case 'PT':
      return '912 345 678';
    case 'JP':
      return '090-1234-5678';
    default:
      return '+1 555 123 4567';
  }
}

export function getPhoneE164(value: string, countryCode: string = 'BR') {
  const normalizedValue = normalizePhoneInput(value);

  if (!normalizedValue) {
    return '';
  }

  const phoneNumber = parsePhoneNumberFromString(normalizedValue, getPhoneCountryCode(countryCode));
  return phoneNumber?.number ?? normalizedValue;
}

export function detectPhoneCountryFromValue(value: string, fallbackCountryCode: AddressCountryCode = 'BR') {
  const normalizedValue = normalizePhoneInput(value);

  if (!normalizedValue.startsWith('+')) {
    return getAddressCountry(fallbackCountryCode).code;
  }

  const phoneNumber = parsePhoneNumberFromString(normalizedValue);
  const detectedCountry = phoneNumber?.country;

  if (!detectedCountry) {
    return getAddressCountry(fallbackCountryCode).code;
  }

  const supportedCountry = ADDRESS_COUNTRIES.find((country) => country.code === detectedCountry);
  return supportedCountry?.code ?? getAddressCountry(fallbackCountryCode).code;
}

export function getPhoneDisplay(value: string, countryCode: string = 'BR') {
  const normalizedValue = normalizePhoneInput(value);

  if (!normalizedValue) {
    return '';
  }

  return formatPhone(normalizedValue, countryCode);
}

export function getWhatsAppDigits(value: string, countryCode: string = 'BR') {
  const e164 = getPhoneE164(value, countryCode);
  return onlyDigits(e164);
}

export function getWhatsAppUrl(value: string, countryCode: string = 'BR', message?: string) {
  const digits = getWhatsAppDigits(value, countryCode);
  if (!digits) return '#';

  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${digits}${text}`;
}

export function getAddressCountry(code?: string) {
  return ADDRESS_COUNTRIES.find((country) => country.code === code) || ADDRESS_COUNTRIES[0];
}

export function getAddressCountryOptions(locale: StorefrontLanguage) {
  return ADDRESS_COUNTRIES.map((country) => ({
    code: country.code,
    label: country.label[locale],
  }));
}

export function getAddressLabels(countryCode: string, locale: StorefrontLanguage) {
  const country = getAddressCountry(countryCode);

  return {
    countryLabel: locale === 'pt-BR' ? 'Pais' : 'Country',
    postalCodeLabel: country.postalCodeLabel[locale],
    postalPlaceholder: country.postalPlaceholder,
    regionLabel: country.regionLabel[locale],
  };
}

export function formatPostalCode(value: string, countryCode: string) {
  const country = getAddressCountry(countryCode);

  if (country.code === 'BR') {
    const digits = onlyDigits(value).slice(0, 8);
    return digits.replace(/^(\d{5})(\d)/, '$1-$2');
  }

  if (country.code === 'US') {
    const digits = onlyDigits(value).slice(0, 9);
    if (digits.length <= 5) return digits;
    return digits.replace(/^(\d{5})(\d+)/, '$1-$2');
  }

  if (country.code === 'CA') {
    const lettersAndNumbers = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    if (lettersAndNumbers.length <= 3) return lettersAndNumbers;
    return `${lettersAndNumbers.slice(0, 3)} ${lettersAndNumbers.slice(3)}`;
  }

  if (country.code === 'GB') {
    return value.toUpperCase().replace(/\s+/g, ' ').slice(0, 8);
  }

  return value.toUpperCase().replace(/\s+/g, ' ').slice(0, 12);
}

export function isAddressLookupComplete(countryCode: string, postalCode: string) {
  const country = getAddressCountry(countryCode);
  const digits = onlyDigits(postalCode);
  const compact = postalCode.toUpperCase().replace(/[^A-Z0-9]/g, '');

  switch (country.code) {
    case 'BR':
      return digits.length === 8;
    case 'US':
      return digits.length >= 5;
    case 'CA':
      return compact.length === 6;
    case 'GB':
      return compact.length >= 5;
    case 'JP':
      return digits.length === 7;
    case 'MX':
    case 'FR':
    case 'DE':
    case 'ES':
    case 'IT':
      return digits.length === 5;
    case 'AU':
    case 'NZ':
    case 'PT':
    case 'AR':
    case 'UY':
    case 'BE':
      return digits.length >= 4;
    case 'CO':
      return digits.length === 6;
    default:
      return compact.length >= country.minLookupLength;
  }
}

export function isManualAddressCountry(countryCode: string) {
  return getAddressCountry(countryCode).lookupProvider === 'manual';
}

export function supportsExternalPostalLookup(countryCode: string) {
  return getAddressCountry(countryCode).lookupProvider !== 'manual';
}

function normalizePostalCodeForLookup(countryCode: string, postalCode: string) {
  const country = getAddressCountry(countryCode);
  const digits = onlyDigits(postalCode);
  const compact = postalCode.toUpperCase().replace(/\s+/g, '');

  if (country.code === 'BR') {
    return digits.slice(0, 8);
  }

  if (country.code === 'US') {
    return digits.slice(0, 5);
  }

  if (country.code === 'CA') {
    return compact.replace(/[^A-Z0-9]/g, '').slice(0, 6);
  }

  return compact;
}

async function lookupBrazilianZipcode(postalCode: string): Promise<PostalLookupResult | null> {
  const digits = normalizePostalCodeForLookup('BR', postalCode);

  if (digits.length !== 8) {
    return null;
  }

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  const data = await response.json();

  if (data.erro) {
    return null;
  }

  return {
    street: data.logradouro || '',
    neighborhood: data.bairro || '',
    city: data.localidade || '',
    region: data.uf || '',
    postalCode: data.cep || formatPostalCode(digits, 'BR'),
  };
}

async function lookupInternationalPostalCode(countryCode: string, postalCode: string): Promise<PostalLookupResult | null> {
  const normalizedPostalCode = normalizePostalCodeForLookup(countryCode, postalCode);

  if (!normalizedPostalCode) {
    return null;
  }

  const response = await fetch(`https://api.zippopotam.us/${countryCode.toLowerCase()}/${encodeURIComponent(normalizedPostalCode)}`);

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const firstPlace = Array.isArray(data.places) ? data.places[0] : null;

  if (!firstPlace) {
    return null;
  }

  return {
    street: '',
    neighborhood: '',
    city: firstPlace['place name'] || '',
    region: firstPlace['state abbreviation'] || firstPlace.state || firstPlace.province || '',
    postalCode: data['post code'] || formatPostalCode(normalizedPostalCode, countryCode),
  };
}

export async function lookupAddressByCountry(countryCode: string, postalCode: string): Promise<PostalLookupResult | null> {
  const country = getAddressCountry(countryCode);

  if (country.lookupProvider === 'manual') {
    return null;
  }

  if (country.lookupProvider === 'viacep') {
    return lookupBrazilianZipcode(postalCode);
  }

  return lookupInternationalPostalCode(country.code, postalCode);
}

