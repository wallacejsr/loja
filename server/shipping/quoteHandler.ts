import {
  buildEstimatedShippingQuotes,
  type ShippingQuote,
  type ShippingQuoteRequest,
  type ShippingQuoteResponse,
} from '../../src/lib/shipping.ts';

type BasicRequest = {
  body?: unknown;
  method?: string;
};

type BasicResponse = {
  json: (payload: unknown) => void;
  status: (code: number) => BasicResponse;
};

type ShippoLiveRate = {
  amount?: string;
  amount_local?: string;
  currency?: string;
  currency_local?: string;
  estimated_days?: number | null;
  provider?: string;
  servicelevel?: {
    name?: string;
    token?: string;
  };
  title?: string;
};

const REGION_REQUIRED_COUNTRIES = new Set(['AU', 'BR', 'CA', 'MX', 'US']);
const SHIPPO_API_URL = process.env.SHIPPO_API_URL || 'https://api.goshippo.com/live-rates';
const SHIPPO_API_VERSION = process.env.SHIPPO_API_VERSION || '2018-02-08';

function buildEstimatedResponse(request: ShippingQuoteRequest): ShippingQuoteResponse {
  return {
    mode: 'estimated',
    quotes: buildEstimatedShippingQuotes(request),
  };
}

function normalizeCurrency(code: string | undefined, fallback: string) {
  return String(code || fallback || 'USD').toUpperCase();
}

function requiresRegion(country: string) {
  return REGION_REQUIRED_COUNTRIES.has(country.toUpperCase());
}

function isAddressReady(address: ShippingQuoteRequest['origin'] | ShippingQuoteRequest['destination']) {
  if (!address.country || !address.postalCode || !address.city || !address.street) return false;
  if (requiresRegion(address.country) && !address.region) return false;
  return true;
}

function buildStreetLine(street?: string, number?: string) {
  const result = [street, number].filter(Boolean).join(' ').trim();
  return result || '';
}

function getTotalWeightGrams(request: ShippingQuoteRequest) {
  const fallbackWeight = Math.max(100, request.packageDefaults.defaultProductWeightGrams || 500);
  return request.items.reduce(
    (total, item) => total + Math.max(50, item.shippingWeightGrams || fallbackWeight) * Math.max(1, item.quantity),
    0,
  );
}

function inferLevel(title: string, estimatedDays?: number): ShippingQuote['level'] {
  const normalized = title.toLowerCase();
  if (/express|overnight|priority|next day|2-day|2 day/.test(normalized)) return 'express';
  if (/ground|economy|standard mail|parcel/.test(normalized)) return 'economy';
  if (estimatedDays !== undefined) {
    if (estimatedDays <= 2) return 'express';
    if (estimatedDays >= 6) return 'economy';
  }
  return 'standard';
}

