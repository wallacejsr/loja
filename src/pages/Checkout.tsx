import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCustomerSession } from '../context/CustomerSessionContext';
import { CheckCircle, CreditCard, HelpCircle, Loader2 } from 'lucide-react';
import { useLoyalty } from '../hooks/useLoyalty';
import { useSettings } from '../hooks/useSettings';
import { useShippingQuotes } from '../hooks/useShippingQuotes';
import { useStorefront } from '../hooks/useStorefront';
import { syncCheckoutOrderToAdmin } from '../lib/adminDataBridge';
import { StoreCountrySelect } from '../components/StoreCountrySelect';
import { StorePhoneField } from '../components/StorePhoneField';
import { StoreImage } from '../components/StoreImage';
import {
  AddressCountryCode,
  formatPostalCode,
  getAddressLabels,
  getPhonePlaceholder,
  getTaxIdFieldConfig,
  isAddressLookupComplete,
  isManualAddressCountry,
  lookupAddressByCountry,
  type TaxIdFieldKind,
} from '../lib/customerForm';

type PostalStatusTone = 'error' | 'idle' | 'loading' | 'manual' | 'success' | 'warning';

type IdentificationFormData = {
  cpf: string;
  email: string;
  fullName: string;
  phone: string;
  phoneCountry: AddressCountryCode;
};

type DeliveryFormData = {
  city: string;
  complement: string;
  country: AddressCountryCode;
  neighborhood: string;
  number: string;
  postalCode: string;
  region: string;
  street: string;
};

const INITIAL_IDENTIFICATION_FORM: IdentificationFormData = {
  cpf: '',
  email: '',
  fullName: '',
  phone: '',
  phoneCountry: 'US',
};

const INITIAL_DELIVERY_FORM: DeliveryFormData = {
  city: '',
  complement: '',
  country: 'US',
  neighborhood: '',
  number: '',
  postalCode: '',
  region: '',
  street: '',
};

const CHECKOUT_COUNTRY: AddressCountryCode = 'US';

const inputClass =
  'w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed';

