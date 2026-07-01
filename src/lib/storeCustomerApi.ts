import type { AddressCountryCode } from './customerForm';
import type { StoreCustomerWelcomeBenefit } from './welcomeBenefit';
import { getStoreApiRootUrl } from './storeBackend';

export type CustomerRegistrationType = 'F' | 'J';
export type CustomerAccountStatus = 'active' | 'inactive';

export type StoreCustomerAddress = {
  id: string;
  label: string;
  country: AddressCountryCode;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  region: string;
  isPrimary: boolean;
};

export type StoreCustomerProfile = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  phoneCountry: AddressCountryCode;
  birthDate: string;
  gender: string;
  registrationType: CustomerRegistrationType;
  taxId: string;
  taxDocumentType: string;
  corporateName: string;
  stateRegistration: string;
  allowMarketing: boolean;
  blockPurchases: boolean;
  newsletterSubscribed: boolean;
  status: CustomerAccountStatus;
  createdAt: string;
  updatedAt: string;
  addresses: StoreCustomerAddress[];
  welcomeBenefits: StoreCustomerWelcomeBenefit[];
};

export type CustomerSessionPayload = {
  authenticated: boolean;
  customer: StoreCustomerProfile | null;
  primaryAddress: StoreCustomerAddress | null;
  availableWelcomeBenefit: StoreCustomerWelcomeBenefit | null;
};

export type CustomerRegisterInput = {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  phoneCountry: AddressCountryCode;
  birthDate: string;
  gender: string;
  registrationType: CustomerRegistrationType;
  taxId: string;
  corporateName: string;
  stateRegistration: string;
  allowMarketing?: boolean;
  address?: Omit<StoreCustomerAddress, 'id' | 'isPrimary'> & {
    isPrimary?: boolean;
  };
};

export type CustomerProfileUpdateInput = Partial<
  Pick<
    StoreCustomerProfile,
    | 'allowMarketing'
    | 'birthDate'
    | 'corporateName'
    | 'fullName'
    | 'gender'
    | 'phone'
    | 'phoneCountry'
    | 'stateRegistration'
    | 'taxId'
  >
>;

export type CustomerAddressInput = Omit<StoreCustomerAddress, 'id'> & {
  id?: string;
};

type AccountRequestOptions = {
  body?: BodyInit | null;
  headers?: HeadersInit;
  method?: 'DELETE' | 'GET' | 'POST' | 'PUT';
};

type AccountApiErrorPayload = {
  code?: string;
  message?: string;
};

export class AccountApiError extends Error {
  code: string;

  constructor(message: string, code = 'ACCOUNT_API_ERROR') {
    super(message);
    this.code = code;
  }
}

function buildAccountApiUrl(path: string) {
  const url = new URL(`${getStoreApiRootUrl()}${path}`, window.location.origin);
  return url.toString();
}

async function requestAccountApi<T>(path: string, options: AccountRequestOptions = {}) {
  const response = await fetch(buildAccountApiUrl(path), {
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
    let payload: AccountApiErrorPayload | null = null;

    try {
      payload = await response.json() as AccountApiErrorPayload;
    } catch {
      payload = null;
    }

    const fallbackMessage = `Account API request failed with status ${response.status}.`;
    throw new AccountApiError(payload?.message || fallbackMessage, payload?.code || 'ACCOUNT_API_ERROR');
  }

  return response.json() as Promise<T>;
}

export async function getCurrentCustomerSession() {
  return requestAccountApi<CustomerSessionPayload>('/account/session');
}

export async function registerCustomerAccount(input: CustomerRegisterInput) {
  return requestAccountApi<CustomerSessionPayload>('/account/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function loginCustomerAccount(email: string, password: string) {
  return requestAccountApi<CustomerSessionPayload>('/account/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logoutCustomerAccount() {
  return requestAccountApi<{ success: true }>('/account/logout', {
    method: 'POST',
  });
}

export async function updateCurrentCustomerProfile(input: CustomerProfileUpdateInput) {
  return requestAccountApi<CustomerSessionPayload>('/account/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function saveCurrentCustomerAddress(input: CustomerAddressInput) {
  if (input.id) {
    return requestAccountApi<CustomerSessionPayload>(`/account/addresses/${encodeURIComponent(input.id)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  }

  return requestAccountApi<CustomerSessionPayload>('/account/addresses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function deleteCurrentCustomerAddress(addressId: string) {
  return requestAccountApi<CustomerSessionPayload>(`/account/addresses/${encodeURIComponent(addressId)}`, {
    method: 'DELETE',
  });
}

export async function activateCurrentCustomerNewsletterBenefit() {
  return requestAccountApi<CustomerSessionPayload>('/account/benefits/newsletter/activate', {
    method: 'POST',
  });
}

export async function consumeCurrentCustomerBenefit(benefitId: string, orderNumber: string) {
  return requestAccountApi<CustomerSessionPayload>(`/account/benefits/${encodeURIComponent(benefitId)}/consume`, {
    method: 'POST',
    body: JSON.stringify({ orderNumber }),
  });
}
