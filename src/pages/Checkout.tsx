import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { CheckCircle, CreditCard } from 'lucide-react';
import { useLoyalty } from '../hooks/useLoyalty';
import { useSettings } from '../hooks/useSettings';
import { useStorefront } from '../hooks/useStorefront';

export function Checkout() {
  const { cart, cartTotal } = useCart();
  const navigate = useNavigate();
  const { addPoints } = useLoyalty();
  const { settings } = useSettings();
  const { t, formatCurrency } = useStorefront();
  const [step, setStep] = useState(1);
  const orderNumber = useMemo(() => `#SD${Math.floor(Math.random() * 100000)}`, []);

  if (cart.length === 0 && step !== 4) {
    navigate('/cart');
    return null;
  }

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 3) {
      addPoints(Math.floor(cartTotal * (settings.pointsPerReal || 1)));
    }
    setStep(step + 1);
  };

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

  const shippingCost = step >= 2 ? 25.9 : 0;

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
                  <Field label={t('fullName')} />
                  <div className="md:col-span-2 hidden" />
                  <Field label={t('cpf')} />
                  <Field label={t('contactPhone')} />
                  <div className="md:col-span-2">
                    <Field label={t('contactEmail')} type="email" />
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
                  <Field label={t('zipcode')} />
                  <div className="hidden md:block" />
                  <div className="md:col-span-2">
                    <Field label={t('avenue')} />
                  </div>
                  <Field label={t('number')} />
                  <Field label={t('complement')} required={false} />
                  <Field label={t('neighborhood')} />
                  <Field label={t('city')} />
                </div>

                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-900 mt-8 mb-4">{t('shippingOptions')}</h3>
                <div className="space-y-3">
                  <ShippingOption title="Correios - PAC" subtitle={t('businessDays7')} price={formatCurrency(25.9)} defaultChecked />
                  <ShippingOption title="Correios - SEDEX" subtitle={t('businessDays3')} price={formatCurrency(45.9)} />
                </div>

                <div className="mt-8 flex justify-between">
                  <button type="button" onClick={() => setStep(1)} className="text-secondary/70 px-6 py-3 font-bold uppercase tracking-wider text-sm hover:text-secondary transition-colors">
                    {t('back')}
                  </button>
                  <button type="submit" className="bg-primary text-white px-8 py-3 font-bold uppercase tracking-wider text-sm hover:bg-primary-dark transition-colors rounded-sm">
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
                    <input type="radio" name="payment" className="text-neutral-900 focus:ring-neutral-900" defaultChecked />
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
                        <option>1x de {formatCurrency(cartTotal + 25.9)}</option>
                        <option>2x de {formatCurrency((cartTotal + 25.9) / 2)}</option>
                        <option>3x de {formatCurrency((cartTotal + 25.9) / 3)}</option>
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center p-4 border border-neutral-200 cursor-pointer hover:border-neutral-400">
                    <input type="radio" name="payment" className="text-neutral-900 focus:ring-neutral-900" />
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
                  <img src={item.product.imagens[0]} alt="" className="w-16 h-20 object-cover bg-neutral-200" />
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
                <dd className="font-medium text-neutral-900">{step >= 2 ? formatCurrency(25.9) : t('toCalculate')}</dd>
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

function Field({ label, type = 'text', required = true }: { label: string; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">{label}</label>
      <input required={required} type={type} className="w-full border border-neutral-300 px-4 py-3 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 transition-colors" />
    </div>
  );
}

function ShippingOption({ title, subtitle, price, defaultChecked = false }: { title: string; subtitle: string; price: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center p-4 border border-neutral-200 cursor-pointer hover:border-neutral-400 transition-colors">
      <input type="radio" name="shipping" className="text-neutral-900 focus:ring-neutral-900" defaultChecked={defaultChecked} />
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
