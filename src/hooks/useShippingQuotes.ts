import { useCallback, useMemo, useState } from 'react';
import type { StoreProduct as Product } from '../types/store';
import type { AddressCountryCode } from '../lib/customerForm';
import { createShippingQuoteRequest, requestShippingQuotes, type ShippingQuote } from '../lib/shipping';
import type { StoreSettings } from './useSettings';

type CartLikeItem = {
  product: Pick<Product, 'id' | 'nome' | 'preco' | 'precoPromocional' | 'shippingWeightGrams'>;
  quantity: number;
};

type DestinationInput = {
  country: AddressCountryCode;
  postalCode: string;
  city?: string;
  region?: string;
  street?: string;
  number?: string;
  name?: string;
  phone?: string;
  email?: string;
};

type ShippingQuotesState = 'error' | 'idle' | 'loading' | 'ready';

export function useShippingQuotes(items: CartLikeItem[], subtotal: number, settings: StoreSettings) {
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState('');
  const [mode, setMode] = useState<'estimated' | 'live'>('estimated');
  const [status, setStatus] = useState<ShippingQuotesState>('idle');
  const [error, setError] = useState('');

  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === selectedQuoteId) || quotes[0] || null,
    [quotes, selectedQuoteId],
  );

  const resetQuotes = useCallback(() => {
    setQuotes([]);
    setSelectedQuoteId('');
    setMode('estimated');
    setStatus('idle');
    setError('');
  }, []);

  const loadQuotes = useCallback(
    async (destination: DestinationInput) => {
      setStatus('loading');
      setError('');

      try {
        const request = createShippingQuoteRequest(items, settings, destination, subtotal);
        const response = await requestShippingQuotes(request);
        setQuotes(response.quotes);
        setSelectedQuoteId((current) => {
          if (current && response.quotes.some((quote) => quote.id === current)) return current;
          return response.quotes[0]?.id || '';
        });
        setMode(response.mode);
        setStatus('ready');
      } catch (nextError) {
        console.error('Falha ao carregar cotacoes de frete', nextError);
        setQuotes([]);
        setSelectedQuoteId('');
        setStatus('error');
        setError(nextError instanceof Error ? nextError.message : 'Nao foi possivel carregar as cotacoes.');
      }
    },
    [items, settings, subtotal],
  );

  return {
    quotes,
    selectedQuote,
    setSelectedQuoteId,
    loadQuotes,
    mode,
    status,
    error,
    resetQuotes,
  };
}
