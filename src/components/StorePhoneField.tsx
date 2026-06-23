import { Check, ChevronDown, Search } from 'lucide-react';
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  type AddressCountryCode,
  detectPhoneCountryFromValue,
  formatPhone,
  getAddressCountry,
  getAddressCountryOptions,
  getCountryFlagImageUrl,
  getPhoneDialCode,
  getPhonePlaceholder,
} from '../lib/customerForm';
import { cn } from '../lib/utils';
import { getPreferredCountryCodes } from './storeCountryPreferences';

type StorefrontLocale = 'pt-BR' | 'en-US';

type StorePhoneFieldProps = {
  countryCode: AddressCountryCode;
  locale: StorefrontLocale;
  name?: string;
  placeholder?: string;
  preferredCountries?: string[];
  disableCountrySelection?: boolean;
  value: string;
  onChange: (nextValue: string, nextCountry: AddressCountryCode) => void;
};

type PhoneCountryOption = {
  code: AddressCountryCode;
  dialCode: string;
  flagUrl: string;
  label: string;
  searchIndex: string;
};

export function StorePhoneField({
  countryCode,
  locale,
  name = 'phone',
  placeholder,
  preferredCountries,
  disableCountrySelection = false,
  value,
  onChange,
}: StorePhoneFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const phoneCountries = useMemo<PhoneCountryOption[]>(
    () =>
      getAddressCountryOptions(locale)
        .filter((country) => country.code !== 'OTHER')
        .map((country) => {
          const dialCode = getPhoneDialCode(country.code);

          return {
            code: country.code,
            dialCode,
            flagUrl: getCountryFlagImageUrl(country.code),
            label: country.label,
            searchIndex: `${country.label} ${country.code} ${dialCode}`.toLowerCase(),
          };
        }),
    [locale],
  );

  const preferredCodes = useMemo(
    () =>
      (preferredCountries || getPreferredCountryCodes(locale, countryCode))
        .map((country) => getAddressCountry(country.toUpperCase()).code)
        .filter((code) => code !== 'OTHER'),
    [countryCode, locale, preferredCountries],
  );

  const orderedCountries = useMemo(() => {
    const preferredSet = new Set(preferredCodes);
    const preferredList: PhoneCountryOption[] = [];
    const regularList: PhoneCountryOption[] = [];

    phoneCountries.forEach((country) => {
      if (preferredSet.has(country.code)) {
        preferredList.push(country);
      } else {
        regularList.push(country);
      }
    });

    preferredList.sort((left, right) => preferredCodes.indexOf(left.code) - preferredCodes.indexOf(right.code));
    regularList.sort((left, right) => left.label.localeCompare(right.label, locale));

    return {
      all: [...preferredList, ...regularList],
      preferred: preferredList,
      regular: regularList,
    };
  }, [phoneCountries, preferredCodes]);

  const activeCountry = useMemo(() => {
    const resolvedCountry = getAddressCountry(countryCode).code;
    return (
      phoneCountries.find((country) => country.code === resolvedCountry)
      || orderedCountries.all[0]
      || null
    );
  }, [countryCode, orderedCountries.all, phoneCountries]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredCountries = useMemo(() => {
    if (!normalizedSearch) {
      return orderedCountries.all;
    }

    return orderedCountries.all.filter((country) => country.searchIndex.includes(normalizedSearch));
  }, [normalizedSearch, orderedCountries.all]);

  const inputPlaceholder = placeholder || getPhonePlaceholder(activeCountry?.code || countryCode);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      return;
    }

    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handlePhoneChange = (event: ChangeEvent<HTMLInputElement>) => {
    const rawValue = event.target.value;
    const fallbackCountry = activeCountry?.code || getAddressCountry(countryCode).code;
    const nextCountry = !disableCountrySelection && rawValue.trim().startsWith('+')
      ? detectPhoneCountryFromValue(rawValue, fallbackCountry)
      : fallbackCountry;
    const formattedValue = formatPhone(rawValue, nextCountry);

    onChange(formattedValue, nextCountry);
  };

  const handleCountrySelect = (nextCountry: AddressCountryCode) => {
    if (disableCountrySelection) return;
    setIsOpen(false);
    onChange(value, nextCountry);
  };

  const renderCountryOption = (country: PhoneCountryOption) => (
    <button
      key={country.code}
      type="button"
      onClick={() => handleCountrySelect(country.code)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        activeCountry?.code === country.code ? 'bg-[#faf5ee]' : 'hover:bg-neutral-50',
      )}
    >
      <span className="flex h-5 w-7 shrink-0 overflow-hidden rounded-[4px] border border-neutral-200 bg-neutral-100 shadow-sm">
        {country.flagUrl ? (
          <img
            src={country.flagUrl}
            alt={country.label}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-secondary">{country.label}</span>
        <span className="block text-xs text-neutral-500">{country.dialCode}</span>
      </span>
      {activeCountry?.code === country.code ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
    </button>
  );

  if (!activeCountry) {
    return null;
  }

  return (
    <div ref={containerRef} className="relative min-w-0 w-full max-w-full sm:max-w-[520px]">
      <div className="flex min-w-0 w-full items-center overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors focus-within:border-primary focus-within:shadow-[0_0_0_1px_var(--theme-primary)]">
        <button
          type="button"
          onClick={() => {
            if (!disableCountrySelection) {
              setIsOpen((open) => !open);
            }
          }}
          disabled={disableCountrySelection}
          className={cn(
            'flex h-[52px] shrink-0 items-center justify-between gap-2 border-r border-neutral-200 px-3 text-secondary',
            disableCountrySelection
              ? 'cursor-default bg-neutral-50'
              : 'bg-gradient-to-b from-white to-neutral-50',
          )}
          aria-expanded={disableCountrySelection ? false : isOpen}
          aria-haspopup={disableCountrySelection ? undefined : 'listbox'}
          aria-label={locale === 'pt-BR' ? 'Selecionar pais do telefone' : 'Select phone country'}
        >
          <span className="flex items-center gap-2">
            <span className="flex h-5 w-7 shrink-0 overflow-hidden rounded-[4px] border border-white/60 bg-neutral-100 shadow-sm">
              {activeCountry.flagUrl ? (
                <img
                  src={activeCountry.flagUrl}
                  alt={activeCountry.label}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </span>
            <span className="text-sm font-semibold">{activeCountry.dialCode}</span>
          </span>
          {!disableCountrySelection ? (
            <ChevronDown className={cn('h-4 w-4 text-neutral-500 transition-transform', isOpen && 'rotate-180')} />
          ) : null}
        </button>

        <input
          type="tel"
          name={name}
          value={value}
          onChange={handlePhoneChange}
          inputMode="tel"
          autoComplete="tel"
          placeholder={inputPlaceholder}
          className="h-[52px] min-w-0 w-0 flex-1 border-0 bg-transparent px-4 text-sm font-medium tracking-[0] text-secondary outline-none placeholder:text-neutral-400"
        />
      </div>

      {isOpen && !disableCountrySelection ? (
        <div className="absolute left-0 top-full z-[80] mt-2 w-full max-w-full sm:max-w-[360px] rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              ref={searchInputRef}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={locale === 'pt-BR' ? 'Buscar pais' : 'Search country'}
              className="h-10 w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-sm text-secondary outline-none transition-colors placeholder:text-neutral-400 focus:border-primary"
            />
          </div>

          <div className="max-h-64 overflow-y-auto pr-1">
            {normalizedSearch ? (
              filteredCountries.length > 0 ? (
                filteredCountries.map(renderCountryOption)
              ) : (
                <div className="px-3 py-4 text-sm text-neutral-500">
                  {locale === 'pt-BR' ? 'Nenhum pais encontrado' : 'No country found'}
                </div>
              )
            ) : (
              <>
                {orderedCountries.preferred.map(renderCountryOption)}
                {orderedCountries.preferred.length > 0 && orderedCountries.regular.length > 0 ? (
                  <div className="my-2 border-t border-neutral-100" />
                ) : null}
                {orderedCountries.regular.map(renderCountryOption)}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
