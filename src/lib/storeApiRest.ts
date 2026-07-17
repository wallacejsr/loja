import type { Product } from '../data/mockData';
import type { AddressCountryCode } from './customerForm';
import type { StoreSettings } from '../types/settings';
import { getStoreApiBaseUrl } from './storeBackend';
import type {
  Banner,
  CategoryInput,
  ContactMessage,
  ContactMessageInput,
  ContactMessageUpdateInput,
  HomeCard,
  HomeCardInput,
  HomeSection,
  HomeSectionInput,
  InstagramPost,
  NewsletterSubscriber,
  NewsletterSubscriberInput,
  ProductInput,
  Raffle,
  RaffleInput,
  StoreCategory,
} from './storeApiSupabase';

type RequestOptions = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: 'DELETE' | 'GET' | 'POST' | 'PUT';
};

export type AdminDashboardMetric = {
  description?: string;
  label: string;
  value: number;
};

export type AdminDashboardRecentOrder = {
  createdAt: string;
  customerName: string;
  orderNumber: string;
  source: 'orders' | 'stripe_checkout_orders';
  status: string;
  total: number;
};

export type AdminDashboardSummary = {
  metrics: {
    activeProducts: AdminDashboardMetric;
    newCustomers: AdminDashboardMetric;
    orders: AdminDashboardMetric;
    revenue: AdminDashboardMetric;
  };
  recentOrders: AdminDashboardRecentOrder[];
};

