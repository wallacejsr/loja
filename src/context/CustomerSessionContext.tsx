import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AddressCountryCode } from '../lib/customerForm';
import { getNewsletterSubscribers, type NewsletterSubscriber } from '../lib/storeApi';
import { normalizeNewsletterEmail } from '../lib/newsletter';
import {
  type StoreCustomerWelcomeBenefit,
  clearCartPromotionDraft,
  createWelcomeBenefitFromSubscriber,
  getAvailableWelcomeBenefit,
  normalizeStoredWelcomeBenefits,
} from '../lib/welcomeBenefit';

const STOREFRONT_CUSTOMERS_STORAGE_KEY = '@App:storefront-customers';
const STOREFRONT_SESSION_STORAGE_KEY = '@App:storefront-session';
const GUEST_SHIPPING_DRAFT_STORAGE_KEY = '@App:guest-shipping-draft';

export type CustomerRegistrationType = 'F' | 'J';

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

export type GuestShippingDraft = {
  country: AddressCountryCode;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  region: string;
};

export type StoreCustomerRecord = {
  id: string;
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
  createdAt: string;
  updatedAt: string;
  addresses: StoreCustomerAddress[];
  welcomeBenefits: StoreCustomerWelcomeBenefit[];
};

type CustomerSessionState = {
  customerId: string;
  loggedInAt: string;
} | null;

type RegisterCustomerInput = {
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
  address?: Omit<StoreCustomerAddress, 'id' | 'isPrimary'> & {
    isPrimary?: boolean;
  };
};

type UpdateCustomerProfileInput = Partial<
  Pick<
    StoreCustomerRecord,
    'fullName' | 'phone' | 'phoneCountry' | 'birthDate' | 'gender' | 'taxId' | 'corporateName' | 'stateRegistration'
  >
>;

type SaveAddressInput = Omit<StoreCustomerAddress, 'isPrimary'> & {
  isPrimary?: boolean;
};

type CustomerSessionContextData = {
  customers: StoreCustomerRecord[];
  currentCustomer: StoreCustomerRecord | null;
  availableWelcomeBenefit: StoreCustomerWelcomeBenefit | null;
  primaryAddress: StoreCustomerAddress | null;
  guestShippingDraft: GuestShippingDraft | null;
  isLoggedIn: boolean;
  registerCustomer: (input: RegisterCustomerInput) => Promise<{ ok: true } | { ok: false; error: 'EMAIL_EXISTS' }>;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: 'INVALID_CREDENTIALS' };
  logout: () => void;
  updateProfile: (input: UpdateCustomerProfileInput) => void;
  saveAddress: (input: SaveAddressInput) => StoreCustomerAddress | null;
  removeAddress: (addressId: string) => void;
  activateNewsletterBenefitForCurrentCustomer: (subscriber?: NewsletterSubscriber | null) => Promise<StoreCustomerWelcomeBenefit | null>;
  consumeWelcomeBenefit: (benefitId: string, orderNumber: string) => void;
  saveGuestShippingDraft: (draft: GuestShippingDraft) => void;
  clearGuestShippingDraft: () => void;
};

const CustomerSessionContext = createContext<CustomerSessionContextData>({} as CustomerSessionContextData);

function readStorageValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return fallback;
    return JSON.parse(rawValue) as T;
  } catch (error) {
    console.error(`Falha ao ler ${key}`, error);
    return fallback;
  }
}

