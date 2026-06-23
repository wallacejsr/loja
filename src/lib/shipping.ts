import type { Product } from '../data/mockData';
import type { StoreSettings } from '../types/settings';
import type { AddressCountryCode } from './customerForm';

export type ShippingQuoteSource = 'estimated' | 'live';
export type ShippingServiceLevel = 'economy' | 'standard' | 'express';

export type ShippingQuote = {
  id: string;
  carrier: string;
  service: string;
  amount: number;
  currency: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  source: ShippingQuoteSource;
  level: ShippingServiceLevel;
};

export type ShippingQuoteRequest = {
  currency: string;
  origin: {
    country: AddressCountryCode;
    postalCode: string;
    city: string;
    region: string;
    street?: string;
    number?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  destination: {
    country: AddressCountryCode;
    postalCode: string;
    city?: string;
    region?: string;
    street?: string;
    number?: string;
    name?: string;
    phone?: string;
    email?: string;
  };
  subtotal: number;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    shippingWeightGrams?: number;
  }>;
  packageDefaults: {
    defaultProductWeightGrams: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
  freeShippingThreshold: number;
};

export type ShippingQuoteResponse = {
  mode: ShippingQuoteSource;
  quotes: ShippingQuote[];
};

type CartLikeItem = {
  product: Pick<Product, 'id' | 'nome' | 'preco' | 'precoPromocional' | 'shippingWeightGrams'>;
  quantity: number;
};

const COUNTRY_GROUPS: Record<string, { multiplier: number; surcharge: number; transitOffset: number }> = {
  US: { multiplier: 1, surcharge: 0, transitOffset: 0 },
  CA: { multiplier: 1.35, surcharge: 8, transitOffset: 1 },
  MX: { multiplier: 1.5, surcharge: 10, transitOffset: 2 },
  BR: { multiplier: 1.65, surcharge: 14, transitOffset: 3 },
  AR: { multiplier: 1.65, surcharge: 14, transitOffset: 3 },
  CL: { multiplier: 1.7, surcharge: 16, transitOffset: 3 },
  CO: { multiplier: 1.7, surcharge: 16, transitOffset: 3 },
  PE: { multiplier: 1.75, surcharge: 18, transitOffset: 4 },
  UY: { multiplier: 1.75, surcharge: 18, transitOffset: 4 },
  PY: { multiplier: 1.75, surcharge: 18, transitOffset: 4 },
  BO: { multiplier: 1.85, surcharge: 20, transitOffset: 4 },
  AU: { multiplier: 2.1, surcharge: 24, transitOffset: 5 },
  NZ: { multiplier: 2.15, surcharge: 26, transitOffset: 5 },
  JP: { multiplier: 2.05, surcharge: 22, transitOffset: 4 },
  KR: { multiplier: 2.05, surcharge: 22, transitOffset: 4 },
  CN: { multiplier: 2.1, surcharge: 24, transitOffset: 5 },
  GB: { multiplier: 1.95, surcharge: 20, transitOffset: 4 },
  IE: { multiplier: 1.95, surcharge: 20, transitOffset: 4 },
  FR: { multiplier: 1.9, surcharge: 18, transitOffset: 4 },
  DE: { multiplier: 1.9, surcharge: 18, transitOffset: 4 },
  IT: { multiplier: 1.95, surcharge: 20, transitOffset: 4 },
  ES: { multiplier: 1.9, surcharge: 18, transitOffset: 4 },
  PT: { multiplier: 1.9, surcharge: 18, transitOffset: 4 },
  NL: { multiplier: 1.9, surcharge: 18, transitOffset: 4 },
  BE: { multiplier: 1.9, surcharge: 18, transitOffset: 4 },
  IN: { multiplier: 2.15, surcharge: 25, transitOffset: 5 },
  ZA: { multiplier: 2.2, surcharge: 26, transitOffset: 6 },
  OTHER: { multiplier: 2.3, surcharge: 28, transitOffset: 6 },
};

const QUOTE_TEMPLATES: Array<{
  carrier: string;
  service: string;
  level: ShippingServiceLevel;
  baseRate: number;
  perHalfKg: number;
  minDays: number;
  maxDays: number;
}> = [
  { carrier: 'Estimated', service: 'Ground Economy', level: 'economy', baseRate: 12, perHalfKg: 3.5, minDays: 5, maxDays: 8 },
  { carrier: 'Estimated', service: 'Priority Standard', level: 'standard', baseRate: 18, perHalfKg: 5.25, minDays: 3, maxDays: 5 },
  { carrier: 'Estimated', service: 'Express Air', level: 'express', baseRate: 29, perHalfKg: 7.5, minDays: 2, maxDays: 3 },
];

function getCountryGroup(countryCode: AddressCountryCode) {
  return COUNTRY_GROUPS[countryCode] || COUNTRY_GROUPS.OTHER;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function getTotalWeightGrams(request: ShippingQuoteRequest) {
  const fallbackWeight = Math.max(100, request.packageDefaults.defaultProductWeightGrams || 500);
  return request.items.reduce(
    (total, item) => total + Math.max(50, item.shippingWeightGrams || fallbackWeight) * Math.max(1, item.quantity),
    0,
  );
}

export function createShippingQuoteRequest(
  items: CartLikeItem[],
  settings: StoreSettings,
  destination: ShippingQuoteRequest['destination'],
  subtotal: number,
): ShippingQuoteRequest {
  return {
    currency: settings.storeCurrency,
    origin: {
      country: settings.shippingOriginCountry,
      postalCode: settings.shippingOriginPostalCode,
      city: settings.shippingOriginCity,
      region: settings.shippingOriginRegion,
      street: settings.shippingOriginStreet,
      number: settings.shippingOriginNumber,
      name: settings.storeName,
      phone: settings.phone,
      email: settings.email,
    },
    destination,
    subtotal,
    items: items.map((item) => ({
      id: item.product.id,
      name: item.product.nome,
      quantity: item.quantity,
      unitPrice: item.product.precoPromocional || item.product.preco,
      shippingWeightGrams: item.product.shippingWeightGrams,
    })),
    packageDefaults: {
      defaultProductWeightGrams: settings.shippingDefaultProductWeightGrams,
      lengthCm: settings.shippingPackageLengthCm,
      widthCm: settings.shippingPackageWidthCm,
      heightCm: settings.shippingPackageHeightCm,
    },
    freeShippingThreshold: settings.shippingFreeThreshold,
  };
}

export function buildEstimatedShippingQuotes(request: ShippingQuoteRequest): ShippingQuote[] {
  const group = getCountryGroup(request.destination.country);
  const totalWeightKg = Math.max(0.25, getTotalWeightGrams(request) / 1000);
  const weightUnits = Math.max(1, Math.ceil(totalWeightKg / 0.5));
  const qualifiesForFreeShipping =
    request.freeShippingThreshold > 0 &&
    request.subtotal >= request.freeShippingThreshold &&
    request.origin.country === request.destination.country;

  return QUOTE_TEMPLATES.map((template, index) => {
    const amountBase =
      (template.baseRate + template.perHalfKg * weightUnits + group.surcharge) * group.multiplier;
    const amount = qualifiesForFreeShipping && index === 0 ? 0 : roundCurrency(amountBase);

    return {
      id: `${template.level}-${request.destination.country}`,
      carrier: template.carrier,
      service: template.service,
      amount,
      currency: request.currency,
      estimatedDaysMin: template.minDays + group.transitOffset,
      estimatedDaysMax: template.maxDays + group.transitOffset,
      source: 'estimated',
      level: template.level,
    };
  });
}

export async function requestShippingQuotes(request: ShippingQuoteRequest): Promise<ShippingQuoteResponse> {
  const liveShippingEnabled = import.meta.env.VITE_ENABLE_LIVE_SHIPPING !== 'false';

  if (liveShippingEnabled) {
    try {
      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ request }),
      });

      if (response.ok) {
        const data = (await response.json()) as ShippingQuoteResponse;
        if (Array.isArray(data?.quotes) && data.quotes.length > 0) {
          return data;
        }
      }
    } catch (error) {
      console.error('Falha ao buscar cotacoes ao vivo', error);
    }
  }

  return {
    mode: 'estimated',
    quotes: buildEstimatedShippingQuotes(request),
  };
}
