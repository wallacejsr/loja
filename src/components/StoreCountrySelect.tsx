import { Check, ChevronDown, Globe, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  type AddressCountryCode,
  getAddressCountry,
  getAddressCountryOptions,
  getCountryFlagImageUrl,
} from '../lib/customerForm';
import { cn } from '../lib/utils';
import { getPreferredCountryCodes } from './storeCountryPreferences';

type StorefrontLocale = 'pt-BR' | 'en-US';

type StoreCountrySelectProps = {
  value: AddressCountryCode;
  locale: StorefrontLocale;
  onChange: (nextCountry: AddressCountryCode) => void;
  preferredCountries?: string[];
  className?: string;
  ariaLabel?: string;
  disabled?: boolean;
};

type CountryOption = {
  code: AddressCountryCode;
  label: string;
  flagUrl: string;
  searchIndex: string;
};

export function StoreCountrySelect({
  value,
  locale,
  onChange,
  preferredCountries,
  className,
  ariaLabel,
  disabled = false,
}: StoreCountrySelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const countries = useMemo<CountryOption[]>(
    () =>
      getAddressCountryOptions(locale).map((country) => ({
        code: country.code,
        label: country.label,
        flagUrl: getCountryFlagImageUrl(country.code),
        searchIndex: `${country.label} ${country.code}`.toLowerCase(),
      })),
    [locale],
  );

  const preferredCodes = useMemo(
    () =>
      (preferredCountries || getPreferredCountryCodes(locale, value))
        .map((country) => getAddressCountry(country.toUpperCase()).code)
        .filter((code, index, array) => array.indexOf(code) === index),
    [locale, preferredCountries, value],
  );

  const orderedCountries = useMemo(() => {
    const preferredSet = new Set(preferredCodes);
    const preferredList: CountryOption[] = [];
    const regularList: CountryOption[] = [];

    countries.forEach((country) => {
      if (preferredSet.has(country.code)) {
        preferredList.push(country);
      } else {
        regularList.push(country);
      }
    });

    preferredList.sort((left, right) => preferredCodes.indexOf(left.code) - preferredCodes.indexOf(right.code));
    regularList.sort((left, right) => {
      if (left.code === 'OTHER') return 1;
      if (right.code === 'OTHER') return -1;

      return left.label.localeCompare(right.label, locale);
    });

    return {
      all: [...preferredList, ...regularList],
      preferred: preferredList,
      regular: regularList,
    };
  }, [countries, preferredCodes]);

  const activeCountry = useMemo(
    () => countries.find((country) => country.code === getAddressCountry(value).code) || countries[0] || null,
    [countries, value],
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredCountries = useMemo(() => {
    if (!normalizedSearch) {
      return orderedCountries.all;
    }

    return orderedCountries.all.filter((country) => country.searchIndex.includes(normalizedSearch));
  }, [normalizedSearch, orderedCountries.all]);

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

  const renderFlag = (country: CountryOption) => {
    if (country.flagUrl) {
      return (
        <img
          src={country.flagUrl}
          alt={country.label}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      );
    }

    return <Globe className="h-4 w-4 text-neutral-500" />;
  };

  const renderCountryOption = (country: CountryOption) => (
    <button
      key={country.code}
      type="button"
      onClick={() => {
        setIsOpen(false);
        onChange(country.code);
      }}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        activeCountry?.code === country.code ? 'bg-[#faf5ee]' : 'hover:bg-neutral-50',
      )}
    >
      <span className="flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-neutral-200 bg-neutral-100 shadow-sm">
        {renderFlag(country)}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-secondary">{country.label}</span>
      {activeCountry?.code === country.code ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
    </button>
  );

  if (!activeCountry) {
    return null;
  }

  return (
    <div ref={containerRef} className={cn('relative min-w-0 w-full', className)}>
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen((open) => !open);
          }
        }}
        disabled={disabled}
        className={cn(
          'flex min-h-[44px] w-full items-center justify-between gap-3 rounded-sm border border-neutral-300 px-3 py-2 text-left text-sm text-secondary transition-colors focus:outline-none',
          disabled ? 'cursor-default bg-neutral-50' : 'bg-white focus:border-primary',
        )}
        aria-expanded={disabled ? false : isOpen}
        aria-haspopup={disabled ? undefined : 'listbox'}
        aria-label={ariaLabel || (locale === 'pt-BR' ? 'Selecionar pais' : 'Select country')}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-5 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[4px] border border-neutral-200 bg-neutral-100 shadow-sm">
            {renderFlag(activeCountry)}
          </span>
          <span className="truncate">{activeCountry.label}</span>
        </span>
        {!disabled ? (
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-neutral-500 transition-transform', isOpen && 'rotate-180')} />
        ) : null}
      </button>

      {isOpen && !disabled ? (
        <div className="absolute left-0 top-full z-[80] mt-2 w-full rounded-xl border border-neutral-200 bg-white p-2 shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
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

          <div className="max-h-72 overflow-y-auto pr-1">
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
