import React, { useEffect, useMemo, useRef, useState } from 'react';
import { User, Users, List, MapPin, Mail, Lock, HelpCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StoreCountrySelect } from '../components/StoreCountrySelect';
import { StorePhoneField } from '../components/StorePhoneField';
import { useCustomerSession } from '../context/CustomerSessionContext';
import { useSettings } from '../hooks/useSettings';
import { useStorefront } from '../hooks/useStorefront';
import {
  AddressCountryCode,
  formatBirthDate,
  formatPostalCode,
  getAddressLabels,
  getBirthDatePlaceholder,
  getPhonePlaceholder,
  getTaxIdFieldConfig,
  isBirthDateComplete,
  isBirthDateValid,
  isAddressLookupComplete,
  isManualAddressCountry,
  lookupAddressByCountry,
  toBirthDateIso,
  type TaxIdFieldKind,
} from '../lib/customerForm';

type RegistrationType = 'F' | 'J';
type PostalStatusTone = 'error' | 'idle' | 'loading' | 'manual' | 'success' | 'warning';

type RegisterFormData = {
  birthDate: string;
  cellPhone: string;
  city: string;
  cnpj: string;
  complement: string;
  confirmEmail: string;
  confirmPassword: string;
  corporateName: string;
  country: AddressCountryCode;
  cpf: string;
  email: string;
  fullName: string;
  gender: string;
  landline: string;
  number: string;
  password: string;
  neighborhood: string;
  phoneCountry: AddressCountryCode;
  postalCode: string;
  reference: string;
  region: string;
  stateRegistration: string;
  street: string;
};

const INITIAL_FORM_DATA: RegisterFormData = {
  birthDate: '',
  cellPhone: '',
  city: '',
  cnpj: '',
  complement: '',
  confirmEmail: '',
  confirmPassword: '',
  corporateName: '',
  country: 'US',
  cpf: '',
  email: '',
  fullName: '',
  gender: '',
  landline: '',
  neighborhood: '',
  number: '',
  password: '',
  phoneCountry: 'US',
  postalCode: '',
  reference: '',
  region: '',
  stateRegistration: '',
  street: '',
};

const REGISTER_COUNTRY: AddressCountryCode = 'US';

const baseInputClass =
  'w-full border border-neutral-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:border-primary rounded-sm disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed';

const statusToneClasses: Record<Exclude<PostalStatusTone, 'idle'>, string> = {
  error: 'text-red-500',
  loading: 'text-neutral-500',
  manual: 'text-neutral-500',
  success: 'text-emerald-600',
  warning: 'text-amber-600',
};

function getPostalStatusMessage(
  tone: PostalStatusTone,
  countryCode: AddressCountryCode,
  t: (key: string) => string,
) {
  if (tone === 'manual') return t('addressManualCountryHint');

  const isBrazil = countryCode === 'BR';

  switch (tone) {
    case 'loading':
      return isBrazil ? t('zipcodeLookupLoading') : t('postalLookupLoading');
    case 'success':
      return isBrazil ? t('zipcodeLookupSuccess') : t('postalLookupSuccess');
    case 'warning':
      return isBrazil ? t('zipcodeLookupNotFound') : t('postalLookupNotFound');
    case 'error':
      return isBrazil ? t('zipcodeLookupError') : t('postalLookupError');
    default:
      return isBrazil ? t('addressFieldsLockedHint') : t('postalFieldsLockedHint');
  }
}

