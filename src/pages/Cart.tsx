import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import {
  type GuestShippingDraft,
  useCustomerSession,
} from '../context/CustomerSessionContext';
import { cn } from '../lib/utils';
import { useStorefront } from '../hooks/useStorefront';
import { useSettings } from '../hooks/useSettings';
import { useShippingQuotes } from '../hooks/useShippingQuotes';
import {
  formatPostalCode,
  getAddressLabels,
  isAddressLookupComplete,
  lookupAddressByCountry,
  type AddressCountryCode,
} from '../lib/customerForm';
import { StoreImage } from '../components/StoreImage';

type ShippingPostalTone = 'error' | 'idle' | 'loading' | 'success' | 'warning';

const CART_COUNTRY: AddressCountryCode = 'US';
const EMPTY_GUEST_SHIPPING_ADDRESS: GuestShippingDraft = {
  country: CART_COUNTRY,
  postalCode: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  region: '',
};

export function Cart() {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const { locale, t, formatCurrency } = useStorefront();
  const {
    currentCustomer,
    primaryAddress,
    isLoggedIn,
    guestShippingDraft,
    saveGuestShippingDraft,
    clearGuestShippingDraft,
  } = useCustomerSession();
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponFeedback, setCouponFeedback] = useState('');
  const [guestShippingAddress, setGuestShippingAddress] = useState<GuestShippingDraft>(
    () => guestShippingDraft || EMPTY_GUEST_SHIPPING_ADDRESS,
  );
  const [shippingPostalTone, setShippingPostalTone] = useState<ShippingPostalTone>(
    guestShippingDraft?.postalCode ? 'success' : 'idle',
  );
  const [isGuestAddressUnlocked, setIsGuestAddressUnlocked] = useState(
    () => Boolean(guestShippingDraft?.postalCode),
  );
  const addressLabels = getAddressLabels(CART_COUNTRY, locale);
  const { quotes, selectedQuote, setSelectedQuoteId, loadQuotes, mode, status, error, resetQuotes } = useShippingQuotes(
    cart,
    Math.max(0, cartTotal - couponDiscount),
    settings,
  );

  const usingSavedAddress = Boolean(isLoggedIn && primaryAddress);
  const activeSavedAddressReady = Boolean(
    primaryAddress?.postalCode && primaryAddress?.street && primaryAddress?.city && primaryAddress?.region,
  );
  const guestAddressReady = Boolean(
    isAddressLookupComplete(CART_COUNTRY, guestShippingAddress.postalCode)
      && guestShippingAddress.street.trim()
      && guestShippingAddress.city.trim()
      && guestShippingAddress.region.trim(),
  );
  const canCalculateShipping = usingSavedAddress ? activeSavedAddressReady : guestAddressReady;
  const guestDraftIsEmpty = useMemo(
    () =>
      [
        guestShippingAddress.postalCode,
        guestShippingAddress.street,
        guestShippingAddress.number,
        guestShippingAddress.complement,
        guestShippingAddress.neighborhood,
        guestShippingAddress.city,
        guestShippingAddress.region,
      ].every((value) => value.trim().length === 0),
    [guestShippingAddress],
  );

  useEffect(() => {
    if (usingSavedAddress) {
      setShippingPostalTone(activeSavedAddressReady ? 'success' : 'warning');
      return;
    }

    if (guestDraftIsEmpty) {
      clearGuestShippingDraft();
      return;
    }

    saveGuestShippingDraft(guestShippingAddress);
  }, [
    activeSavedAddressReady,
    clearGuestShippingDraft,
    guestDraftIsEmpty,
    guestShippingAddress,
    saveGuestShippingDraft,
    usingSavedAddress,
  ]);

  useEffect(() => {
    if (!usingSavedAddress || !primaryAddress || !activeSavedAddressReady) return;

    void loadQuotes({
      country: primaryAddress.country,
      postalCode: primaryAddress.postalCode,
      street: primaryAddress.street,
      number: primaryAddress.number,
      city: primaryAddress.city,
      region: primaryAddress.region,
      name: currentCustomer?.fullName,
      phone: currentCustomer?.phone,
      email: currentCustomer?.email,
    });
  }, [
    activeSavedAddressReady,
    currentCustomer?.email,
    currentCustomer?.fullName,
    currentCustomer?.phone,
    loadQuotes,
    primaryAddress,
    usingSavedAddress,
  ]);

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'BEMVINDA10') {
      setCouponDiscount(cartTotal * 0.1);
      setCouponFeedback(t('couponApplied'));
    } else {
      setCouponFeedback(t('invalidCoupon'));
      setCouponDiscount(0);
    }
  };

  const handleGuestShippingFieldChange = <K extends keyof GuestShippingDraft>(
    field: K,
    value: GuestShippingDraft[K],
  ) => {
    resetQuotes();
    setGuestShippingAddress((previousAddress) => ({
      ...previousAddress,
      [field]: value,
    }));
  };

  const handleGuestPostalCodeChange = async (rawValue: string) => {
    const formattedPostalCode = formatPostalCode(rawValue, CART_COUNTRY);

    setGuestShippingAddress((previousAddress) => ({
      ...previousAddress,
      postalCode: formattedPostalCode,
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      region: '',
    }));
    setIsGuestAddressUnlocked(false);
    setShippingPostalTone('idle');
    resetQuotes();

    if (!isAddressLookupComplete(CART_COUNTRY, formattedPostalCode)) {
      return;
    }

    setShippingPostalTone('loading');

    try {
      const result = await lookupAddressByCountry(CART_COUNTRY, formattedPostalCode);

      if (!result) {
        setShippingPostalTone('warning');
        return;
      }

      setGuestShippingAddress((previousAddress) => ({
        ...previousAddress,
        postalCode: result.postalCode || formattedPostalCode,
        neighborhood: result.neighborhood || previousAddress.neighborhood,
        city: result.city || previousAddress.city,
        region: result.region || previousAddress.region,
      }));
      setIsGuestAddressUnlocked(true);
      setShippingPostalTone('success');
    } catch (nextError) {
      console.error('Falha ao validar ZIP Code antes do frete', nextError);
      setShippingPostalTone('error');
    }
  };

  const calculateShipping = async () => {
    if (!canCalculateShipping) return;

    if (usingSavedAddress && primaryAddress) {
      await loadQuotes({
        country: primaryAddress.country,
        postalCode: primaryAddress.postalCode,
        street: primaryAddress.street,
        number: primaryAddress.number,
        city: primaryAddress.city,
        region: primaryAddress.region,
        name: currentCustomer?.fullName,
        phone: currentCustomer?.phone,
        email: currentCustomer?.email,
      });
      return;
    }

    const destination = {
      country: CART_COUNTRY,
      postalCode: guestShippingAddress.postalCode,
      street: guestShippingAddress.street,
      number: guestShippingAddress.number,
      city: guestShippingAddress.city,
      region: guestShippingAddress.region,
      name: currentCustomer?.fullName,
      phone: currentCustomer?.phone,
      email: currentCustomer?.email,
    };

    await loadQuotes(destination);
  };

  const shippingAmount = selectedQuote?.amount ?? 0;
  const finalTotal = cartTotal - couponDiscount + shippingAmount;

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
        <div className="w-20 h-20 bg-neutral-100 rounded-full flex items-center justify-center mb-6">
          <ShoppingBag className="w-8 h-8 text-neutral-400" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-secondary mb-4">{t('emptyCartTitle')}</h2>
        <p className="text-neutral-500 mb-8 max-w-sm">{t('emptyCartSubtitle')}</p>
        <Link to="/catalog" className="bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm">
          {t('continueShopping')}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
      <h1 className="text-3xl font-serif font-bold text-neutral-900 mb-10 border-b border-neutral-200 pb-4">{t('shoppingBag')}</h1>

      <div className="lg:grid lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-8">
          <div className="hidden sm:grid grid-cols-12 gap-4 text-xs font-bold uppercase tracking-wider text-neutral-500 mb-4 border-b border-neutral-200 pb-2">
            <div className="col-span-6">{t('product')}</div>
            <div className="col-span-2 text-center">{t('price')}</div>
            <div className="col-span-2 text-center">{t('quantityShort')}</div>
            <div className="col-span-2 text-right">{t('total')}</div>
          </div>

          <ul className="divide-y divide-neutral-200 border-b border-neutral-200 lg:border-b-0 mb-8 lg:mb-0">
            {cart.map((item) => {
              const unitPrice = item.product.precoPromocional || item.product.preco;
              const itemTotal = unitPrice * item.quantity;

              return (
                <li key={`${item.product.id}-${item.size}-${item.color}`} className="py-6 flex flex-col sm:flex-row sm:items-center">
                  <div className="flex items-center sm:w-1/2">
                    <StoreImage src={item.product.imagens[0]} alt={item.product.nome} className="h-24 w-20 object-cover bg-neutral-100" sizes="80px" />
                    <div className="ml-4 flex-1">
                      <Link to={`/product/${item.product.id}`} className="text-sm font-bold text-neutral-900 hover:underline">
                        {item.product.nome}
                      </Link>
                      <p className="mt-1 text-xs text-neutral-500 uppercase tracking-wider">
                        {t('colorLabel')}: {item.color} | {t('sizeLabel')}: {item.size}
                      </p>
                      <div className="mt-2 sm:hidden text-sm font-bold text-neutral-900">{formatCurrency(unitPrice)}</div>
                    </div>
                  </div>

                  <div className="hidden sm:block sm:w-1/6 text-center text-sm font-medium text-neutral-900">
                    {formatCurrency(unitPrice)}
                  </div>

                  <div className="mt-4 sm:mt-0 flex items-center justify-between sm:w-2/6 sm:justify-end">
                    <div className="flex items-center border border-neutral-300 mr-4 sm:mr-8">
                      <button onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity - 1)} className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.size, item.color, item.quantity + 1)} className="p-2 text-neutral-500 hover:text-neutral-900 transition-colors">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="text-sm font-bold text-neutral-900 mb-2">{formatCurrency(itemTotal)}</span>
                      <button onClick={() => removeFromCart(item.product.id, item.size, item.color)} className="text-xs text-neutral-500 hover:text-red-500 flex items-center transition-colors uppercase tracking-wider font-medium">
                        <Trash2 className="w-3 h-3 mr-1" /> {t('remove')}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="lg:col-span-4">
          <div className="bg-neutral-50 p-6 sm:p-8">
            <h2 className="text-lg font-bold text-neutral-900 mb-6 uppercase tracking-wider border-b border-neutral-200 pb-4">{t('orderSummary')}</h2>

            <dl className="space-y-4 text-sm text-neutral-600 mb-6 border-b border-neutral-200 pb-6">
              <div className="flex justify-between">
                <dt>{t('subtotal')}</dt>
                <dd className="font-medium text-neutral-900">{formatCurrency(cartTotal)}</dd>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-600">
                  <dt>{t('discount')}</dt>
                  <dd className="font-medium">- {formatCurrency(couponDiscount)}</dd>
                </div>
              )}

              <div className="flex justify-between">
                <dt>{t('shipping')}</dt>
                <dd className="font-medium text-neutral-900">
                  {selectedQuote ? (shippingAmount > 0 ? formatCurrency(shippingAmount, selectedQuote.currency) : t('freeShipping')) : t('toCalculate')}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between font-bold text-lg text-neutral-900 mb-8">
              <span>{t('total')}</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('simulateShipping')}</label>
              <div className="grid gap-3">
                {usingSavedAddress && primaryAddress ? (
                  <div className="rounded-sm border border-neutral-200 bg-white p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{t('savedShippingAddress')}</p>
                        <p className="mt-2 text-sm font-semibold text-neutral-900">{primaryAddress.label || t('homeAddress')}</p>
                        <p className="mt-1 text-sm text-neutral-600">{primaryAddress.street}, {primaryAddress.number}</p>
                        <p className="text-sm text-neutral-600">{primaryAddress.city} - {primaryAddress.region}</p>
                        <p className="text-sm text-neutral-600">{addressLabels.postalCodeLabel}: {primaryAddress.postalCode}</p>
                      </div>
                      <Link to="/account" className="shrink-0 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary-dark">
                        {t('edit')}
                      </Link>
                    </div>
                    <p className="mt-3 text-[11px] font-medium text-emerald-600">{t('shippingUsingSavedAddress')}</p>
                  </div>
                ) : (
                  <div className="rounded-sm border border-neutral-200 bg-white p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{t('guestShippingAddress')}</p>
                        <p className="mt-1 text-xs text-neutral-500">{t('signInForSavedAddress')}</p>
                        {isLoggedIn && !primaryAddress ? (
                          <p className="mt-1 text-xs text-amber-600">{t('shippingAddressEmpty')}</p>
                        ) : null}
                      </div>
                      <Link to="/account" className="shrink-0 text-xs font-bold uppercase tracking-wider text-primary hover:text-primary-dark">
                        {isLoggedIn ? t('myAddresses') : t('login')}
                      </Link>
                    </div>

                    <p className="text-[11px] text-neutral-500">{t('usOnlyShippingHint')}</p>

                    <div className="flex text-sm border border-neutral-300 focus-within:border-primary rounded-sm overflow-hidden">
                      <input
                        type="text"
                        placeholder={addressLabels.postalCodeLabel}
                        value={guestShippingAddress.postalCode}
                        onChange={(e) => void handleGuestPostalCodeChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white focus:outline-none"
                        inputMode="numeric"
                      />
                      <button
                        onClick={calculateShipping}
                        disabled={!guestAddressReady || status === 'loading'}
                        className="bg-neutral-100 text-secondary px-4 py-2 font-medium uppercase tracking-wider hover:bg-neutral-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {status === 'loading' ? '...' : t('calc')}
                      </button>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        placeholder={t('street')}
                        value={guestShippingAddress.street}
                        disabled={!isGuestAddressUnlocked}
                        onChange={(e) => handleGuestShippingFieldChange('street', e.target.value)}
                        className="w-full border border-neutral-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:border-primary rounded-sm disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        placeholder={t('number')}
                        value={guestShippingAddress.number}
                        disabled={!isGuestAddressUnlocked}
                        onChange={(e) => handleGuestShippingFieldChange('number', e.target.value)}
                        className="w-full border border-neutral-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:border-primary rounded-sm disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        placeholder={t('city')}
                        value={guestShippingAddress.city}
                        disabled={!isGuestAddressUnlocked}
                        onChange={(e) => handleGuestShippingFieldChange('city', e.target.value)}
                        className="w-full border border-neutral-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:border-primary rounded-sm disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed"
                      />
                      <input
                        type="text"
                        placeholder={addressLabels.regionLabel}
                        value={guestShippingAddress.region}
                        disabled={!isGuestAddressUnlocked}
                        onChange={(e) => handleGuestShippingFieldChange('region', e.target.value)}
                        className="w-full border border-neutral-300 px-3 py-2 text-sm transition-colors focus:outline-none focus:border-primary rounded-sm disabled:bg-neutral-100 disabled:text-neutral-400 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                )}
              </div>

              {shippingPostalTone === 'loading' && <p className="text-xs text-neutral-500 mt-2">{t('postalLookupLoading')}</p>}
              {shippingPostalTone === 'warning' && <p className="text-xs text-red-600 mt-2">{t('postalLookupNotFound')}</p>}
              {shippingPostalTone === 'error' && <p className="text-xs text-red-600 mt-2">{t('postalLookupError')}</p>}
              {status === 'loading' && <p className="text-xs text-neutral-500 mt-2">{t('shippingRatesLoading')}</p>}
              {status === 'error' && <p className="text-xs text-red-600 mt-2">{error || t('shippingRatesError')}</p>}
              {status === 'ready' && quotes.length === 0 && <p className="text-xs text-neutral-500 mt-2">{t('shippingRatesEmpty')}</p>}
              {status === 'ready' && quotes.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className={cn('text-xs font-medium', mode === 'live' ? 'text-emerald-600' : 'text-neutral-500')}>
                    {mode === 'live' ? t('shippingRatesLive') : t('shippingRatesEstimated')}
                  </p>
                  <div className="space-y-2">
                    {quotes.map((quote) => (
                      <label key={quote.id} className="flex items-center gap-3 rounded-sm border border-neutral-200 bg-white px-3 py-3 cursor-pointer hover:border-neutral-400 transition-colors">
                        <input
                          type="radio"
                          name="cart-shipping-quote"
                          checked={selectedQuote?.id === quote.id}
                          onChange={() => setSelectedQuoteId(quote.id)}
                          className="text-neutral-900 focus:ring-neutral-900"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-neutral-900">{quote.service}</span>
                            <span className="text-sm font-semibold text-neutral-900">{quote.amount > 0 ? formatCurrency(quote.amount, quote.currency) : t('freeShipping')}</span>
                          </div>
                          <p className="text-xs text-neutral-500 mt-1">{t('shippingDeliveryWindow', { min: quote.estimatedDaysMin, max: quote.estimatedDaysMax })}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {settings.shippingFreeThreshold > 0 && cartTotal >= settings.shippingFreeThreshold && (
                <p className="text-xs text-green-600 font-bold mt-2">{t('freeShippingReached')}</p>
              )}
            </div>

            <div className="mb-8 border-t border-neutral-200 pt-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('discountCoupon')}</label>
              <div className="flex text-sm border border-neutral-300 focus-within:border-primary rounded-sm overflow-hidden">
                <input
                  type="text"
                  placeholder={t('code')}
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  className="w-full px-3 py-2 bg-white focus:outline-none uppercase"
                />
                <button onClick={applyCoupon} className="bg-neutral-100 text-secondary px-4 py-2 font-medium uppercase tracking-wider hover:bg-neutral-200 transition-colors">
                  {t('apply')}
                </button>
              </div>
              {couponFeedback && (
                <p className={cn('mt-2 text-xs font-semibold', couponDiscount > 0 ? 'text-emerald-600' : 'text-red-600')}>
                  {couponFeedback}
                </p>
              )}
            </div>

            <button onClick={() => navigate('/checkout')} className="w-full flex items-center justify-center bg-primary text-white px-8 py-4 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors shadow-lg rounded-sm">
              {t('finishPurchase')} <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <div className="mt-4 text-center">
              <Link to="/catalog" className="text-xs text-secondary/70 underline font-medium hover:text-primary transition-colors uppercase tracking-wider">
                {t('orContinueShopping')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