export type AdminCustomerAddress = {
  country?: AddressCountryCode;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

export type AdminCustomerOrderItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type AdminCustomerOrder = {
  id: string;
  orderNumber: string;
  date: string;
  status: 'Aguardando Pagamento' | 'Pago' | 'Em Separacao' | 'Enviado' | 'Entregue' | 'Cancelado';
  itemsCount: number;
  total: number;
  paymentMethod: string;
  shippingAddress: AdminCustomerAddress;
  billingAddress: AdminCustomerAddress;
  items: AdminCustomerOrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
};

export type AdminCustomerActivity = {
  id: string;
  type: string;
  description: string;
  dateTime: string;
};

export type AdminCustomerAuditLog = {
  id: string;
  customerId: string;
  user: string;
  field: string;
  previousValue: string;
  nextValue: string;
  dateTime: string;
  ip: string;
};

export type AdminCustomerRecord = {
  id: string;
  name: string;
  cpf: string;
  documentLabel?: string;
  birthDate: string;
  email: string;
  phone: string;
  phoneCountry?: AddressCountryCode;
  phoneE164?: string;
  registeredAt: string;
  status: 'Ativo' | 'Inativo';
  blockPurchases: boolean;
  allowMarketing: boolean;
  shippingAddress: AdminCustomerAddress;
  billingAddress: AdminCustomerAddress;
  orders: AdminCustomerOrder[];
  activities: AdminCustomerActivity[];
  auditLogs: AdminCustomerAuditLog[];
};

function buildStoreUrl(path: string, params?: Record<string, boolean | number | string | undefined>) {
  const url = new URL(`${getStoreApiBaseUrl()}${path}`, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function requestStoreApi<T>(path: string, options: RequestOptions = {}, params?: Record<string, boolean | number | string | undefined>) {
  const response = await fetch(buildStoreUrl(path, params), {
    method: options.method || 'GET',
    headers: options.body instanceof FormData
      ? options.headers
      : {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
    body: options.body,
    credentials: 'include',
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Store API request failed with status ${response.status}.`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function getProducts(): Promise<Product[]> {
  return requestStoreApi<Product[]>('/products', {}, { onlyActive: true });
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  return requestStoreApi<AdminDashboardSummary>('/admin/dashboard');
}

export async function getAdminCustomers(): Promise<AdminCustomerRecord[]> {
  return requestStoreApi<AdminCustomerRecord[]>('/admin/customers');
}

export async function updateAdminCustomer(id: string, input: AdminCustomerRecord): Promise<AdminCustomerRecord> {
  return requestStoreApi<AdminCustomerRecord>(`/admin/customers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function uploadProductImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await requestStoreApi<{ url: string }>('/uploads/product-image', { method: 'POST', body: formData });
  return response.url;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  return requestStoreApi<Product>('/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateProduct(id: string, input: ProductInput): Promise<Product> {
  return requestStoreApi<Product>(`/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await requestStoreApi<void>(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getCategories(): Promise<StoreCategory[]> {
  return requestStoreApi<StoreCategory[]>('/categories');
}

export async function createCategory(input: CategoryInput): Promise<StoreCategory> {
  return requestStoreApi<StoreCategory>('/categories', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateCategory(id: string, input: CategoryInput): Promise<StoreCategory> {
  return requestStoreApi<StoreCategory>(`/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await requestStoreApi<void>(`/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getBanners({ onlyActive = true } = {}): Promise<Banner[]> {
  return requestStoreApi<Banner[]>('/banners', {}, { onlyActive });
}

export async function getHomeSections({ onlyActive = true } = {}): Promise<HomeSection[]> {
  return requestStoreApi<HomeSection[]>('/home-sections', {}, { onlyActive });
}

export async function getHomeCards({ onlyActive = true } = {}): Promise<HomeCard[]> {
  return requestStoreApi<HomeCard[]>('/home-cards', {}, { onlyActive });
}

export async function createHomeCard(input: HomeCardInput): Promise<HomeCard> {
  return requestStoreApi<HomeCard>('/home-cards', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateHomeCard(id: string, input: HomeCardInput): Promise<HomeCard> {
  return requestStoreApi<HomeCard>(`/home-cards/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteHomeCard(id: string): Promise<void> {
  await requestStoreApi<void>(`/home-cards/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getRaffles({ onlyActive = true } = {}): Promise<Raffle[]> {
  return requestStoreApi<Raffle[]>('/raffles', {}, { onlyActive });
}

export async function createRaffle(input: RaffleInput): Promise<Raffle> {
  return requestStoreApi<Raffle>('/raffles', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateRaffle(id: string, input: RaffleInput): Promise<Raffle> {
  return requestStoreApi<Raffle>(`/raffles/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function deleteRaffle(id: string): Promise<void> {
  await requestStoreApi<void>(`/raffles/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function updateHomeSection(id: string, input: HomeSectionInput): Promise<HomeSection> {
  return requestStoreApi<HomeSection>(`/home-sections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function createBanner(input: Pick<Banner, 'title' | 'desktop' | 'mobile' | 'link'>): Promise<Banner> {
  return requestStoreApi<Banner>('/banners', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteBanner(id: string): Promise<void> {
  await requestStoreApi<void>(`/banners/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function updateBannerPositions(banners: Banner[]): Promise<void> {
  await requestStoreApi<void>('/banners/reorder', {
    method: 'PUT',
    body: JSON.stringify({ banners }),
  });
}

export async function getInstagramFeed(): Promise<InstagramPost[]> {
  return requestStoreApi<InstagramPost[]>('/instagram-feed');
}

export async function getStoreSettings(): Promise<StoreSettings> {
  return requestStoreApi<StoreSettings>('/settings');
}

export async function saveStoreSettings(settings: StoreSettings): Promise<StoreSettings> {
  return requestStoreApi<StoreSettings>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function getContactMessages(): Promise<ContactMessage[]> {
  return requestStoreApi<ContactMessage[]>('/contact-messages');
}

export async function getNewsletterSubscribers(): Promise<NewsletterSubscriber[]> {
  return requestStoreApi<NewsletterSubscriber[]>('/newsletter-subscribers');
}

export async function createContactMessage(input: ContactMessageInput): Promise<ContactMessage> {
  return requestStoreApi<ContactMessage>('/contact-messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function createNewsletterSubscriber(input: NewsletterSubscriberInput): Promise<NewsletterSubscriber> {
  return requestStoreApi<NewsletterSubscriber>('/newsletter-subscribers', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateContactMessage(id: string, input: ContactMessageUpdateInput): Promise<ContactMessage> {
  return requestStoreApi<ContactMessage>(`/contact-messages/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}