export function Register() {
  const [registrationType, setRegistrationType] = useState<RegistrationType>('F');
  const [formData, setFormData] = useState<RegisterFormData>(INITIAL_FORM_DATA);
  const [isSearchingPostalCode, setIsSearchingPostalCode] = useState(false);
  const [isAddressUnlocked, setIsAddressUnlocked] = useState(false);
  const [postalStatusTone, setPostalStatusTone] = useState<PostalStatusTone>('idle');
  const latestPostalQueryRef = useRef('');
  const birthDateInputRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();
  const { locale, t } = useStorefront();
  const { settings } = useSettings();
  const { registerCustomer } = useCustomerSession();
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addressLabels = useMemo(() => getAddressLabels(formData.country, locale), [formData.country, locale]);
  const birthDatePlaceholder = useMemo(() => getBirthDatePlaceholder(locale), [locale]);
  const phonePlaceholder = useMemo(() => getPhonePlaceholder(formData.phoneCountry), [formData.phoneCountry]);
  const taxIdConfig = useMemo(() => getTaxIdFieldConfig(formData.country, registrationType, locale), [formData.country, registrationType, locale]);
  const previousTaxIdContextRef = useRef<{ kind: TaxIdFieldKind; registrationType: RegistrationType } | null>(null);
  const isBusinessRegistrationEnabled = settings.allowBusinessRegistration;
  const hasCompleteBirthDate = useMemo(() => isBirthDateComplete(formData.birthDate), [formData.birthDate]);
  const hasInvalidBirthDate = useMemo(
    () => hasCompleteBirthDate && !isBirthDateValid(formData.birthDate, locale),
    [formData.birthDate, hasCompleteBirthDate, locale],
  );
  const incompleteAddressMessage = locale === 'en-US'
    ? 'Complete your address before creating the account.'
    : 'Preencha seu endereco antes de criar a conta.';

  useEffect(() => {
    if (isBusinessRegistrationEnabled || registrationType !== 'J') return;

    setRegistrationType('F');
    setFormData((prev) => ({
      ...prev,
      cnpj: '',
      corporateName: '',
      stateRegistration: '',
    }));
  }, [isBusinessRegistrationEnabled, registrationType]);

  useEffect(() => {
    setFormData((prev) => {
      if (prev.country === REGISTER_COUNTRY && prev.phoneCountry === REGISTER_COUNTRY) {
        return prev;
      }

      return {
        ...prev,
        country: REGISTER_COUNTRY,
        phoneCountry: REGISTER_COUNTRY,
      };
    });
  }, []);

  useEffect(() => {
    const previousContext = previousTaxIdContextRef.current;

    if (
      previousContext &&
      previousContext.registrationType === registrationType &&
      previousContext.kind !== taxIdConfig.kind &&
      taxIdConfig.kind !== 'none'
    ) {
      setFormData((prev) => {
        if (registrationType === 'F') {
          return prev.cpf ? { ...prev, cpf: '' } : prev;
        }

        return prev.cnpj ? { ...prev, cnpj: '' } : prev;
      });
    }

    previousTaxIdContextRef.current = { kind: taxIdConfig.kind, registrationType };
  }, [registrationType, taxIdConfig.kind]);

  const updateField = <K extends keyof RegisterFormData>(field: K, value: RegisterFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetAddressFields = (postalCode: string, country: AddressCountryCode = formData.country) => {
    setFormData((prev) => ({
      ...prev,
      city: '',
      complement: '',
      country,
      neighborhood: '',
      number: '',
      postalCode,
      reference: '',
      region: '',
      street: '',
    }));
  };

  const handleMaskedFieldChange = <K extends keyof RegisterFormData>(
    field: K,
    rawValue: string,
    formatter: (value: string) => string,
  ) => {
    updateField(field, formatter(rawValue) as RegisterFormData[K]);
  };

  const handleCountryChange = (nextCountry: AddressCountryCode) => {
    const manualCountry = isManualAddressCountry(nextCountry);

    latestPostalQueryRef.current = '';
    setIsSearchingPostalCode(false);
    setIsAddressUnlocked(manualCountry);
    setPostalStatusTone(manualCountry ? 'manual' : 'idle');
    setFormData((prev) => ({
      ...prev,
      stateRegistration: nextCountry === 'BR' ? prev.stateRegistration : '',
    }));
    resetAddressFields('', nextCountry);
  };

  const handlePostalCodeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPostalCode = formatPostalCode(event.target.value, formData.country);
    const manualCountry = isManualAddressCountry(formData.country);

    latestPostalQueryRef.current = formattedPostalCode;
    resetAddressFields(formattedPostalCode);
    setIsAddressUnlocked(manualCountry);

    if (manualCountry) {
      setIsSearchingPostalCode(false);
      setPostalStatusTone('manual');
      return;
    }

    if (!isAddressLookupComplete(formData.country, formattedPostalCode)) {
      setIsSearchingPostalCode(false);
      setPostalStatusTone('idle');
      return;
    }

    setIsSearchingPostalCode(true);
    setPostalStatusTone('loading');

    try {
      const result = await lookupAddressByCountry(formData.country, formattedPostalCode);

      if (latestPostalQueryRef.current !== formattedPostalCode) {
        return;
      }

      if (result) {
        setFormData((prev) => ({
          ...prev,
          city: result.city,
          neighborhood: result.neighborhood,
          postalCode: result.postalCode || formattedPostalCode,
          region: result.region,
          street: result.street,
        }));
        setPostalStatusTone('success');
      } else {
        setPostalStatusTone('warning');
      }

      setIsAddressUnlocked(true);
    } catch (error) {
      if (latestPostalQueryRef.current !== formattedPostalCode) {
        return;
      }

      console.error('Erro ao buscar codigo postal', error);
      setPostalStatusTone('error');
      setIsAddressUnlocked(true);
    } finally {
      if (latestPostalQueryRef.current === formattedPostalCode) {
        setIsSearchingPostalCode(false);
      }
    }
  };

  const isAddressDisabled = !isAddressUnlocked || isSearchingPostalCode;
  const postalStatusMessage = getPostalStatusMessage(postalStatusTone, formData.country, t);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (hasInvalidBirthDate) {
      birthDateInputRef.current?.focus();
      return;
    }

    if (formData.email.trim().toLowerCase() !== formData.confirmEmail.trim().toLowerCase()) {
      setSubmitError(t('emailConfirmationMismatch'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setSubmitError(t('passwordConfirmationMismatch'));
      return;
    }

    if (!formData.postalCode.trim() || !formData.street.trim() || !formData.city.trim() || !formData.region.trim()) {
      setSubmitError(incompleteAddressMessage);
      return;
    }

    setSubmitError('');
    setIsSubmitting(true);

    try {
      const result = await registerCustomer({
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        phone: formData.cellPhone,
        phoneCountry: REGISTER_COUNTRY,
        birthDate: toBirthDateIso(formData.birthDate, locale),
        gender: formData.gender,
        registrationType,
        taxId: registrationType === 'F' ? formData.cpf : formData.cnpj,
        corporateName: formData.corporateName,
        stateRegistration: formData.stateRegistration,
        address: {
          label: t('homeAddress'),
          country: REGISTER_COUNTRY,
          postalCode: formData.postalCode,
          street: formData.street,
          number: formData.number,
          complement: formData.complement,
          neighborhood: formData.neighborhood,
          city: formData.city,
          region: formData.region,
        },
      });

      if (!result.ok) {
        if (result.error === 'EMAIL_EXISTS') {
          setSubmitError(t('accountAlreadyExists'));
          return;
        }

        setSubmitError(result.message || t('accountCreationError'));
        return;
      }

      navigate('/account');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : t('accountCreationError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#f7f7f7] min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-secondary">{t('identification')}</h1>
          <p className="text-secondary/70 text-sm">{t('identificationSubtitle')}</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <section className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <SectionTitle icon={<User className="w-5 h-5 text-secondary" />} title={t('accessData')} />

            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-secondary mb-1.5">
                  <Mail className="w-4 h-4" /> {t('contactEmail')}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => updateField('email', event.target.value)}
                  placeholder={t('enterYourEmail')}
                  className={`${baseInputClass} placeholder:text-neutral-400`}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-secondary mb-1.5 mt-0.5">{t('confirmEmail')}</label>
                <input
                  type="email"
                  value={formData.confirmEmail}
                  onChange={(event) => updateField('confirmEmail', event.target.value)}
                  className={baseInputClass}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-secondary mb-1.5">
                  <Lock className="w-4 h-4" /> {t('createPassword')}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  className={baseInputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-secondary mb-1.5 mt-0.5">{t('confirmPassword')}</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(event) => updateField('confirmPassword', event.target.value)}
                  className={baseInputClass}
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
            <SectionTitle icon={<Users className="w-5 h-5 text-secondary" />} title={t('registrationType')} />
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-secondary">
                <input
                  type="radio"
                  name="tipo"
                  checked={registrationType === 'F'}
                  onChange={() => setRegistrationType('F')}
                  className="accent-[#ba884b] w-4 h-4"
                />
                {t('individualPerson')}
              </label>
              <label
                className={`flex items-center gap-2 text-sm ${
                  isBusinessRegistrationEnabled ? 'cursor-pointer text-secondary' : 'cursor-not-allowed text-secondary/45'
                }`}
              >
                <input
                  type="radio"
                  name="tipo"
                  checked={registrationType === 'J'}
                  onChange={() => setRegistrationType('J')}
                  disabled={!isBusinessRegistrationEnabled}
                  className="accent-[#ba884b] w-4 h-4"
                />
                {t('legalEntity')}
              </label>
            </div>
            {!isBusinessRegistrationEnabled ? (
              <p className="mt-3 text-xs text-secondary/60">{t('businessRegistrationUnavailable')}</p>
            ) : null}
          </section>

          <div className="grid md:grid-cols-2 gap-6 items-start">
            <section className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
              <SectionTitle icon={<List className="w-5 h-5 text-secondary" />} title={t('personalData')} />

              <div className="space-y-4">
                <OptionRow label={t('fullName')}>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(event) => updateField('fullName', event.target.value)}
                    className={baseInputClass}
                  />
                </OptionRow>

                {registrationType === 'F' ? (
                  <>
                    {taxIdConfig.visible ? (
                      <OptionRow label={taxIdConfig.label}>
                        <input
                          required={taxIdConfig.required}
                          type="text"
                          inputMode={taxIdConfig.inputMode}
                          value={formData.cpf}
                          onChange={(event) => handleMaskedFieldChange('cpf', event.target.value, taxIdConfig.format)}
                          placeholder={taxIdConfig.placeholder}
                          className={`${baseInputClass} ${taxIdConfig.maxWidthClass}`}
                        />
                      </OptionRow>
                    ) : taxIdConfig.helpText ? (
                      <OptionRow label={taxIdConfig.label} align="start">
                        <p className="pt-2 text-[12px] text-neutral-500 max-w-md">{taxIdConfig.helpText}</p>
                      </OptionRow>
                    ) : null}
                    <OptionRow label={t('cellphone')}>
                      <StorePhoneField
                        locale={locale}
                        name="cellPhone"
                        countryCode={REGISTER_COUNTRY}
                        value={formData.cellPhone}
                        placeholder={phonePlaceholder}
                        disableCountrySelection
                        onChange={(nextValue) =>
                          setFormData((prev) => ({
                            ...prev,
                            phoneCountry: REGISTER_COUNTRY,
                            cellPhone: nextValue,
                          }))
                        }
                      />
                    </OptionRow>
                    <OptionRow label={t('gender')}>
                      <select
                        value={formData.gender}
                        onChange={(event) => updateField('gender', event.target.value)}
                        className={`${baseInputClass} max-w-[160px] bg-white`}
                      >
                        <option value="">{t('selectOption')}</option>
                        <option value={t('female')}>{t('female')}</option>
                        <option value={t('male')}>{t('male')}</option>
                      </select>
                    </OptionRow>
                    <OptionRow label={t('birthDate')}>
                      <div className="max-w-[220px]">
                        <input
                          ref={birthDateInputRef}
                          type="text"
                          inputMode="numeric"
                          value={formData.birthDate}
                          onChange={(event) => updateField('birthDate', formatBirthDate(event.target.value, locale))}
                          placeholder={birthDatePlaceholder}
                          maxLength={10}
                          aria-invalid={hasInvalidBirthDate}
                          className={`${baseInputClass} max-w-[140px] ${hasInvalidBirthDate ? 'border-red-400 focus:border-red-500' : ''}`}
                        />
                        {hasInvalidBirthDate ? (
                          <p className="mt-2 text-[12px] text-red-500">{t('birthDateInvalid')}</p>
                        ) : null}
                      </div>
                    </OptionRow>
                  </>
                ) : (
                  <>
                    <OptionRow label={taxIdConfig.label}>
                      <input
                        required={taxIdConfig.required}
                        type="text"
                        inputMode={taxIdConfig.inputMode}
                        value={formData.cnpj}
                        onChange={(event) => handleMaskedFieldChange('cnpj', event.target.value, taxIdConfig.format)}
                        placeholder={taxIdConfig.placeholder}
                        className={`${baseInputClass} ${taxIdConfig.maxWidthClass}`}
                      />
                    </OptionRow>
                    <OptionRow label={t('corporateName')}>
                      <input
                        type="text"
                        value={formData.corporateName}
                        onChange={(event) => updateField('corporateName', event.target.value)}
                        className={baseInputClass}
                      />
                    </OptionRow>
                    {formData.country === 'BR' ? (
                      <OptionRow label={t('stateRegistration')}>
                        <input
                          type="text"
                          value={formData.stateRegistration}
                          onChange={(event) => updateField('stateRegistration', event.target.value)}
                          className={`${baseInputClass} max-w-[200px]`}
                        />
                      </OptionRow>
                    ) : null}
                    <OptionRow label={t('cellphone')}>
                      <StorePhoneField
                        locale={locale}
                        name="cellPhone"
                        countryCode={REGISTER_COUNTRY}
                        value={formData.cellPhone}
                        placeholder={phonePlaceholder}
                        disableCountrySelection
                        onChange={(nextValue) =>
                          setFormData((prev) => ({
                            ...prev,
                            phoneCountry: REGISTER_COUNTRY,
                            cellPhone: nextValue,
                          }))
                        }
                      />
                    </OptionRow>
                  </>
                )}
              </div>
            </section>

            <section className="bg-white p-6 rounded-sm shadow-[0_1px_3px_rgba(0,0,0,0.1)]">
              <SectionTitle icon={<MapPin className="w-5 h-5 text-secondary" />} title={t('address')} />

              <div className="space-y-4">
                <OptionRow label={t('country')} align="start">
                  <div className="max-w-[280px] space-y-2">
                    <StoreCountrySelect
                      value={REGISTER_COUNTRY}
                      onChange={handleCountryChange}
                      locale={locale}
                      disabled
                    />
                    <p className="text-[11px] text-neutral-500">{t('usOnlyRegistrationHint')}</p>
                  </div>
                </OptionRow>

                <OptionRow label={addressLabels.postalCodeLabel} align="start">
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <input
                        type="text"
                        inputMode={formData.country === 'CA' || formData.country === 'GB' ? 'text' : 'numeric'}
                        value={formData.postalCode}
                        onChange={handlePostalCodeChange}
                        placeholder={addressLabels.postalPlaceholder}
                        className={`${baseInputClass} w-full sm:w-[160px]`}
                        aria-busy={isSearchingPostalCode}
                      />
                      {formData.country === 'BR' ? (
                        <a
                          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                          target="_blank"
                          rel="noreferrer"
                          className="text-secondary font-bold text-xs flex items-center hover:text-primary"
                        >
                          <HelpCircle className="w-3.5 h-3.5 mr-1" /> {t('dontKnowZipcode')}
                        </a>
                      ) : null}
                    </div>
                    <div className={`text-[11px] font-medium flex items-center gap-2 ${postalStatusTone === 'idle' ? 'text-neutral-500' : statusToneClasses[postalStatusTone]}`}>
                      {isSearchingPostalCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>{postalStatusMessage}</span>
                    </div>
                  </div>
                </OptionRow>

                <OptionRow label={t('street')}>
                  <input
                    type="text"
                    value={formData.street}
                    onChange={(event) => updateField('street', event.target.value)}
                    disabled={isAddressDisabled}
                    className={`${baseInputClass} max-w-[280px]`}
                  />
                </OptionRow>
                <OptionRow label={t('number')}>
                  <input
                    type="text"
                    value={formData.number}
                    onChange={(event) => updateField('number', event.target.value)}
                    disabled={isAddressDisabled}
                    className={`${baseInputClass} max-w-[90px]`}
                  />
                </OptionRow>
                <OptionRow label={t('complement')}>
                  <input
                    type="text"
                    value={formData.complement}
                    onChange={(event) => updateField('complement', event.target.value)}
                    disabled={isAddressDisabled}
                    className={`${baseInputClass} max-w-[280px]`}
                  />
                </OptionRow>
                <OptionRow label={t('reference')}>
                  <input
                    type="text"
                    value={formData.reference}
                    onChange={(event) => updateField('reference', event.target.value)}
                    disabled={isAddressDisabled}
                    className={`${baseInputClass} max-w-[280px]`}
                  />
                </OptionRow>
                <OptionRow label={t('neighborhood')}>
                  <input
                    type="text"
                    value={formData.neighborhood}
                    onChange={(event) => updateField('neighborhood', event.target.value)}
                    disabled={isAddressDisabled}
                    className={`${baseInputClass} max-w-[220px]`}
                  />
                </OptionRow>
                <OptionRow label={t('city')}>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(event) => updateField('city', event.target.value)}
                    disabled={isAddressDisabled}
                    className={`${baseInputClass} max-w-[220px]`}
                  />
                </OptionRow>
                <OptionRow label={addressLabels.regionLabel}>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(event) => updateField('region', event.target.value)}
                    disabled={isAddressDisabled}
                    className={`${baseInputClass} max-w-[220px]`}
                  />
                </OptionRow>
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-[#f0f0f0] text-secondary px-6 py-2.5 text-sm hover:bg-neutral-200 transition-colors rounded-sm"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSearchingPostalCode || !isAddressUnlocked || isSubmitting}
              className="bg-[#c29656] text-white px-6 py-2.5 font-bold text-sm hover:bg-[#a67c42] transition-colors rounded-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('createAccountSubmitting') : t('createAccount')}
            </button>
          </div>
          {submitError ? <p className="pt-2 text-right text-sm font-medium text-red-500">{submitError}</p> : null}
        </form>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-6 border-b border-neutral-100 pb-3">
      {icon}
      <h2 className="font-bold uppercase tracking-wider text-secondary text-sm">{title}</h2>
    </div>
  );
}

function OptionRow({
  label,
  children,
  align = 'center',
}: {
  label: string;
  children: React.ReactNode;
  align?: 'center' | 'start';
}) {
  return (
    <div className={`flex flex-col sm:flex-row gap-1 sm:gap-4 ${align === 'start' ? 'sm:items-start' : 'sm:items-center'}`}>
      <label className="sm:w-[130px] sm:text-right text-[13px] font-bold text-secondary shrink-0">{label}</label>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
