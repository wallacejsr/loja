import { randomUUID } from 'node:crypto';
import { getServerSupabaseClient, isUsingServiceRoleForServerSupabase } from './_lib/supabaseServer';

type VercelRequestLike = {
  headers?: Record<string, string | string[] | undefined>;
  method?: string;
  query?: Record<string, string | string[] | undefined>;
};

type VercelResponseLike = {
  json: (payload: unknown) => void;
  status: (code: number) => VercelResponseLike;
};

function getHeaderValue(headers: VercelRequestLike['headers'], key: string) {
  const value = headers?.[key] ?? headers?.[key.toLowerCase()];

  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

function getQueryValue(query: VercelRequestLike['query'], key: string) {
  const value = query?.[key];

  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

function getKeepAliveToken(request: VercelRequestLike) {
  return (
    getHeaderValue(request.headers, 'x-keepalive-token').trim()
    || getQueryValue(request.query, 'token').trim()
  );
}

function getConfiguredKeepAliveToken() {
  return process.env.KEEPALIVE_TOKEN?.trim() || '';
}

function sanitizeSource(rawSource: string) {
  return rawSource
    .trim()
    .replace(/[^\w\-./:@ ]+/g, '')
    .slice(0, 120);
}

function resolveSource(request: VercelRequestLike) {
  const querySource = sanitizeSource(getQueryValue(request.query, 'source'));
  if (querySource) {
    return querySource;
  }

  const headerSource = sanitizeSource(getHeaderValue(request.headers, 'x-keepalive-source'));
  if (headerSource) {
    return headerSource;
  }

  const userAgent = sanitizeSource(getHeaderValue(request.headers, 'user-agent'));
  if (userAgent) {
    return userAgent;
  }

  return 'keepalive';
}

function isAuthorized(request: VercelRequestLike) {
  const configuredToken = getConfiguredKeepAliveToken();
  const receivedToken = getKeepAliveToken(request);

  if (!configuredToken) {
    return false;
  }

  return receivedToken === configuredToken;
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'GET') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
    return;
  }

  try {
    const supabase = getServerSupabaseClient();
    const timestamp = new Date().toISOString();
    const source = resolveSource(req);

    const { error } = await supabase
      .from('keep_alive_logs')
      .insert({
        id: randomUUID(),
        executed_at: timestamp,
        source,
        status: 'success',
      });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Keep Alive executado',
      timestamp,
      mode: isUsingServiceRoleForServerSupabase() ? 'service-role' : 'anon-fallback',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Keep Alive failed';

    res.status(500).json({
      success: false,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
