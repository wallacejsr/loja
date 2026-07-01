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
import type { NewsletterSubscriber } from '../lib/storeApi';
import {
  AccountApiError,
  activateCurrentCustomerNewsletterBenefit,
  consumeCurrentCustomerBenefit,
  deleteCurrentCustomerAddress,
  getCurrentCustomerSession,
  loginCustomerAccount,
  logoutCustomerAccount,
  registerCustomerAccount,
  saveCurrentCustomerAddress,
  type CustomerAddressInput,
  type CustomerProfileUpdateInput,
  type CustomerRegisterInput,
  type CustomerSessionPayload,
  type StoreCustomerAddress,
  type StoreCustomerProfile,
  updateCurrentCustomerProfile,
} from '../lib/storeCustomerApi';
import type { StoreCustomerWelcomeBenefit } from '../lib/welcomeBenefit';
import { clearCartPromotionDraft } from '../lib/welcomeBenefit';

export type { StoreCustomerAddress, StoreCustomerProfile } from '../lib/storeCustomerApi';

const GUEST_SHIPPING_DRAFT_STORAGE_KEY = '@App:guest-shipping-draft';

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

type RegisterCustomerResult = { ok: true } | { ok: false; error: 'EMAIL_EXISTS' };
type LoginResult = { ok: true } | { ok: false; error: 'ACCOUNT_DISABLED' | 'INVALID_CREDENTIALS' };
type RegisterCustomerError = 'EMAIL_EXISTS';
type LoginError = 'ACCOUNT_DISABLED' | 'INVALID_CREDENTIALS';

type CustomerSessionContextData = {
  customers: StoreCustomerProfile[];
  currentCustomer: StoreCustomerProfile | null;
  availableWelcomeBenefit: StoreCustomerWelcomeBenefit | null;
  primaryAddress: StoreCustomerAddress | null;
  guestShippingDraft: GuestShippingDraft | null;
  isLoggedIn: boolean;
  isSessionLoading: boolean;
  registerCustomer: (input: CustomerRegisterInput) => Promise<RegisterCustomerResult>;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  updateProfile: (input: CustomerProfileUpdateInput) => Promise<void>;
  saveAddress: (input: CustomerAddressInput) => Promise<StoreCustomerAddress | null>;
  removeAddress: (addressId: string) => Promise<void>;
  activateNewsletterBenefitForCurrentCustomer: (subscriber?: NewsletterSubscriber | null) => Promise<StoreCustomerWelcomeBenefit | null>;
  consumeWelcomeBenefit: (benefitId: string, orderNumber: string) => Promise<void>;
  saveGuestShippingDraft: (draft: GuestShippingDraft) => void;
  clearGuestShippingDraft: () => void;
  refreshSession: () => Promise<void>;
};

const CustomerSessionContext = createContext<CustomerSessionContextData>({} as CustomerSessionContextData);

const EMPTY_SESSION_PAYLOAD: CustomerSessionPayload = {
  authenticated: false,
  availableWelcomeBenefit: null,
  customer: null,
  primaryAddress: null,
};

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

function resolveAuthErrorCode(error: unknown, fallback: LoginError | RegisterCustomerError) {
  if (error instanceof AccountApiError) {
    if (error.code === 'EMAIL_EXISTS') {
      return 'EMAIL_EXISTS';
    }

    if (error.code === 'ACCOUNT_DISABLED') {
      return 'ACCOUNT_DISABLED';
    }

    if (error.code === 'INVALID_CREDENTIALS') {
      return 'INVALID_CREDENTIALS';
    }
  }

  return fallback;
}

