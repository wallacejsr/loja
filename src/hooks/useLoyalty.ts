import { useCallback, useState } from 'react';

type LoyaltyTicket = {
  date: string;
  id: string;
  number: number;
  raffleId: string;
  raffleTitle: string;
};

export function useLoyalty() {
  const [points, setPoints] = useState(0);
  const [tickets, setTickets] = useState<LoyaltyTicket[]>([]);

  const addPoints = useCallback((amount: number) => {
    setPoints((prev) => prev + Math.max(0, amount));
  }, []);

  const spendPoints = useCallback((amount: number) => {
    let success = false;

    setPoints((prev) => {
      if (prev < amount) return prev;
      success = true;
      return prev - amount;
    });

    return success;
  }, []);

  const buyTicket = useCallback((raffleId: string, raffleTitle: string, cost: number) => {
    if (!spendPoints(cost)) {
      return false;
    }

    setTickets((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        raffleId,
        raffleTitle,
        number: Math.floor(100000 + Math.random() * 900000),
        date: new Date().toISOString(),
      },
    ]);

    return true;
  }, [spendPoints]);

  return {
    points,
    tickets,
    addPoints,
    spendPoints,
    buyTicket,
  };
}
