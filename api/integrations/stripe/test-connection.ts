import type { StripeMode } from '../../../src/types/settings.js';
import { testStripeConnection } from './runtime.js';

type VercelRequestLike = {
  body?: {
    mode?: StripeMode;
  };
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
  if (req.method !== 'POST') {
    res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
    return;
  }

  res.setHeader?.('Cache-Control', 'no-store');

  try {
    const mode = req.body?.mode;

    if (!isStripeMode(mode)) {
      throw new Error('Selecione um modo valido antes de testar a conexao com a Stripe.');
    }

    res.status(200).json(await testStripeConnection(mode));
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Nao foi possivel testar a conexao com a Stripe.',
      timestamp: new Date().toISOString(),
    });
  }
}
