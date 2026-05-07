import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { cn } from '../lib/utils';
import { useStorefront } from '../hooks/useStorefront';

export function Cart() {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const navigate = useNavigate();
  const { t, formatCurrency } = useStorefront();
  const [coupon, setCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponFeedback, setCouponFeedback] = useState('');
  const [zipcode, setZipcode] = useState('');
  const [shipping, setShipping] = useState(0);

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'BEMVINDA10') {
      setCouponDiscount(cartTotal * 0.1);
      setCouponFeedback(t('couponApplied'));
    } else {
      setCouponFeedback(t('invalidCoupon'));
      setCouponDiscount(0);
    }
  };

  const calculateShipping = () => {
    if (zipcode.length >= 8) {
      if (cartTotal > 199) {
        setShipping(0);
      } else {
        setShipping(25.9);
      }
    }
  };

  const finalTotal = cartTotal - couponDiscount + shipping;

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
                    <img src={item.product.imagens[0]} alt={item.product.nome} className="h-24 w-20 object-cover bg-neutral-100" />
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
                  {shipping > 0 ? formatCurrency(shipping) : shipping === 0 && zipcode ? t('freeShipping') : t('toCalculate')}
                </dd>
              </div>
            </dl>

            <div className="flex items-center justify-between font-bold text-lg text-neutral-900 mb-8">
              <span>{t('total')}</span>
              <span>{formatCurrency(finalTotal)}</span>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2">{t('simulateShipping')}</label>
              <div className="flex text-sm border border-neutral-300 focus-within:border-primary rounded-sm overflow-hidden">
                <input
                  type="text"
                  placeholder={t('zipcode')}
                  value={zipcode}
                  onChange={(e) => setZipcode(e.target.value)}
                  className="w-full px-3 py-2 bg-white focus:outline-none"
                />
                <button onClick={calculateShipping} className="bg-neutral-100 text-secondary px-4 py-2 font-medium uppercase tracking-wider hover:bg-neutral-200 transition-colors">
                  {t('calc')}
                </button>
              </div>
              {cartTotal > 199 && <p className="text-xs text-green-600 font-bold mt-2">{t('freeShippingReached')}</p>}
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
