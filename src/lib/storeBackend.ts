export type StoreBackend = 'rest';

function normalizeUrlWithoutTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

export function getConfiguredStoreBackend(): StoreBackend {
  return 'rest';
}

export function getStoreApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const fallbackBaseUrl = '/api/store';
  const baseUrl = configuredBaseUrl || fallbackBaseUrl;
  return normalizeUrlWithoutTrailingSlash(baseUrl);
}

export function getStoreApiRootUrl() {
  const storeApiBaseUrl = getStoreApiBaseUrl();
  return storeApiBaseUrl.replace(/\/store$/, '');
}

export function getAdminApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_ADMIN_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return normalizeUrlWithoutTrailingSlash(configuredBaseUrl);
  }

  return `${getStoreApiRootUrl()}/admin`;
}

export function getAccountApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_ACCOUNT_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return normalizeUrlWithoutTrailingSlash(configuredBaseUrl);
  }

  return `${getStoreApiRootUrl()}/account`;
}

export function getIntegrationsApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_INTEGRATIONS_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return normalizeUrlWithoutTrailingSlash(configuredBaseUrl);
  }

  return `${getStoreApiRootUrl()}/integrations`;
}

export function getShippingApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_SHIPPING_API_BASE_URL?.trim();
  if (configuredBaseUrl) {
    return normalizeUrlWithoutTrailingSlash(configuredBaseUrl);
  }

  return `${getStoreApiRootUrl()}/shipping`;
}
