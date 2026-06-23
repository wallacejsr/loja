import { useDeferredValue, useMemo } from 'react';

export function useDeferredSearchTerm(searchTerm: string) {
  const deferredSearchTerm = useDeferredValue(searchTerm);

  return useMemo(
    () => deferredSearchTerm.trim().toLowerCase(),
    [deferredSearchTerm],
  );
}
