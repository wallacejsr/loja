export type StoreBackend = 'local' | 'rest' | 'supabase';

const VALID_BACKENDS: StoreBackend[] = ['local', 'rest', 'supabase'];

export function getConfiguredStoreBackend(): StoreBackend {
  const explicitBackend = import.meta.env.VITE_STORE_BACKEND;

  if (VALID_BACKENDS.includes(explicitBackend as StoreBackend)) {
    return explicitBackend as StoreBackend;
  }

  if (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY) {
    return 'supabase';
  }

  return 'local';
}

export function getStoreApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  const fallbackBaseUrl = '/api/store';
  const baseUrl = configuredBaseUrl || fallbackBaseUrl;
  return baseUrl.replace(/\/$/, '');
}