export function CustomerSessionProvider({ children }: { children: ReactNode }) {
  const [sessionPayload, setSessionPayload] = useState<CustomerSessionPayload>(EMPTY_SESSION_PAYLOAD);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [guestShippingDraft, setGuestShippingDraft] = useState<GuestShippingDraft | null>(() =>
    readStorageValue<GuestShippingDraft | null>(GUEST_SHIPPING_DRAFT_STORAGE_KEY, null),
  );

  useEffect(() => {
    writeStorageValue(GUEST_SHIPPING_DRAFT_STORAGE_KEY, guestShippingDraft);
  }, [guestShippingDraft]);

  const refreshSession = useCallback(async () => {
    setIsSessionLoading(true);

    try {
      const nextPayload = await getCurrentCustomerSession();
      setSessionPayload(nextPayload);
    } catch (error) {
      console.error('Falha ao carregar a sessao do cliente', error);
      setSessionPayload(EMPTY_SESSION_PAYLOAD);
    } finally {
      setIsSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const currentCustomer = sessionPayload.customer;
  const availableWelcomeBenefit = sessionPayload.availableWelcomeBenefit;
  const primaryAddress = sessionPayload.primaryAddress;

  const registerCustomer = useCallback(async (input: CustomerRegisterInput) => {
    try {
      const nextPayload = await registerCustomerAccount(input);
      setSessionPayload(nextPayload);
      return { ok: true as const };
    } catch (error) {
      if (resolveAuthErrorCode(error, 'EMAIL_EXISTS') === 'EMAIL_EXISTS') {
        return { ok: false as const, error: 'EMAIL_EXISTS' as const };
      }

      throw error;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const nextPayload = await loginCustomerAccount(email, password);
      setSessionPayload(nextPayload);
      return { ok: true as const };
    } catch (error) {
      return {
        ok: false as const,
        error: resolveAuthErrorCode(error, 'INVALID_CREDENTIALS') as LoginError,
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutCustomerAccount();
    } catch (error) {
      console.error('Falha ao encerrar a sessao do cliente', error);
    } finally {
      setSessionPayload(EMPTY_SESSION_PAYLOAD);
      clearCartPromotionDraft();
    }
  }, []);

  const updateProfile = useCallback(async (input: CustomerProfileUpdateInput) => {
    const nextPayload = await updateCurrentCustomerProfile(input);
    setSessionPayload(nextPayload);
  }, []);

  const saveAddress = useCallback(async (input: CustomerAddressInput) => {
    const nextPayload = await saveCurrentCustomerAddress(input);
    setSessionPayload(nextPayload);

    if (!nextPayload.customer) {
      return null;
    }

    if (input.id) {
      return nextPayload.customer.addresses.find((address) => address.id === input.id) || nextPayload.primaryAddress;
    }

    return nextPayload.primaryAddress;
  }, []);

  const removeAddress = useCallback(async (addressId: string) => {
    const nextPayload = await deleteCurrentCustomerAddress(addressId);
    setSessionPayload(nextPayload);
  }, []);

  const activateNewsletterBenefitForCurrentCustomer = useCallback(async (_subscriber?: NewsletterSubscriber | null) => {
    if (!currentCustomer) {
      return null;
    }

    const nextPayload = await activateCurrentCustomerNewsletterBenefit();
    setSessionPayload(nextPayload);
    return nextPayload.availableWelcomeBenefit;
  }, [currentCustomer]);

  const consumeWelcomeBenefit = useCallback(async (benefitId: string, orderNumber: string) => {
    if (!currentCustomer) {
      clearCartPromotionDraft();
      return;
    }

    const nextPayload = await consumeCurrentCustomerBenefit(benefitId, orderNumber);
    setSessionPayload(nextPayload);
    clearCartPromotionDraft();
  }, [currentCustomer]);

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

  const value = useMemo(() => ({
    customers: currentCustomer ? [currentCustomer] : [],
    currentCustomer,
    availableWelcomeBenefit,
    primaryAddress,
    guestShippingDraft,
    isLoggedIn: Boolean(currentCustomer),
    isSessionLoading,
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
    refreshSession,
  }), [
    activateNewsletterBenefitForCurrentCustomer,
    availableWelcomeBenefit,
    clearGuestShippingDraft,
    consumeWelcomeBenefit,
    currentCustomer,
    guestShippingDraft,
    isSessionLoading,
    login,
    logout,
    primaryAddress,
    refreshSession,
    registerCustomer,
    removeAddress,
    saveAddress,
    saveGuestShippingDraft,
    updateProfile,
  ]);

  return (
    <CustomerSessionContext.Provider value={value}>
      {children}
    </CustomerSessionContext.Provider>
  );
}

export function useCustomerSession() {
  return useContext(CustomerSessionContext);
}
