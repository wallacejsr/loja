import { useState, useCallback } from 'react';

// Chave para o localStorage
const LOYALTY_POINTS_KEY = 'zenv_loyalty_points';
const RAFFLE_TICKETS_KEY = 'zenv_raffle_tickets';

export function useLoyalty() {
  const [points, setPoints] = useState<number>(() => {
    const saved = localStorage.getItem(LOYALTY_POINTS_KEY);
    return saved ? parseInt(saved, 10) : 1250; // Começa com alguns pontos para demonstração
  });

  const [tickets, setTickets] = useState<any[]>(() => {
    const saved = localStorage.getItem(RAFFLE_TICKETS_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  const addPoints = useCallback((amount: number) => {
    setPoints(prev => {
      const next = prev + amount;
      localStorage.setItem(LOYALTY_POINTS_KEY, next.toString());
      return next;
    });
  }, []);

  const spendPoints = useCallback((amount: number) => {
    let success = false;
    setPoints(prev => {
      if (prev >= amount) {
        const next = prev - amount;
        localStorage.setItem(LOYALTY_POINTS_KEY, next.toString());
        success = true;
        return next;
      }
      return prev;
    });
    return success;
  }, []);

  const buyTicket = useCallback((raffleId: string, raffleTitle: string, cost: number) => {
    if (spendPoints(cost)) {
      setTickets(prev => {
        const ticketNumber = Math.floor(100000 + Math.random() * 900000);
        const newTicket = { 
          id: Math.random().toString(36).substr(2, 9),
          raffleId, 
          raffleTitle,
          number: ticketNumber,
          date: new Date().toISOString()
        };
        const next = [...prev, newTicket];
        localStorage.setItem(RAFFLE_TICKETS_KEY, JSON.stringify(next));
        return next;
      });
      return true;
    }
    return false;
  }, [spendPoints]);

  return {
    points,
    tickets,
    addPoints,
    spendPoints,
    buyTicket
  };
}
