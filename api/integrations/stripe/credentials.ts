import type { StripeMode } from '../../../src/types/settings.ts';
import { requireStripeAdminPermission } from './adminAuth.js';
import { getStripeStatusPayload, saveStripeCredentialsToActiveStorage } from './runtime.js';

type StripeCredentialSaveRequestBody = {
  mode?: StripeMode;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
};

type VercelRequestLike = {
  body?: StripeCredentialSaveRequestBody;
  method?: string;
};

type VercelResponseLike = {
  json: (payload: unknown) => void;
  setHeader?: (name: string, value: string) => void;
  status: (code: number) => VercelResponseLike;
};

function isStripeMode(value: string | undefined): value is StripeMode {
  return value === 'test' || value === 'live';
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'PUT') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  res.setHeader?.('Cache-Control', 'no-store');

  const authenticatedAdmin = await requireStripeAdminPermission(req, res, 'integrations:write');
  if (!authenticatedAdmin) {
    return;
  }

  try {
    const body = req.body;
    const mode = body?.mode;

    if (!isStripeMode(mode)) {
      throw new Error('Selecione um modo valido da Stripe antes de salvar as credenciais.');
    }

    const hasAnyValue = Boolean(
      body?.publishableKey?.trim()
      || body?.secretKey?.trim()
      || body?.webhookSecret?.trim(),
    );

    if (!hasAnyValue) {
      throw new Error('Preencha pelo menos uma credencial da Stripe para salvar.');
    }

    const saved = await saveStripeCredentialsToActiveStorage({
      mode,
      publishableKey: body?.publishableKey,
      secretKey: body?.secretKey,
      webhookSecret: body?.webhookSecret,
    });

    const status = await getStripeStatusPayload();

    res.status(200).json({
      success: true,
      provider: 'stripe',
      saved,
      status,
      message: `Credenciais do modo ${mode === 'live' ? 'live' : 'test'} atualizadas com seguranca.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Nao foi possivel salvar as credenciais da Stripe.',
      timestamp: new Date().toISOString(),
    });
  }
}
