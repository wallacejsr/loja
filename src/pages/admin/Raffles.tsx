import React, { useMemo, useState } from 'react';
import { Plus, Trophy, Users, Calendar, Ticket, Trash2, Edit, Search, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { showToast } from '../../lib/adminUtils';
import { cn } from '../../lib/utils';
import { RaffleModal } from '../../components/admin/RaffleModal';
import { useStoreActions, useStoreRaffles } from '../../hooks/useStoreData';
import { Raffle, RaffleInput } from '../../lib/storeApi';

export function AdminRaffles() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRaffle, setSelectedRaffle] = useState<Raffle | null>(null);
  const [raffleToDelete, setRaffleToDelete] = useState<Raffle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const raffles = useStoreRaffles();
  const { addRaffle, editRaffle, removeRaffle } = useStoreActions();

  const filteredRaffles = useMemo(() => raffles.filter((raffle) => (
    raffle.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    raffle.prize.toLowerCase().includes(searchTerm.toLowerCase())
  )).sort((a, b) => a.position - b.position), [raffles, searchTerm]);

  const activeCount = raffles.filter((raffle) => raffle.status === 'Ativo').length;

  const openNewRaffle = () => {
    setSelectedRaffle(null);
    setIsModalOpen(true);
  };

  const openEditRaffle = (raffle: Raffle) => {
    setSelectedRaffle(raffle);
    setIsModalOpen(true);
  };

  const handleSaveRaffle = async (raffle: RaffleInput) => {
    if (selectedRaffle) {
      await editRaffle(selectedRaffle.id, raffle);
    } else {
      await addRaffle(raffle);
    }
  };

  const handleDeleteRaffle = async () => {
    if (!raffleToDelete) return;
    setIsDeleting(true);
    try {
      await removeRaffle(raffleToDelete.id);
      showToast('Sorteio removido com sucesso!');
      setRaffleToDelete(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel remover o sorteio.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Sorteios & Fidelidade</h2>
          <p className="text-neutral-500 text-[13px]">Gerencie o sorteio ativo que aparece na Home e na pagina de sorteios.</p>
        </div>
        <button
          onClick={openNewRaffle}
          className="bg-[#0A0A0A] text-white px-5 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Sorteio
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-neutral-200/40 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Sorteios ativos</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{activeCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200/40 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Cadastrados</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{raffles.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200/40 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Visivel na Home</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{activeCount ? 'Sim' : 'Nao'}</p>
        </div>
      </div>

      <RaffleModal
        isOpen={isModalOpen}
        raffle={selectedRaffle}
        onSave={handleSaveRaffle}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRaffle(null);
        }}
      />

      <AnimatePresence>
        {raffleToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setRaffleToDelete(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Excluir sorteio?</h3>
                    <p className="text-[13px] text-neutral-500 mt-1 leading-relaxed">
                      Deseja excluir o sorteio <span className="font-semibold text-neutral-900">"{raffleToDelete.title}"</span>?
                    </p>
                  </div>
                </div>
                <button type="button" disabled={isDeleting} onClick={() => setRaffleToDelete(null)} className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors disabled:opacity-50">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 bg-neutral-50/60 flex justify-end gap-3">
                <button type="button" disabled={isDeleting} onClick={() => setRaffleToDelete(null)} className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50">
                  Cancelar
                </button>
                <button type="button" disabled={isDeleting} onClick={handleDeleteRaffle} className="bg-red-600 text-white px-6 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-600/10 disabled:opacity-60 disabled:cursor-wait">
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Excluindo...' : 'Excluir sorteio'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 border-b border-neutral-100/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar sorteios..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 text-[13px] transition-all bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
          {filteredRaffles.map((raffle) => (
            <div key={raffle.id} className="bg-white rounded-2xl border border-neutral-100 overflow-hidden shadow-sm hover:shadow-md transition-all group">
              <div className="h-48 relative bg-neutral-100">
                {raffle.image ? (
                  <img src={raffle.image} alt={raffle.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-300">
                    <Trophy className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                    raffle.status === 'Ativo' ? "bg-green-50 text-green-700 border border-green-100" : "bg-neutral-900 text-white",
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
                      <span className="text-sm">{raffle.drawDate ? new Date(`${raffle.drawDate}T00:00:00`).toLocaleDateString('pt-BR') : '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-neutral-500">
                    <Users className="w-4 h-4" />
                    <span className="text-[12px] font-medium">{raffle.totalParticipants} participantes</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditRaffle(raffle)} className="p-2 hover:bg-neutral-100 rounded-lg transition-colors text-neutral-400 hover:text-neutral-900" title="Editar">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button onClick={() => setRaffleToDelete(raffle)} className="p-2 hover:bg-red-50 rounded-lg transition-colors text-neutral-400 hover:text-red-500" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {!filteredRaffles.length && (
          <div className="px-6 py-12 text-center text-[13px] text-neutral-500">
            Nenhum sorteio encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