const postalToneClasses: Record<Exclude<PostalStatusTone, 'idle'>, string> = {
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

export function Checkout() {
  const { cart, cartTotal } = useCart();
  const navigate = useNavigate();
  const { addPoints } = useLoyalty();
  const { settings } = useSettings();
  const { locale, t, formatCurrency } = useStorefront();
  const {
    currentCustomer,
    primaryAddress,
    isLoggedIn,
    guestShippingDraft,
    saveGuestShippingDraft,
    updateProfile,
    saveAddress,
  } = useCustomerSession();
  const [step, setStep] = useState(1);
  const [identificationData, setIdentificationData] = useState<IdentificationFormData>(INITIAL_IDENTIFICATION_FORM);
  const [deliveryData, setDeliveryData] = useState<DeliveryFormData>(INITIAL_DELIVERY_FORM);
  const [isSearchingPostalCode, setIsSearchingPostalCode] = useState(false);
  const [isDeliveryUnlocked, setIsDeliveryUnlocked] = useState(false);
  const [postalStatusTone, setPostalStatusTone] = useState<PostalStatusTone>('idle');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'Cartao de credito' | 'Pix'>('Cartao de credito');
  const orderNumber = useMemo(() => `#SD${Math.floor(Math.random() * 100000)}`, []);
  const { quotes, selectedQuote, setSelectedQuoteId, loadQuotes, mode, status: shippingQuotesStatus, error: shippingQuotesError, resetQuotes } = useShippingQuotes(
    cart,
    cartTotal,
    settings,
  );

  const addressLabels = useMemo(() => getAddressLabels(deliveryData.country, locale), [deliveryData.country, locale]);
  const phonePlaceholder = useMemo(() => getPhonePlaceholder(identificationData.phoneCountry), [identificationData.phoneCountry]);
  const taxIdConfig = useMemo(() => getTaxIdFieldConfig(deliveryData.country, 'F', locale), [deliveryData.country, locale]);
  const previousTaxIdKindRef = useRef<TaxIdFieldKind | null>(null);
  const hasHydratedCustomerDataRef = useRef(false);

  useEffect(() => {
    const previousKind = previousTaxIdKindRef.current;

    if (previousKind && previousKind !== taxIdConfig.kind && taxIdConfig.kind !== 'none') {
      setIdentificationData((prev) => (prev.cpf ? { ...prev, cpf: '' } : prev));
    }

    previousTaxIdKindRef.current = taxIdConfig.kind;
  }, [taxIdConfig.kind]);

  useEffect(() => {
    setIdentificationData((prev) =>
      prev.phoneCountry === CHECKOUT_COUNTRY ? prev : { ...prev, phoneCountry: CHECKOUT_COUNTRY },
    );
    setDeliveryData((prev) =>
      prev.country === CHECKOUT_COUNTRY ? prev : { ...prev, country: CHECKOUT_COUNTRY },
    );
  }, []);

  useEffect(() => {
    if (hasHydratedCustomerDataRef.current) return;

    if (isLoggedIn && currentCustomer) {
      setIdentificationData((prev) => ({
        ...prev,
        fullName: currentCustomer.fullName,
        email: currentCustomer.email,
        phone: currentCustomer.phone,
        phoneCountry: currentCustomer.phoneCountry || CHECKOUT_COUNTRY,
        cpf: currentCustomer.taxId,
      }));

      if (primaryAddress) {
        setDeliveryData({
          country: primaryAddress.country,
          postalCode: primaryAddress.postalCode,
          street: primaryAddress.street,
          number: primaryAddress.number,
          complement: primaryAddress.complement,
          neighborhood: primaryAddress.neighborhood,
          city: primaryAddress.city,
          region: primaryAddress.region,
        });
        setIsDeliveryUnlocked(true);
        setPostalStatusTone('success');
        hasHydratedCustomerDataRef.current = true;
        return;
      }

      if (!guestShippingDraft) {
        hasHydratedCustomerDataRef.current = true;
        return;
      }
    }

    if (guestShippingDraft) {
      setDeliveryData({
        country: guestShippingDraft.country,
        postalCode: guestShippingDraft.postalCode,
        street: guestShippingDraft.street,
        number: guestShippingDraft.number,
        complement: guestShippingDraft.complement,
        neighborhood: guestShippingDraft.neighborhood,
        city: guestShippingDraft.city,
        region: guestShippingDraft.region,
      });
      setIsDeliveryUnlocked(Boolean(guestShippingDraft.postalCode));
      setPostalStatusTone(guestShippingDraft.postalCode ? 'success' : 'idle');
      hasHydratedCustomerDataRef.current = true;
    }
  }, [currentCustomer, guestShippingDraft, isLoggedIn, primaryAddress]);

  if (cart.length === 0 && step !== 4) {
    navigate('/cart');
    return null;
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 3) {
      addPoints(Math.floor(cartTotal * (settings.pointsPerReal || 1)));

      if (isLoggedIn) {
        updateProfile({
          fullName: identificationData.fullName,
          phone: identificationData.phone,
          phoneCountry: identificationData.phoneCountry,
          taxId: taxIdConfig.visible ? identificationData.cpf : currentCustomer?.taxId || '',
        });

        saveAddress({
          id: primaryAddress?.id || '',
          label: primaryAddress?.label || t('homeAddress'),
          country: deliveryData.country,
          postalCode: deliveryData.postalCode,
          street: deliveryData.street,
          number: deliveryData.number,
          complement: deliveryData.complement,
          neighborhood: deliveryData.neighborhood,
          city: deliveryData.city,
          region: deliveryData.region,
          isPrimary: true,
        });
      } else {
        saveGuestShippingDraft({
          country: deliveryData.country,
          postalCode: deliveryData.postalCode,
          street: deliveryData.street,
          number: deliveryData.number,
          complement: deliveryData.complement,
          neighborhood: deliveryData.neighborhood,
          city: deliveryData.city,
          region: deliveryData.region,
        });
      }

      syncCheckoutOrderToAdmin({
        orderNumber,
        paymentMethod: selectedPaymentMethod,
        customer: {
          name: identificationData.fullName,
          email: identificationData.email,
          phone: identificationData.phone,
          phoneCountry: identificationData.phoneCountry,
          cpf: taxIdConfig.visible ? identificationData.cpf : '',
        },
        shippingAddress: {
          country: deliveryData.country,
          postalCode: deliveryData.postalCode,
          street: deliveryData.street,
          number: deliveryData.number,
          complement: deliveryData.complement,
          neighborhood: deliveryData.neighborhood,
          city: deliveryData.city,
          region: deliveryData.region,
        },
        items: cart.map((item) => ({
          id: item.product.id,
          name: item.product.nome,
          quantity: item.quantity,
          unitPrice: item.product.precoPromocional || item.product.preco,
          size: item.size,
          color: item.color,
        })),
        subtotal: cartTotal,
        shipping: shippingCost,
        shippingMethod: selectedQuote?.service,
        discount: 0,
      });
    }
    setStep(step + 1);
  };

  const updateIdentificationField = <K extends keyof IdentificationFormData>(field: K, value: IdentificationFormData[K]) => {
    setIdentificationData((prev) => ({ ...prev, [field]: value }));
  };

  const updateDeliveryField = <K extends keyof DeliveryFormData>(field: K, value: DeliveryFormData[K]) => {
    setDeliveryData((prev) => ({ ...prev, [field]: value }));
  };

  const resetDeliveryAddress = (postalCode: string, country: AddressCountryCode = deliveryData.country) => {
    setDeliveryData((prev) => ({
      ...prev,
      city: '',
      complement: '',
      country,
      neighborhood: '',
      number: '',
      postalCode,
      region: '',
      street: '',
    }));
  };

  const handleCountryChange = (nextCountry: AddressCountryCode) => {
    const manualCountry = isManualAddressCountry(nextCountry);

    setIsSearchingPostalCode(false);
    setIsDeliveryUnlocked(manualCountry);
    setPostalStatusTone(manualCountry ? 'manual' : 'idle');
    resetQuotes();
    resetDeliveryAddress('', nextCountry);
  };

  const handlePostalCodeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const formattedPostalCode = formatPostalCode(event.target.value, deliveryData.country);
    const manualCountry = isManualAddressCountry(deliveryData.country);

    resetDeliveryAddress(formattedPostalCode);
    setIsDeliveryUnlocked(manualCountry);
    resetQuotes();

    if (manualCountry) {
      setIsSearchingPostalCode(false);
      setPostalStatusTone('manual');
      return;
    }

    if (!isAddressLookupComplete(deliveryData.country, formattedPostalCode)) {
      setIsSearchingPostalCode(false);
      setPostalStatusTone('idle');
      return;
    }

    setIsSearchingPostalCode(true);
    setPostalStatusTone('loading');

    try {
      const result = await lookupAddressByCountry(deliveryData.country, formattedPostalCode);

      if (result) {
        setDeliveryData((prev) => ({
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

      setIsDeliveryUnlocked(true);
    } catch (error) {
      console.error('Erro ao buscar codigo postal', error);
      setPostalStatusTone('error');
      setIsDeliveryUnlocked(true);
    } finally {
      setIsSearchingPostalCode(false);
    }
  };

  const isDeliveryFieldsDisabled = !isDeliveryUnlocked || isSearchingPostalCode;
  const postalStatusMessage = getPostalStatusMessage(postalStatusTone, deliveryData.country, t);
  const hasValidatedPostalLookup =
    (isManualAddressCountry(deliveryData.country) && isDeliveryUnlocked)
    || postalStatusTone === 'success';
  const canRequestShippingQuotes =
    isDeliveryUnlocked &&
    hasValidatedPostalLookup &&
    deliveryData.street.trim().length > 0 &&
    deliveryData.city.trim().length > 0 &&
    deliveryData.region.trim().length > 0 &&
    isAddressLookupComplete(deliveryData.country, deliveryData.postalCode);
  const shippingCost = selectedQuote?.amount ?? 0;

  const handleRefreshShipping = async () => {
    if (!canRequestShippingQuotes) return;

    await loadQuotes({
      country: deliveryData.country,
      postalCode: deliveryData.postalCode,
      city: deliveryData.city,
      region: deliveryData.region,
      street: deliveryData.street,
      number: deliveryData.number,
      name: identificationData.fullName,
      phone: identificationData.phone,
      email: identificationData.email,
    });
  };

  useEffect(() => {
    if (step !== 2) return;
    if (!canRequestShippingQuotes) return;

    void loadQuotes({
      country: deliveryData.country,
      postalCode: deliveryData.postalCode,
      city: deliveryData.city,
      region: deliveryData.region,
      street: deliveryData.street,
      number: deliveryData.number,
      name: identificationData.fullName,
      phone: identificationData.phone,
      email: identificationData.email,
    });
  }, [
    canRequestShippingQuotes,
    deliveryData.city,
    deliveryData.country,
    deliveryData.postalCode,
    deliveryData.region,
    deliveryData.street,
    deliveryData.number,
    identificationData.email,
    identificationData.fullName,
    identificationData.phone,
    loadQuotes,
    step,
  ]);

  if (step === 4) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-neutral-900 mb-4">{t('checkoutConfirmed')}</h2>
        <p className="text-neutral-600 mb-2">{t('thanksForPurchase', { store: settings.storeName })}</p>
        <p className="text-neutral-500 mb-8 max-w-md">{t('orderNumberCopy', { orderNumber })}</p>
        <button onClick={() => navigate('/')} className="bg-neutral-900 text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-neutral-800 transition-colors">
          {t('backHome')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-center mb-12">
        <div className="flex items-center text-xs font-bold uppercase tracking-wider">
          <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 mr-2 ${step >= 1 ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-400'}`}>1</span>
          <span className={`hidden sm:inline ${step >= 1 ? 'text-neutral-900' : 'text-neutral-400'}`}>{t('checkoutStepIdentification')}</span>

          <div className={`w-8 sm:w-16 h-px mx-4 ${step >= 2 ? 'bg-neutral-900' : 'bg-neutral-300'}`} />

          <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 mr-2 ${step >= 2 ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-400'}`}>2</span>
          <span className={`hidden sm:inline ${step >= 2 ? 'text-neutral-900' : 'text-neutral-400'}`}>{t('checkoutStepDelivery')}</span>

          <div className={`w-8 sm:w-16 h-px mx-4 ${step >= 3 ? 'bg-neutral-900' : 'bg-neutral-300'}`} />

          <span className={`flex items-center justify-center w-8 h-8 rounded-full border-2 mr-2 ${step >= 3 ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-300 text-neutral-400'}`}>3</span>
          <span className={`hidden sm:inline ${step >= 3 ? 'text-neutral-900' : 'text-neutral-400'}`}>{t('checkoutStepPayment')}</span>
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8 mb-8 lg:mb-0">
          <form onSubmit={handleNext}>
            {step === 1 && (
              <div className="bg-white border border-neutral-200 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-neutral-900 mb-6 uppercase tracking-wider flex items-center border-b border-neutral-100 pb-4">
                  <span className="w-8">1.</span> {t('personalDataTitle')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label={t('fullName')}
                    value={identificationData.fullName}
                    onChange={(event) => updateIdentificationField('fullName', event.target.value)}
                  />
                  <div className="md:col-span-2 hidden" />
                  {taxIdConfig.visible ? (
                    <Field
                      label={taxIdConfig.label}
                      value={identificationData.cpf}
                      inputMode={taxIdConfig.inputMode}
                      placeholder={taxIdConfig.placeholder}
                      required={taxIdConfig.required}
                      onChange={(event) => updateIdentificationField('cpf', taxIdConfig.format(event.target.value))}
                    />
                  ) : taxIdConfig.helpText ? (
                    <div className="md:col-span-2 rounded-sm border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-neutral-700">{taxIdConfig.label}</div>
                      <p className="mt-1.5 text-sm text-neutral-500">{taxIdConfig.helpText}</p>
                    </div>
                  ) : null}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">{t('contactPhone')}</label>
                    <StorePhoneField
                      locale={locale}
                      name="checkoutPhone"
                      countryCode={CHECKOUT_COUNTRY}
                      value={identificationData.phone}
                      placeholder={phonePlaceholder}
                      disableCountrySelection
                      onChange={(nextValue) =>
                        setIdentificationData((prev) => ({
                          ...prev,
                          phoneCountry: CHECKOUT_COUNTRY,
                          phone: nextValue,
                        }))
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Field
                      label={t('contactEmail')}
                      type="email"
                      value={identificationData.email}
                      onChange={(event) => updateIdentificationField('email', event.target.value)}
                    />
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <button type="submit" className="bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm">
                    {t('goToDelivery')}
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="bg-white border border-neutral-200 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-neutral-900 mb-6 uppercase tracking-wider flex items-center border-b border-neutral-100 pb-4">
                  <span className="w-8">2.</span> {t('deliveryAddressTitle')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">{t('country')}</label>
                    <div className="max-w-[280px] space-y-2">
                      <StoreCountrySelect
                        value={CHECKOUT_COUNTRY}
                        onChange={handleCountryChange}
                        locale={locale}
                        disabled
                      />
                      <p className="text-[11px] text-neutral-500">{t('usOnlyShippingHint')}</p>
                    </div>
                  </div>
                  <div className="hidden md:block" />
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">{addressLabels.postalCodeLabel}</label>
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="relative flex-1 md:max-w-[180px]">
                          <input
                            required
                            type="text"
                            inputMode={deliveryData.country === 'CA' || deliveryData.country === 'GB' ? 'text' : 'numeric'}
                            value={deliveryData.postalCode}
                            onChange={handlePostalCodeChange}
                            className={inputClass}
                            placeholder={addressLabels.postalPlaceholder}
                          />
                          {isSearchingPostalCode ? (
                            <Loader2 className="absolute right-3 top-3.5 w-5 h-5 animate-spin text-neutral-500" />
                          ) : null}
                        </div>
                        {deliveryData.country === 'BR' ? (
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
                      <div className={`text-[11px] font-medium flex items-center gap-2 ${postalStatusTone === 'idle' ? 'text-neutral-500' : postalToneClasses[postalStatusTone]}`}>
                        {isSearchingPostalCode ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        <span>{postalStatusMessage}</span>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block" />
                  <div className="md:col-span-2">
                    <Field
                      label={t('avenue')}
                      value={deliveryData.street}
                      disabled={isDeliveryFieldsDisabled}
                      onChange={(event) => updateDeliveryField('street', event.target.value)}
                    />
                  </div>
                  <Field
                    label={t('number')}
                    value={deliveryData.number}
                    disabled={isDeliveryFieldsDisabled}
                    onChange={(event) => updateDeliveryField('number', event.target.value)}
                  />
                  <Field
                    label={t('complement')}
                    required={false}
                    value={deliveryData.complement}
                    disabled={isDeliveryFieldsDisabled}
                    onChange={(event) => updateDeliveryField('complement', event.target.value)}
                  />
                  <Field
                    label={t('neighborhood')}
                    value={deliveryData.neighborhood}
                    disabled={isDeliveryFieldsDisabled}
                    onChange={(event) => updateDeliveryField('neighborhood', event.target.value)}
                  />
                  <Field
                    label={t('city')}
                    value={deliveryData.city}
                    disabled={isDeliveryFieldsDisabled}
                    onChange={(event) => updateDeliveryField('city', event.target.value)}
                  />
                  <Field
                    label={addressLabels.regionLabel}
                    value={deliveryData.region}
                    disabled={isDeliveryFieldsDisabled}
                    onChange={(event) => updateDeliveryField('region', event.target.value)}
                  />
                </div>

                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mt-8 mb-4">{t('shippingOptions')}</h3>
                <div className="space-y-3">
                  {shippingQuotesStatus === 'loading' && (
                    <div className="rounded-sm border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
                      {t('shippingRatesLoading')}
                    </div>
                  )}

                  {shippingQuotesStatus === 'error' && (
                    <div className="rounded-sm border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-600">
                      {shippingQuotesError || t('shippingRatesError')}
                    </div>
                  )}

                  {shippingQuotesStatus === 'ready' && mode === 'estimated' && quotes.length > 0 && (
                    <div className="rounded-sm border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                      {t('shippingRatesEstimated')}
                    </div>
                  )}

                  {shippingQuotesStatus === 'ready' && mode === 'live' && quotes.length > 0 && (
                    <div className="rounded-sm border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                      {t('shippingRatesLive')}
                    </div>
                  )}

                  {shippingQuotesStatus === 'ready' && quotes.length === 0 && (
                    <div className="rounded-sm border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-500">
                      {t('shippingRatesEmpty')}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleRefreshShipping}
                      disabled={!canRequestShippingQuotes || shippingQuotesStatus === 'loading'}
                      className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('shippingRefresh')}
                    </button>
                  </div>

                  {quotes.map((quote) => (
                    <div key={quote.id}>
                      <ShippingOption
                        title={quote.service}
                        subtitle={t('shippingDeliveryWindow', { min: quote.estimatedDaysMin, max: quote.estimatedDaysMax })}
                        price={quote.amount > 0 ? formatCurrency(quote.amount, quote.currency) : t('freeShipping')}
                        checked={selectedQuote?.id === quote.id}
                        onChange={() => setSelectedQuoteId(quote.id)}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="text-secondary/70 px-6 py-3 font-bold uppercase tracking-wider text-sm hover:text-secondary transition-colors">
                    {t('back')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSearchingPostalCode || !isDeliveryUnlocked || shippingQuotesStatus === 'loading' || !selectedQuote}
                    className="bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {t('goToPayment')}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="bg-white border border-neutral-200 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-neutral-900 mb-6 uppercase tracking-wider flex items-center border-b border-neutral-100 pb-4">
                  <span className="w-8">3.</span> {t('paymentTitle')}
                </h2>

                <div className="space-y-4 mb-8">
                  <label className="flex items-center p-4 border border-neutral-900 bg-neutral-50 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      className="text-neutral-900 focus:ring-neutral-900"
                      checked={selectedPaymentMethod === 'Cartao de credito'}
                      onChange={() => setSelectedPaymentMethod('Cartao de credito')}
                    />
                    <CreditCard className="w-5 h-5 ml-4 text-neutral-900" />
                    <span className="ml-3 font-bold text-sm uppercase tracking-wider text-neutral-900">{t('creditCard')}</span>
                  </label>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pl-8 pr-4">
                    <div className="md:col-span-2">
                      <Field label={t('cardNumber')} />
                    </div>
                    <div className="md:col-span-2">
                      <Field label={t('cardHolder')} />
                    </div>
                    <Field label={t('validity')} />
                    <Field label="CVV" />
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">{t('installments')}</label>
                      <select className="w-full border border-neutral-300 px-4 py-3 bg-white focus:outline-none focus:border-neutral-900 transition-colors text-sm">
                        <option>1x de {formatCurrency(cartTotal + shippingCost)}</option>
                        <option>2x de {formatCurrency((cartTotal + shippingCost) / 2)}</option>
                        <option>3x de {formatCurrency((cartTotal + shippingCost) / 3)}</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center p-4 border border-neutral-200 cursor-pointer hover:border-neutral-400">
                    <input
                      type="radio"
                      name="payment"
                      className="text-neutral-900 focus:ring-neutral-900"
                      checked={selectedPaymentMethod === 'Pix'}
                      onChange={() => setSelectedPaymentMethod('Pix')}
                    />
                    <div className="ml-4 font-bold text-sm uppercase tracking-wider text-neutral-500">{t('pixDiscount')}</div>
                  </label>
                </div>

                <div className="mt-8 flex justify-between flex-col-reverse sm:flex-row gap-4">
                  <button type="button" onClick={() => setStep(2)} className="text-secondary/70 px-6 py-3 font-bold uppercase tracking-wider text-sm hover:text-secondary transition-colors text-center">
                    {t('back')}
                  </button>
                  <button type="submit" className="bg-primary text-white px-8 py-4 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors shadow-lg rounded-sm">
                    {t('completeOrder')}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-neutral-50 p-6 border border-neutral-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mb-4 pb-4 border-b border-neutral-200">{t('purchaseSummary')}</h3>

            <div className="max-h-60 overflow-y-auto pr-2 mb-4 space-y-4">
              {cart.map((item) => (
                <div key={`${item.product.id}-${item.size}-${item.color}`} className="flex gap-4">
                  <StoreImage src={item.product.imagens[0]} alt="" className="w-16 h-20 object-cover bg-neutral-200" sizes="64px" />
                  <div className="flex-1">
                    <p className="text-xs font-bold text-neutral-900 line-clamp-1">{item.product.nome}</p>
                    <p className="text-[10px] text-neutral-500 mt-1 uppercase tracking-wider">{t('quantityShort')}: {item.quantity} | {item.size}</p>
                    <p className="text-xs font-bold text-neutral-900 mt-2">{formatCurrency((item.product.precoPromocional || item.product.preco) * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>

            <dl className="space-y-3 text-sm text-neutral-600 border-t border-neutral-200 pt-4 mb-4">
              <div className="flex justify-between">
                <dt>{t('subtotal')}</dt>
                <dd className="font-medium text-neutral-900">{formatCurrency(cartTotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt>{t('shipping')}</dt>
                <dd className="font-medium text-neutral-900">
                  {selectedQuote ? (shippingCost > 0 ? formatCurrency(shippingCost, selectedQuote.currency) : t('freeShipping')) : t('toCalculate')}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between font-bold text-lg text-neutral-900 border-t border-neutral-200 pt-4">
              <span>{t('total')}</span>
              <span>{formatCurrency(cartTotal + shippingCost)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type FieldProps = {
  disabled?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  label: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
  value?: string;
};

function Field({ label, type = 'text', required = true, value, onChange, disabled = false, inputMode, placeholder }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">{label}</label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        inputMode={inputMode}
        placeholder={placeholder}
        className={inputClass}
      />
    </div>
  );
}

function ShippingOption({ title, subtitle, price, checked = false, onChange }: { title: string; subtitle: string; price: string; checked?: boolean; onChange?: () => void }) {
  return (
    <label className="flex items-center p-4 border border-neutral-200 cursor-pointer hover:border-neutral-400 transition-colors">
      <input type="radio" name="shipping" className="text-neutral-900 focus:ring-neutral-900" checked={checked} onChange={onChange} />
      <div className="ml-4 flex-1 flex justify-between">
        <div>
          <span className="block text-sm font-bold text-neutral-900">{title}</span>
          <span className="block text-xs text-neutral-500 mt-1">{subtitle}</span>
        </div>
        <span className="text-sm font-medium">{price}</span>
      </div>
    </label>
  );
}
