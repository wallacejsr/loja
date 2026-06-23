import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;

function getServerSupabaseUrl() {
  return (
    process.env.SUPABASE_URL?.trim()
    || process.env.VITE_SUPABASE_URL?.trim()
    || ''
  );
}

function getServerSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
    || process.env.SUPABASE_ANON_KEY?.trim()
    || process.env.VITE_SUPABASE_ANON_KEY?.trim()
    || ''
  );
}

export function getServerSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const supabaseUrl = getServerSupabaseUrl();
  const supabaseKey = getServerSupabaseKey();

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase server envs are missing. Configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for /api/keepalive.',
    );
  }

  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
}

export function isUsingServiceRoleForServerSupabase() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
