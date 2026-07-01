import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveStripeSecretKey as resolveStoredStripeSecretKey } from './runtime.js';
import { persistStripeCheckoutDraft } from './tracking.js';

type StripeMode = 'live' | 'test';

type CheckoutItemPayload = {
  color?: string;
  id: string;
  name: string;
  quantity: number;
  size?: string;
  unitPrice: number;
};

type CheckoutCustomerPayload = {
  cpf?: string;
  documentLabel?: string;
  email: string;
  name: string;
  phone: string;
  phoneCountry?: string;
};

type CheckoutShippingAddressPayload = {
  city: string;
  complement?: string;
  country: string;
  neighborhood: string;
  number: string;
  postalCode: string;
  region: string;
  street: string;
};

type CheckoutSessionRequestBody = {
  customer: CheckoutCustomerPayload;
  discount: number;
  items: CheckoutItemPayload[];
  orderNumber: string;
  settings: {
    storeName?: string;
    stripeAllowApplePay: boolean;
    stripeAllowCard: boolean;
    stripeAllowGooglePay: boolean;
    stripeCancelUrl: string;
    stripeCurrency: string;
    stripeEnabled: boolean;
    stripeMode: StripeMode;
    stripeSuccessUrl: string;
  };
  shipping: number;
  shippingAddress: CheckoutShippingAddressPayload;
  shippingMethod?: string;
  subtotal: number;
};

type StripeSessionResponse = {
  id: string;
  url: string;
};

type StripeCouponResponse = {
  id: string;
};

type StoreProductRecord = {
  id: string;
  images: string[];
  name: string;
  unitPrice: number;
};

type VercelRequestLike = {
  body?: CheckoutSessionRequestBody;
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
};

type VercelResponseLike = {
  json: (payload: unknown) => void;
  status: (code: number) => VercelResponseLike;
};

let cachedSupabaseClient: SupabaseClient | null = null;

