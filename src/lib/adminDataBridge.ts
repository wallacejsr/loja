import type { AddressCountryCode } from './customerForm';
import { getAdminTaxIdLabel, getPhoneDisplay, getPhoneE164 } from './customerForm';

export const ADMIN_ORDERS_STORAGE_KEY = 'admin-orders-v1';
export const ADMIN_CUSTOMERS_STORAGE_KEY = 'admin-customers-v1';

type CheckoutBridgeItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  size?: string;
  color?: string;
};

type CheckoutBridgeCustomer = {
  documentLabel?: string;
  name: string;
  email: string;
  phone: string;
  phoneCountry: AddressCountryCode;
  cpf?: string;
};

type CheckoutBridgeAddress = {
  country: AddressCountryCode;
  postalCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  region: string;
};

type CheckoutBridgePayload = {
  orderNumber: string;
  paymentMethod: string;
  customer: CheckoutBridgeCustomer;
  shippingAddress: CheckoutBridgeAddress;
  items: CheckoutBridgeItem[];
  subtotal: number;
  shipping: number;
  shippingMethod?: string;
  discount: number;
};

type StoredOrder = {
  id: string;
  orderNumber: string;
  purchaseDate: string;
  status: string;
  total: number;
  paymentMethod: string;
  shippingMethod?: string;
  customer: {
    documentLabel?: string;
    name: string;
    email: string;
    phone: string;
    phoneCountry?: AddressCountryCode;
    phoneE164?: string;
    cpf?: string;
  };
  shippingAddress: {
    country?: AddressCountryCode;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
  };
  items: Array<{
    id: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  subtotal: number;
  shipping: number;
  discount: number;
  history: {
    createdAt: string;
    paidAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
  };
  logs: Array<{
    id: string;
    user: string;
    dateTime: string;
    ip: string;
    action: string;
  }>;
};

type StoredCustomerOrder = {
  id: string;
  orderNumber: string;
  date: string;
  status: string;
  itemsCount: number;
  total: number;
  paymentMethod: string;
  shippingMethod?: string;
  shippingAddress: StoredOrder['shippingAddress'];
  billingAddress: StoredOrder['shippingAddress'];
  items: StoredOrder['items'];
  subtotal: number;
  shipping: number;
  discount: number;
};

type StoredCustomer = {
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
  status: string;
  blockPurchases: boolean;
  allowMarketing: boolean;
  shippingAddress: StoredOrder['shippingAddress'];
  billingAddress: StoredOrder['shippingAddress'];
  orders: StoredCustomerOrder[];
  activities: Array<{
    id: string;
    type: string;
    description: string;
    dateTime: string;
  }>;
  auditLogs: Array<{
    id: string;
    customerId: string;
    user: string;
    field: string;
    previousValue: string;
    nextValue: string;
    dateTime: string;
    ip: string;
  }>;
};

function readStorage<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Falha ao ler ${key}`, error);
    return [];
  }
}

function writeStorage<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Falha ao salvar ${key}`, error);
  }
}

function createStorageAddress(address: CheckoutBridgeAddress): StoredOrder['shippingAddress'] {
  return {
    country: address.country,
    cep: address.postalCode,
    street: address.street,
    number: address.number,
    complement: address.complement || '',
    district: address.neighborhood,
    city: address.city,
    state: address.region,
  };
}

function createOrderItems(items: CheckoutBridgeItem[]) {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    sku: [item.id, item.size || 'U', item.color || 'PADRAO'].join('-').toUpperCase(),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.unitPrice * item.quantity,
  }));
}

function getCustomerLookupKey(customer: CheckoutBridgeCustomer) {
  const phoneE164 = getPhoneE164(customer.phone, customer.phoneCountry);
  return {
    email: customer.email.trim().toLowerCase(),
    cpf: (customer.cpf || '').trim(),
    phoneE164,
  };
}

function getStoredCustomerId(ordersLength: number) {
  return `cust-${String(ordersLength + 1).padStart(3, '0')}`;
}