function mapLiveQuote(rate: ShippoLiveRate, index: number, requestCurrency: string): ShippingQuote | null {
  const rawAmount = rate.amount_local || rate.amount;
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount)) return null;

  const currency = normalizeCurrency(rate.currency_local || rate.currency, requestCurrency);
  const estimatedDays = rate.estimated_days && rate.estimated_days > 0 ? Number(rate.estimated_days) : undefined;
  const service = rate.servicelevel?.name || rate.title || `${rate.provider || 'Shippo'} Shipping`;
  const level = inferLevel(service, estimatedDays);

  return {
    id: `shippo-${rate.servicelevel?.token || `${service}-${index}`}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
    carrier: rate.provider || 'Shippo',
    service,
    amount: Math.round(amount * 100) / 100,
    currency,
    estimatedDaysMin: estimatedDays || (level === 'express' ? 2 : level === 'economy' ? 6 : 4),
    estimatedDaysMax: estimatedDays ? estimatedDays + (estimatedDays <= 2 ? 1 : 2) : level === 'express' ? 3 : level === 'economy' ? 9 : 6,
    source: 'live',
    level,
  };
}

function buildShippoPayload(request: ShippingQuoteRequest) {
  const requestCurrency = normalizeCurrency(request.currency, 'USD');
  const parcelWeightGrams = Math.max(100, getTotalWeightGrams(request));

  return {
    async: false,
    address_from: {
      name: request.origin.name || 'Store Fulfillment',
      company: request.origin.name || 'Store Fulfillment',
      street1: request.origin.street || buildStreetLine(request.origin.street, request.origin.number),
      street_no: request.origin.number || '',
      city: request.origin.city,
      state: request.origin.region || '',
      zip: request.origin.postalCode,
      country: request.origin.country,
      phone: request.origin.phone || '',
      email: request.origin.email || '',
    },
    address_to: {
      name: request.destination.name || 'Customer',
      company: request.destination.name || 'Customer',
      street1: request.destination.street || buildStreetLine(request.destination.street, request.destination.number),
      street_no: request.destination.number || '',
      city: request.destination.city,
      state: request.destination.region || '',
      zip: request.destination.postalCode,
      country: request.destination.country,
      phone: request.destination.phone || '',
      email: request.destination.email || '',
    },
    parcel: {
      length: Math.max(1, request.packageDefaults.lengthCm || 30),
      width: Math.max(1, request.packageDefaults.widthCm || 24),
      height: Math.max(1, request.packageDefaults.heightCm || 6),
      distance_unit: 'cm',
      weight: parcelWeightGrams,
      mass_unit: 'g',
    },
    line_items: request.items.map((item) => ({
      title: item.name,
      quantity: Math.max(1, item.quantity),
      total_price: (item.unitPrice * Math.max(1, item.quantity)).toFixed(2),
      currency: requestCurrency,
      weight: Math.max(50, item.shippingWeightGrams || request.packageDefaults.defaultProductWeightGrams || 500),
      weight_unit: 'g',
      sku: item.id,
      manufacture_country: request.origin.country,
    })),
  };
}

export async function handleShippingQuoteRequest(request: BasicRequest, response: BasicResponse) {
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const payload = typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
    const shippingRequest = (payload as { request?: ShippingQuoteRequest } | undefined)?.request;

    if (!shippingRequest) {
      response.status(400).json({ error: 'Missing shipping quote request payload' });
      return;
    }

    const estimatedResponse = buildEstimatedResponse(shippingRequest);
    const shippoToken = process.env.SHIPPO_API_TOKEN?.trim();

    if (!shippoToken || !isAddressReady(shippingRequest.origin) || !isAddressReady(shippingRequest.destination)) {
      response.status(200).json(estimatedResponse);
      return;
    }

    const shippoResponse = await fetch(SHIPPO_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `ShippoToken ${shippoToken}`,
        'Content-Type': 'application/json',
        'Shippo-API-Version': SHIPPO_API_VERSION,
      },
      body: JSON.stringify(buildShippoPayload(shippingRequest)),
    });

    if (!shippoResponse.ok) {
      const errorBody = await shippoResponse.text();
      console.error('Shippo live-rates request failed', shippoResponse.status, errorBody);
      response.status(200).json(estimatedResponse);
      return;
    }

    const shippoData = (await shippoResponse.json()) as { results?: ShippoLiveRate[] };
    const requestedCurrency = normalizeCurrency(shippingRequest.currency, 'USD');
    const liveQuotes = (shippoData.results || [])
      .map((rate, index) => mapLiveQuote(rate, index, requestedCurrency))
      .filter((quote): quote is ShippingQuote => Boolean(quote))
      .filter((quote) => quote.currency === requestedCurrency)
      .sort((left, right) => left.amount - right.amount);

    if (liveQuotes.length === 0) {
      response.status(200).json(estimatedResponse);
      return;
    }

    response.status(200).json({
      mode: 'live',
      quotes: liveQuotes,
    } satisfies ShippingQuoteResponse);
  } catch (error) {
    console.error('Failed to create shipping quotes', error);
    response.status(500).json({ error: 'Could not calculate shipping quotes' });
  }
}
