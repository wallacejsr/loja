import React, { useState } from 'react';
import { Plus, Trophy, Users, Calendar, Ticket, Gift, Search, Trash2, Edit } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { RaffleModal } from '../../components/admin/RaffleModal';

interface Raffle {
  id: string;
  title: string;
  prize: string;
  pointsPerTicket: number;
  drawDate: string;
  totalParticipants: number;
  totalTickets: number;
  status: 'Ativo' | 'Finalizado' | 'Agendado';
  image: string;
}

export function AdminRaffles() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [raffles] = useState<Raffle[]>([
    {
      id: '1',
      title: 'iPhone 15 Pro Max',
      prize: '01 iPhone 15 Pro Max 256GB Platinum',
      pointsPerTicket: 500,
      drawDate: '2024-12-25',
      totalParticipants: 156,
      totalTickets: 1240,
      status: 'Ativo',
      image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&w=400&q=80'
    },
    {
      id: '2',
      title: 'Vale Compras R$ 1.000',
      prize: 'Crédito de R$ 1.000 na nossa loja',
      pointsPerTicket: 100,
      drawDate: '2024-11-15',
      totalParticipants: 890,
      totalTickets: 5400,
      status: 'Finalizado',
      image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=400&q=80'
    }
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Sorteios & Fidelidade</h2>
          <p className="text-neutral-500 text-[13px]">Gerencie os sorteios e prêmios para os clientes fiéis.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0A0A0A] text-white px-5 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Sorteio
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {raffles.map((raffle) => (
          <div key={raffle.id} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
            <div className="h-48 relative">
              <img src={raffle.image} alt={raffle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute top-4 right-4">
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                  raffle.status === 'Ativo' 
                    ? "bg-green-50 text-green-700 border border-green-100" 
                    : "bg-neutral-900 text-white"
                )}>
                  {raffle.status}
                </span>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-serif font-bold text-neutral-900">{raffle.title}</h3>
                <p className="text-[12px] text-neutral-500 line-clamp-1">{raffle.prize}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-neutral-50">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Custo/Bilhete</p>
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                    <Ticket className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-sm">{raffle.pointsPerTicket} pts</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold">Data Sorteio</p>
                  <div className="flex items-center gap-1.5 font-bold text-neutral-900">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="text-sm">{new Date(raffle.drawDate).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Users className="w-4 h-4" />
                  <span className="text-[12px] font-medium">{raffle.totalParticipants} participantes</span>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 hover:bg-red-50 rounded-lg transition-colors text-neutral-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {raffle.status === 'Ativo' && (
                <button 
                  onClick={() => showToast(`Realizando sorteio: ${raffle.title}`)}
                  className="w-full bg-neutral-900 text-white py-3 rounded-xl text-[11px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2"
                >
                  <Trophy className="w-4 h-4" />
                  Sortear Agora
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <RaffleModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
}