function writeStorageValue<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Falha ao salvar ${key}`, error);
  }
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureSinglePrimaryAddress(addresses: StoreCustomerAddress[]) {
  if (addresses.length === 0) return addresses;

  const firstPrimary = addresses.find((address) => address.isPrimary) || addresses[0];

  return addresses.map((address) => ({
    ...address,
    isPrimary: address.id === firstPrimary.id,
  }));
}

function normalizeCustomerRecord(value: StoreCustomerRecord): StoreCustomerRecord {
  return {
    ...value,
    email: normalizeNewsletterEmail(value.email || ''),
    phoneCountry: value.phoneCountry || 'US',
    addresses: Array.isArray(value.addresses) ? ensureSinglePrimaryAddress(value.addresses) : [],
    welcomeBenefits: normalizeStoredWelcomeBenefits(value.welcomeBenefits),
  };
}

async function findNewsletterSubscriberByEmail(email: string) {
  try {
    const subscribers = await getNewsletterSubscribers();
    return subscribers.find((subscriber) => normalizeNewsletterEmail(subscriber.email) === email) || null;
  } catch (error) {
    console.error('Falha ao reconciliar newsletter com cadastro do cliente', error);
    return null;
  }
}

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<StoreCustomerRecord[]>(() =>
    readStorageValue<StoreCustomerRecord[]>(STOREFRONT_CUSTOMERS_STORAGE_KEY, []).map(normalizeCustomerRecord),
  );
  const [session, setSession] = useState<CustomerSessionState>(() =>
    readStorageValue<CustomerSessionState>(STOREFRONT_SESSION_STORAGE_KEY, null),
  );
  const [guestShippingDraft, setGuestShippingDraft] = useState<GuestShippingDraft | null>(() =>
    readStorageValue<GuestShippingDraft | null>(GUEST_SHIPPING_DRAFT_STORAGE_KEY, null),
  );

  useEffect(() => {
    writeStorageValue(STOREFRONT_CUSTOMERS_STORAGE_KEY, customers);
  }, [customers]);

  useEffect(() => {
    writeStorageValue(STOREFRONT_SESSION_STORAGE_KEY, session);
  }, [session]);

  useEffect(() => {
    writeStorageValue(GUEST_SHIPPING_DRAFT_STORAGE_KEY, guestShippingDraft);
  }, [guestShippingDraft]);

  const currentCustomer = useMemo(() => {
    if (!session?.customerId) return null;
    return customers.find((customer) => customer.id === session.customerId) || null;
  }, [customers, session]);

  const availableWelcomeBenefit = useMemo(() => {
    if (!currentCustomer) return null;
    return getAvailableWelcomeBenefit(currentCustomer.welcomeBenefits);
  }, [currentCustomer]);

  const primaryAddress = useMemo(() => {
    if (!currentCustomer) return null;
    return currentCustomer.addresses.find((address) => address.isPrimary) || currentCustomer.addresses[0] || null;
  }, [currentCustomer]);

  const registerCustomer = useCallback(async (input: RegisterCustomerInput) => {
    const normalizedEmail = input.email.trim().toLowerCase();
    const now = new Date().toISOString();
    const matchingSubscriber = await findNewsletterSubscriberByEmail(normalizedEmail);
    let result: { ok: true } | { ok: false; error: 'EMAIL_EXISTS' } = { ok: true };
    let nextSession: CustomerSessionState = null;

    setCustomers((previousCustomers) => {
      const emailAlreadyExists = previousCustomers.some(
        (customer) => customer.email.trim().toLowerCase() === normalizedEmail,
      );

      if (emailAlreadyExists) {
        result = { ok: false, error: 'EMAIL_EXISTS' };
        return previousCustomers;
      }

      const customerId = createId('customer');
      const nextCustomer: StoreCustomerRecord = {
        id: customerId,
        email: normalizedEmail,
        password: input.password,
        fullName: input.fullName.trim(),
        phone: input.phone,
        phoneCountry: input.phoneCountry,
        birthDate: input.birthDate,
        gender: input.gender,
        registrationType: input.registrationType,
        taxId: input.taxId,
        corporateName: input.corporateName.trim(),
        stateRegistration: input.stateRegistration.trim(),
        createdAt: now,
        updatedAt: now,
        welcomeBenefits: matchingSubscriber ? [createWelcomeBenefitFromSubscriber(normalizedEmail, matchingSubscriber, now)] : [],
        addresses: input.address
          ? ensureSinglePrimaryAddress([
              {
                id: createId('address'),
                label: input.address.label.trim(),
                country: input.address.country,
                postalCode: input.address.postalCode,
                street: input.address.street.trim(),
                number: input.address.number.trim(),
                complement: input.address.complement.trim(),
                neighborhood: input.address.neighborhood.trim(),
                city: input.address.city.trim(),
                region: input.address.region.trim(),
                isPrimary: input.address.isPrimary ?? true,
              },
            ])
          : [],
      };

      nextSession = {
        customerId,
        loggedInAt: now,
      };

      return [nextCustomer, ...previousCustomers];
    });

    if (result.ok && nextSession) {
      setSession(nextSession);
    }

    return result;
  }, []);

  const login = useCallback(
    (email: string, password: string) => {
      const normalizedEmail = email.trim().toLowerCase();
      const customer = customers.find(
        (item) => item.email.trim().toLowerCase() === normalizedEmail && item.password === password,
      );

      if (!customer) {
        return { ok: false as const, error: 'INVALID_CREDENTIALS' as const };
      }

      setSession({
        customerId: customer.id,
        loggedInAt: new Date().toISOString(),
      });

      return { ok: true as const };
    },
    [customers],
  );

  const logout = useCallback(() => {
    setSession(null);
    clearCartPromotionDraft();
  }, []);

  const updateProfile = useCallback(
    (input: UpdateCustomerProfileInput) => {
      if (!currentCustomer) return;

      const now = new Date().toISOString();

      setCustomers((previousCustomers) =>
        previousCustomers.map((customer) =>
          customer.id === currentCustomer.id
            ? {
                ...customer,
                ...input,
                fullName: input.fullName?.trim() ?? customer.fullName,
                corporateName: input.corporateName?.trim() ?? customer.corporateName,
                stateRegistration: input.stateRegistration?.trim() ?? customer.stateRegistration,
                updatedAt: now,
              }
            : customer,
        ),
      );
    },
    [currentCustomer],
  );

  const saveAddress = useCallback(
    (input: SaveAddressInput) => {
      if (!currentCustomer) return null;

      const now = new Date().toISOString();
      let savedAddress: StoreCustomerAddress | null = null;

      setCustomers((previousCustomers) =>
        previousCustomers.map((customer) => {
          if (customer.id !== currentCustomer.id) return customer;

          const existingAddress = customer.addresses.find((address) => address.id === input.id);
          const nextAddress: StoreCustomerAddress = {
            id: input.id || createId('address'),
            label: input.label.trim(),
            country: input.country,
            postalCode: input.postalCode,
            street: input.street.trim(),
            number: input.number.trim(),
            complement: input.complement.trim(),
            neighborhood: input.neighborhood.trim(),
            city: input.city.trim(),
            region: input.region.trim(),
            isPrimary: input.isPrimary ?? existingAddress?.isPrimary ?? customer.addresses.length === 0,
          };

          const nextAddresses = input.id
            ? customer.addresses.map((address) => (address.id === input.id ? nextAddress : address))
            : [...customer.addresses, nextAddress];

          const normalizedAddresses = ensureSinglePrimaryAddress(
            nextAddress.isPrimary
              ? nextAddresses.map((address) => ({
                  ...address,
                  isPrimary: address.id === nextAddress.id,
                }))
              : nextAddresses,
          );

          savedAddress =
            normalizedAddresses.find((address) => address.id === nextAddress.id) || normalizedAddresses[0] || null;

          return {
            ...customer,
            addresses: normalizedAddresses,
            updatedAt: now,
          };
        }),
      );

      return savedAddress;
    },
    [currentCustomer],
  );

  const removeAddress = useCallback(
    (addressId: string) => {
      if (!currentCustomer) return;

      const now = new Date().toISOString();

      setCustomers((previousCustomers) =>
        previousCustomers.map((customer) => {
          if (customer.id !== currentCustomer.id) return customer;

          const remainingAddresses = ensureSinglePrimaryAddress(
            customer.addresses.filter((address) => address.id !== addressId),
          );

          return {
            ...customer,
            addresses: remainingAddresses,
            updatedAt: now,
          };
        }),
      );
    },
    [currentCustomer],
  );

  const activateNewsletterBenefitForCurrentCustomer = useCallback(
    async (subscriber?: NewsletterSubscriber | null) => {
      if (!currentCustomer) return null;

      const normalizedEmail = normalizeNewsletterEmail(currentCustomer.email);
      const matchingSubscriber =
        subscriber && normalizeNewsletterEmail(subscriber.email) === normalizedEmail
          ? subscriber
          : await findNewsletterSubscriberByEmail(normalizedEmail);

      if (!matchingSubscriber) {
        return currentCustomer.welcomeBenefits.find((benefit) => benefit.type === 'newsletter-welcome') || null;
      }

      const timestamp = new Date().toISOString();
      let resolvedBenefit: StoreCustomerWelcomeBenefit | null = null;

      setCustomers((previousCustomers) =>
        previousCustomers.map((customer) => {
          if (customer.id !== currentCustomer.id) return customer;

          const existingBenefit = customer.welcomeBenefits.find((benefit) => benefit.type === 'newsletter-welcome') || null;
          if (existingBenefit) {
            resolvedBenefit = existingBenefit;
            return customer;
          }

          const nextBenefit = createWelcomeBenefitFromSubscriber(normalizedEmail, matchingSubscriber, timestamp);
          resolvedBenefit = nextBenefit;

          return {
            ...customer,
            updatedAt: timestamp,
            welcomeBenefits: [nextBenefit, ...customer.welcomeBenefits],
          };
        }),
      );

      return resolvedBenefit;
    },
    [currentCustomer],
  );

  const consumeWelcomeBenefit = useCallback(
    (benefitId: string, orderNumber: string) => {
      if (!currentCustomer) return;

      const timestamp = new Date().toISOString();

      setCustomers((previousCustomers) =>
        previousCustomers.map((customer) => {
          if (customer.id !== currentCustomer.id) return customer;

          return {
            ...customer,
            updatedAt: timestamp,
            welcomeBenefits: customer.welcomeBenefits.map((benefit) =>
              benefit.id === benefitId && benefit.status === 'available'
                ? {
                    ...benefit,
                    status: 'used',
                    usedAt: timestamp,
                    usedOrderNumber: orderNumber,
                  }
                : benefit,
            ),
          };
        }),
      );

      clearCartPromotionDraft();
    },
    [currentCustomer],
  );

  useEffect(() => {
    if (!currentCustomer) return;
    if (currentCustomer.welcomeBenefits.some((benefit) => benefit.type === 'newsletter-welcome')) return;

    void activateNewsletterBenefitForCurrentCustomer();
  }, [activateNewsletterBenefitForCurrentCustomer, currentCustomer]);

  const saveGuestShippingDraft = useCallback((draft: GuestShippingDraft) => {
    setGuestShippingDraft({
      country: draft.country,
      postalCode: draft.postalCode,
      street: draft.street.trim(),
      number: draft.number.trim(),
      complement: draft.complement.trim(),
      neighborhood: draft.neighborhood.trim(),
      city: draft.city.trim(),
      region: draft.region.trim(),
    });
  }, []);

  const clearGuestShippingDraft = useCallback(() => {
    setGuestShippingDraft(null);
  }, []);

  return (
    <CustomerSessionContext.Provider
      value={{
        customers,
        currentCustomer,
        availableWelcomeBenefit,
        primaryAddress,
        guestShippingDraft,
        isLoggedIn: Boolean(currentCustomer),
        registerCustomer,
        login,
        logout,
        updateProfile,
        saveAddress,
        removeAddress,
        activateNewsletterBenefitForCurrentCustomer,
        consumeWelcomeBenefit,
        saveGuestShippingDraft,
        clearGuestShippingDraft,
      }}
    >
      {children}
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession() {
  return useContext(CustomerSessionContext);
}