function getHeaderValue(headers: VercelRequestLike['headers'], key: string) {
  const value = headers?.[key] ?? headers?.[key.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

function getRequestOrigin(request: VercelRequestLike) {
  const forwardedProto = getHeaderValue(request.headers, 'x-forwarded-proto');
  const forwardedHost = getHeaderValue(request.headers, 'x-forwarded-host');
  const host = forwardedHost || getHeaderValue(request.headers, 'host');

  if (host) {
    return `${forwardedProto || 'https'}://${host}`;
  }

  return 'http://127.0.0.1:3000';
}

function resolveStoreBackend() {
  const explicitBackend = process.env.STORE_DATA_BACKEND?.trim()
    || process.env.VITE_STORE_BACKEND?.trim();

  if (explicitBackend === 'rest' || explicitBackend === 'supabase' || explicitBackend === 'local') {
    return explicitBackend;
  }

  if (process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim()) {
    return 'supabase';
  }

  return 'local';
}

function getStoreApiBaseUrl(request: VercelRequestLike) {
  const configuredBaseUrl = process.env.STORE_API_URL?.trim()
    || process.env.STORE_API_BASE_URL?.trim()
    || process.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  return `${getRequestOrigin(request)}/api/store`;
}

function getSupabaseUrl() {
  return process.env.SUPABASE_URL?.trim()
    || process.env.VITE_SUPABASE_URL?.trim()
    || '';
}

function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_ANON_KEY?.trim()
    || process.env.VITE_SUPABASE_ANON_KEY?.trim()
    || '';
}

function getSupabaseServerClient() {
  if (cachedSupabaseClient) {
    return cachedSupabaseClient;
  }

  const url = getSupabaseUrl();
  const key = getSupabaseKey();

  if (!url || !key) {
    throw new Error('Supabase server envs are missing for Stripe checkout product lookup.');
  }

  cachedSupabaseClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedSupabaseClient;
}

function resolvePublicImageUrl(origin: string, image: string | undefined) {
  if (!image?.trim()) {
    return '';
  }

  try {
    return new URL(image, origin).toString();
  } catch {
    return '';
  }
}

function appendCheckoutQuery(urlValue: string, request: VercelRequestLike, orderNumber: string) {
  const origin = getRequestOrigin(request);
  const baseUrl = urlValue?.trim() ? new URL(urlValue, origin) : new URL('/checkout/success', origin);

  baseUrl.searchParams.set('session_id', '{CHECKOUT_SESSION_ID}');
  baseUrl.searchParams.set('order_number', orderNumber);
  baseUrl.searchParams.set('provider', 'stripe');

  return baseUrl.toString();
}

function normalizeCancelUrl(urlValue: string, request: VercelRequestLike) {
  const origin = getRequestOrigin(request);
  return new URL(urlValue?.trim() || '/cart', origin).toString();
}

function sanitizeCurrency(currency: string) {
  return currency.trim().toLowerCase();
}

function toStripeAmount(value: number) {
  return Math.round(value * 100);
}

function buildVariantDescription(item: CheckoutItemPayload) {
  const parts = [
    item.size ? `Size: ${item.size}` : '',
    item.color ? `Color: ${item.color}` : '',
  ].filter(Boolean);

  return parts.join(' | ');
}

async function fetchProductsFromRest(request: VercelRequestLike, ids: string[]): Promise<StoreProductRecord[]> {
  const baseUrl = getStoreApiBaseUrl(request);
  const response = await fetch(`${baseUrl}/products?onlyActive=1`, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch products from store API (${response.status}).`);
  }

  const products = await response.json() as Array<{
    id: string;
    imagens?: string[];
    nome: string;
    preco: number;
    precoPromocional?: number;
  }>;

  return products
    .filter((product) => ids.includes(String(product.id)))
    .map((product) => ({
      id: String(product.id),
      name: product.nome,
      unitPrice: Number(product.precoPromocional ?? product.preco ?? 0),
      images: Array.isArray(product.imagens) ? product.imagens : [],
    }));
}

async function fetchProductsFromSupabase(ids: string[]): Promise<StoreProductRecord[]> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, nome, preco, preco_promocional, imagens, status')
    .eq('status', 'Ativo')
    .in('id', ids);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((product: any) => ({
    id: String(product.id),
    name: product.nome,
    unitPrice: Number(product.preco_promocional ?? product.preco ?? 0),
    images: Array.isArray(product.imagens) ? product.imagens : [],
  }));
}

async function resolveServerProducts(request: VercelRequestLike, items: CheckoutItemPayload[]) {
  const ids = [...new Set(items.map((item) => String(item.id).trim()).filter(Boolean))];
  const backend = resolveStoreBackend();

  if (ids.length === 0) {
    return {
      source: 'client' as const,
      products: [] as StoreProductRecord[],
    };
  }

  if (backend === 'rest') {
    return {
      source: 'rest' as const,
      products: await fetchProductsFromRest(request, ids),
    };
  }

  if (backend === 'supabase') {
    return {
      source: 'supabase' as const,
      products: await fetchProductsFromSupabase(ids),
    };
  }

  return {
    source: 'client' as const,
    products: [],
  };
}

function validateRequestBody(body: CheckoutSessionRequestBody | undefined) {
  if (!body) {
    throw new Error('Missing checkout payload.');
  }

  if (!body.settings?.stripeEnabled) {
    throw new Error('Stripe is disabled in store settings.');
  }

  if (!body.customer?.email?.trim() || !body.customer?.name?.trim()) {
    throw new Error('Customer name and email are required.');
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error('Your cart is empty.');
  }

  if (body.shippingAddress.country !== 'US') {
    throw new Error('Stripe checkout is currently limited to shipping addresses in the United States.');
  }

  if (!Number.isFinite(body.discount) || body.discount < 0) {
    throw new Error('Invalid discount amount sent to Stripe checkout.');
  }

  if (body.discount > body.subtotal) {
    throw new Error('Discount amount cannot exceed the order subtotal.');
  }

  const hasSupportedMethod =
    body.settings.stripeAllowCard
    || body.settings.stripeAllowApplePay
    || body.settings.stripeAllowGooglePay;

  if (!hasSupportedMethod) {
    throw new Error('Enable at least one Stripe payment method before starting checkout.');
  }
}

function buildLineItems(
  request: VercelRequestLike,
  body: CheckoutSessionRequestBody,
  resolvedProducts: StoreProductRecord[],
) {
  const origin = getRequestOrigin(request);
  const productMap = new Map(resolvedProducts.map((product) => [product.id, product]));
  const usingVerifiedCatalog = resolvedProducts.length > 0;

  if (usingVerifiedCatalog && resolvedProducts.length !== new Set(body.items.map((item) => item.id)).size) {
    throw new Error('One or more products are no longer available for checkout.');
  }

  const productLineItems = body.items.map((item) => {
    const catalogProduct = productMap.get(item.id);
    const unitPrice = usingVerifiedCatalog
      ? catalogProduct?.unitPrice ?? 0
      : Number(item.unitPrice || 0);
    const productName = catalogProduct?.name || item.name;
    const variantDescription = buildVariantDescription(item);
    const productImage = resolvePublicImageUrl(origin, catalogProduct?.images?.[0]);

    if (!productName.trim() || unitPrice <= 0 || item.quantity <= 0) {
      throw new Error('Invalid product data sent to Stripe checkout.');
    }

    return {
      description: variantDescription,
      image: productImage,
      name: productName,
      quantity: Math.max(1, Math.floor(item.quantity)),
      unitAmount: toStripeAmount(unitPrice),
    };
  });

  if (body.shipping > 0) {
    productLineItems.push({
      description: body.shippingMethod ? `Carrier service: ${body.shippingMethod}` : 'Shipping charge',
      image: '',
      name: body.shippingMethod ? `Shipping - ${body.shippingMethod}` : 'Shipping',
      quantity: 1,
      unitAmount: toStripeAmount(body.shipping),
    });
  }

  return productLineItems;
}

function buildStripeCheckoutParams(
  request: VercelRequestLike,
  body: CheckoutSessionRequestBody,
  lineItems: ReturnType<typeof buildLineItems>,
  couponId?: string,
) {
  const params = new URLSearchParams();
  const currency = sanitizeCurrency(body.settings.stripeCurrency || 'USD');
  const mode = body.settings.stripeMode === 'live' ? 'live' : 'test';

  params.set('mode', 'payment');
  params.set('success_url', appendCheckoutQuery(body.settings.stripeSuccessUrl, request, body.orderNumber));
  params.set('cancel_url', normalizeCancelUrl(body.settings.stripeCancelUrl, request));
  params.set('billing_address_collection', 'required');
  params.set('phone_number_collection[enabled]', 'true');
  params.set('client_reference_id', body.orderNumber.replace(/[^a-zA-Z0-9_-]/g, ''));
  params.set('customer_email', body.customer.email.trim());
  params.set('payment_method_types[0]', 'card');

  params.set('metadata[order_number]', body.orderNumber);
  params.set('metadata[payment_provider]', 'stripe');
  params.set('metadata[checkout_mode]', mode);
  params.set('metadata[customer_name]', body.customer.name.trim());
  params.set('metadata[customer_email]', body.customer.email.trim());
  params.set('metadata[customer_phone]', body.customer.phone.trim());
  params.set('metadata[destination_country]', body.shippingAddress.country);
  params.set('metadata[destination_postal_code]', body.shippingAddress.postalCode);
  params.set('metadata[shipping_method]', body.shippingMethod || '');
  params.set('metadata[discount_amount]', body.discount.toFixed(2));

  params.set('payment_intent_data[metadata][order_number]', body.orderNumber);
  params.set('payment_intent_data[metadata][payment_provider]', 'stripe');
  params.set('payment_intent_data[metadata][checkout_mode]', mode);
  params.set('payment_intent_data[metadata][discount_amount]', body.discount.toFixed(2));

  if (couponId) {
    params.set('discounts[0][coupon]', couponId);
    params.set('metadata[stripe_coupon_id]', couponId);
    params.set('payment_intent_data[metadata][stripe_coupon_id]', couponId);
  }

  lineItems.forEach((item, index) => {
    params.set(`line_items[${index}][quantity]`, String(item.quantity));
    params.set(`line_items[${index}][price_data][currency]`, currency);
    params.set(`line_items[${index}][price_data][unit_amount]`, String(item.unitAmount));
    params.set(`line_items[${index}][price_data][product_data][name]`, item.name);

    if (item.description) {
      params.set(`line_items[${index}][price_data][product_data][description]`, item.description);
    }

    if (item.image) {
      params.set(`line_items[${index}][price_data][product_data][images][0]`, item.image);
    }
  });

  return params;
}

async function createStripeCheckoutSession(secretKey: string, params: URLSearchParams) {
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const stripeMessage = payload?.error?.message || `Stripe request failed with status ${response.status}.`;
    throw new Error(stripeMessage);
  }

  return payload as StripeSessionResponse;
}

async function createStripeCoupon(
  secretKey: string,
  currency: string,
  discountAmount: number,
  orderNumber: string,
) {
  const params = new URLSearchParams();

  params.set('duration', 'once');
  params.set('amount_off', String(toStripeAmount(discountAmount)));
  params.set('currency', sanitizeCurrency(currency));
  params.set('name', `Welcome discount ${orderNumber}`);
  params.set('metadata[order_number]', orderNumber);
  params.set('metadata[source]', 'newsletter-welcome');

  const response = await fetch('https://api.stripe.com/v1/coupons', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const stripeMessage = payload?.error?.message || `Stripe coupon request failed with status ${response.status}.`;
    throw new Error(stripeMessage);
  }

  return payload as StripeCouponResponse;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  try {
    const body = req.body;
    validateRequestBody(body);

    const stripeMode = body.settings.stripeMode === 'live' ? 'live' : 'test';
    const { secretKey } = await resolveStoredStripeSecretKey(stripeMode);
    if (!secretKey) {
      throw new Error(`Stripe ${stripeMode} secret key is missing in secure storage and server environment.`);
    }

    const { products } = await resolveServerProducts(req, body.items);
    const lineItems = buildLineItems(req, body, products);
    const stripeCoupon = body.discount > 0
      ? await createStripeCoupon(secretKey, body.settings.stripeCurrency, body.discount, body.orderNumber)
      : null;
    const params = buildStripeCheckoutParams(req, body, lineItems, stripeCoupon?.id);
    const session = await createStripeCheckoutSession(secretKey, params);

    try {
      await persistStripeCheckoutDraft({
        mode: stripeMode,
        currency: body.settings.stripeCurrency,
        orderNumber: body.orderNumber,
        sessionId: session.id,
        customer: body.customer,
        shippingAddress: body.shippingAddress,
        items: body.items,
        subtotal: body.subtotal,
        shipping: body.shipping,
        shippingMethod: body.shippingMethod,
        discount: body.discount,
        total: Math.max(0, body.subtotal + body.shipping - body.discount),
      });
    } catch (error) {
      console.error('Stripe checkout tracking warning:', error);
    }

    res.status(200).json({
      success: true,
      sessionId: session.id,
      orderNumber: body.orderNumber,
      url: session.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Stripe checkout session.';

    res.status(400).json({
      success: false,
      message,
    });
  }
}
