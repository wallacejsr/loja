import type { AddressCountryCode } from '../lib/customerForm';

export type StoreCurrencyCode = 'AUD' | 'BRL' | 'CAD' | 'EUR' | 'GBP' | 'USD';
export type StripeMode = 'live' | 'test';

export interface StoreSettings {
  storeName: string;
  siteTitle: string;
  adminPanelName: string;
  siteLanguage: 'pt-BR' | 'en-US';
  allowBusinessRegistration: boolean;
  storeCurrency: StoreCurrencyCode;
  logoUrl: string;
  email: string;
  phone: string;
  phoneCountry: AddressCountryCode;
  instagram: string;
  facebook: string;
  tiktok: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  pointsPerReal: number;
  supportSalesPhone: string;
  supportSalesPhoneCountry: AddressCountryCode;
  supportSacPhone: string;
  supportSacPhoneCountry: AddressCountryCode;
  supportEmail: string;
  supportWeekHours: string;
  supportSaturdayHours: string;
  shippingOriginCountry: AddressCountryCode;
  shippingOriginPostalCode: string;
  shippingOriginCity: string;
  shippingOriginRegion: string;
  shippingOriginStreet: string;
  shippingOriginNumber: string;
  shippingFreeThreshold: number;
  shippingDefaultProductWeightGrams: number;
  shippingPackageLengthCm: number;
  shippingPackageWidthCm: number;
  shippingPackageHeightCm: number;
  stripeEnabled: boolean;
  stripeMode: StripeMode;
  stripeCurrency: StoreCurrencyCode;
  stripeAllowCard: boolean;
  stripeAllowApplePay: boolean;
  stripeAllowGooglePay: boolean;
  stripeSuccessUrl: string;
  stripeCancelUrl: string;
}

export function normalizeStoreSettings(settings: StoreSettings): StoreSettings {
  const isUnitedStatesStore =
    settings.shippingOriginCountry === 'US'
    && settings.siteLanguage === 'en-US';

  if (isUnitedStatesStore && settings.storeCurrency === 'BRL') {
    return {
      ...settings,
      storeCurrency: 'USD',
    };
  }

  return settings;
}

export const defaultSettings: StoreSettings = {
  storeName: 'ZENV Apparel',
  siteTitle: 'ZENV Apparel',
  adminPanelName: 'ZENV Admin',
  siteLanguage: 'en-US',
  allowBusinessRegistration: false,
  storeCurrency: 'USD',
  logoUrl: '',
  email: '',
  phone: '',
  phoneCountry: 'US',
  instagram: '',
  facebook: '',
  tiktok: '',
  description: 'Premium essentials with comfort, style and everyday versatility.',
  primaryColor: '#ba884b',
  secondaryColor: '#1a222b',
  pointsPerReal: 1,
  supportSalesPhone: '',
  supportSalesPhoneCountry: 'US',
  supportSacPhone: '',
  supportSacPhoneCountry: 'US',
  supportEmail: '',
  supportWeekHours: '',
  supportSaturdayHours: '',
  shippingOriginCountry: 'US',
  shippingOriginPostalCode: '73098',
  shippingOriginCity: 'Wynnewood',
  shippingOriginRegion: 'OK',
  shippingOriginStreet: '',
  shippingOriginNumber: '',
  shippingFreeThreshold: 199,
  shippingDefaultProductWeightGrams: 500,
  shippingPackageLengthCm: 30,
  shippingPackageWidthCm: 24,
  shippingPackageHeightCm: 6,
  stripeEnabled: false,
  stripeMode: 'test',
  stripeCurrency: 'USD',
  stripeAllowCard: true,
  stripeAllowApplePay: false,
  stripeAllowGooglePay: false,
  stripeSuccessUrl: '/checkout/success?session_id={CHECKOUT_SESSION_ID}',
  stripeCancelUrl: '/cart',
};