export function syncCheckoutOrderToAdmin(payload: CheckoutBridgePayload) {
  if (typeof window === 'undefined') return;

  const now = new Date().toISOString();
  const phoneE164 = getPhoneE164(payload.customer.phone, payload.customer.phoneCountry);
  const phoneDisplay = getPhoneDisplay(payload.customer.phone, payload.customer.phoneCountry);
  const shippingAddress = createStorageAddress(payload.shippingAddress);
  const orderItems = createOrderItems(payload.items);
  const total = Math.max(0, payload.subtotal + payload.shipping - payload.discount);
  const documentLabel = payload.customer.documentLabel || getAdminTaxIdLabel(payload.shippingAddress.country, 'F');

  const orders = readStorage<StoredOrder>(ADMIN_ORDERS_STORAGE_KEY);
  if (orders.some((order) => order.orderNumber === payload.orderNumber)) {
    return;
  }

  const orderId = `order-${payload.orderNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;

  const newOrder: StoredOrder = {
    id: orderId,
    orderNumber: payload.orderNumber,
    purchaseDate: now,
    status: 'Pago',
    total,
    paymentMethod: payload.paymentMethod,
    shippingMethod: payload.shippingMethod,
    customer: {
      documentLabel,
      name: payload.customer.name,
      email: payload.customer.email,
      phone: phoneDisplay,
      phoneCountry: payload.customer.phoneCountry,
      phoneE164,
      cpf: payload.customer.cpf || '',
    },
    shippingAddress,
    items: orderItems,
    subtotal: payload.subtotal,
    shipping: payload.shipping,
    discount: payload.discount,
    history: {
      createdAt: now,
      paidAt: now,
    },
    logs: [
      {
        id: crypto.randomUUID(),
        user: 'Sistema',
        dateTime: now,
        ip: '127.0.0.1',
        action: 'Pedido criado com status Pago',
      },
    ],
  };

  writeStorage(ADMIN_ORDERS_STORAGE_KEY, [newOrder, ...orders]);

  const customers = readStorage<StoredCustomer>(ADMIN_CUSTOMERS_STORAGE_KEY);
  const lookupKey = getCustomerLookupKey(payload.customer);
  const existingCustomer = customers.find((customer) => {
    const existingEmail = customer.email.trim().toLowerCase();
    const existingPhoneE164 = customer.phoneE164 || getPhoneE164(customer.phone, customer.phoneCountry || 'BR');
    return (
      (lookupKey.email && existingEmail === lookupKey.email) ||
      (lookupKey.cpf && customer.cpf === lookupKey.cpf) ||
      (lookupKey.phoneE164 && existingPhoneE164 === lookupKey.phoneE164)
    );
  });

  const customerOrder: StoredCustomerOrder = {
    id: newOrder.id,
    orderNumber: newOrder.orderNumber,
    date: now,
    status: newOrder.status,
    itemsCount: payload.items.reduce((sum, item) => sum + item.quantity, 0),
    total: newOrder.total,
    paymentMethod: newOrder.paymentMethod,
    shippingMethod: newOrder.shippingMethod,
    shippingAddress,
    billingAddress: shippingAddress,
    items: orderItems,
    subtotal: newOrder.subtotal,
    shipping: newOrder.shipping,
    discount: newOrder.discount,
  };

  if (existingCustomer) {
    const updatedCustomers = customers.map((customer) =>
      customer.id === existingCustomer.id
        ? {
            ...customer,
            name: payload.customer.name,
            email: payload.customer.email,
            phone: phoneDisplay,
            phoneCountry: payload.customer.phoneCountry,
            phoneE164,
            cpf: payload.customer.cpf || customer.cpf,
            documentLabel,
            shippingAddress,
            billingAddress: shippingAddress,
            orders: [customerOrder, ...customer.orders],
            activities: [
              {
                id: crypto.randomUUID(),
                type: 'Pedido criado',
                description: `Pedido ${payload.orderNumber} registrado para o cliente.`,
                dateTime: now,
              },
              {
                id: crypto.randomUUID(),
                type: 'Pagamento aprovado',
                description: `Pagamento do pedido ${payload.orderNumber} aprovado.`,
                dateTime: now,
              },
              ...customer.activities,
            ],
          }
        : customer,
    );

    writeStorage(ADMIN_CUSTOMERS_STORAGE_KEY, updatedCustomers);
    return;
  }

  const newCustomer: StoredCustomer = {
    id: getStoredCustomerId(customers.length),
    name: payload.customer.name,
    cpf: payload.customer.cpf || '',
    documentLabel,
    birthDate: '',
    email: payload.customer.email,
    phone: phoneDisplay,
    phoneCountry: payload.customer.phoneCountry,
    phoneE164,
    registeredAt: now,
    status: 'Ativo',
    blockPurchases: false,
    allowMarketing: true,
    shippingAddress,
    billingAddress: shippingAddress,
    orders: [customerOrder],
    activities: [
      {
        id: crypto.randomUUID(),
        type: 'Cliente cadastrado',
        description: 'Cadastro criado no checkout.',
        dateTime: now,
      },
      {
        id: crypto.randomUUID(),
        type: 'Pedido criado',
        description: `Pedido ${payload.orderNumber} registrado para o cliente.`,
        dateTime: now,
      },
      {
        id: crypto.randomUUID(),
        type: 'Pagamento aprovado',
        description: `Pagamento do pedido ${payload.orderNumber} aprovado.`,
        dateTime: now,
      },
    ],
    auditLogs: [],
  };

  writeStorage(ADMIN_CUSTOMERS_STORAGE_KEY, [newCustomer, ...customers]);
}
