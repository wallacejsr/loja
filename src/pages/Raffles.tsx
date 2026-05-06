import React from 'react';
import { Trophy, Ticket, Calendar, Gift, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { useLoyalty } from '../hooks/useLoyalty';
import { useStoreData } from '../hooks/useStoreData';
import { showToast } from '../lib/adminUtils';
import { cn } from '../lib/utils';
import { Raffle } from '../lib/storeApi';

export function Raffles() {
  const { points, buyTicket, tickets } = useLoyalty();
  const { raffles } = useStoreData();
  const activeRaffles = raffles
    .filter((raffle) => raffle.status === 'Ativo')
    .sort((a, b) => a.position - b.position);

  const handleBuy = (raffle: Raffle) => {
    if (points >= raffle.pointsPerTicket) {
      buyTicket(raffle.id, raffle.title, raffle.pointsPerTicket);
      showToast('Participacao confirmada! Boa sorte!');
    } else {
      showToast('Saldo de pontos insuficiente!');
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-16">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-[0.2em] mb-4">
              <Star className="w-4 h-4" />
              Clube de Lealdade
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-secondary font-bold tracking-tight mb-4">
              Troque seus pontos por <span className="italic">sorte</span>.
            </h1>
            <p className="text-secondary/60 text-lg leading-relaxed">
              Cada R$ 1,00 em compras vira 1 ponto. Acumule e troque por bilhetes para nossos sorteios exclusivos.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-secondary/5 shadow-xl shadow-secondary/5 relative overflow-hidden flex flex-col items-center text-center min-w-[280px]">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-secondary/40 mb-2">Seu Saldo Atual</span>
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-6 h-6 text-primary fill-primary" />
              <span className="text-4xl font-serif font-bold text-secondary">{points}</span>
            </div>
            <span className="text-[13px] font-medium text-secondary/60 italic">Pontos Acumulados</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-8">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-xl font-bold uppercase tracking-widest text-secondary">Sorteios Ativos</h2>
              <div className="h-px flex-1 bg-secondary/10" />
            </div>

            {activeRaffles.map((raffle) => (
              <motion.div
                key={raffle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[32px] overflow-hidden border border-secondary/5 shadow-2xl shadow-secondary/5 group"
              >
                <div className="grid md:grid-cols-2">
                  <div className="h-64 md:h-full relative overflow-hidden bg-neutral-100">
                    {raffle.image ? (
                      <img src={raffle.image} alt={raffle.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-neutral-300">
                        <Trophy className="w-14 h-14" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent md:hidden" />
                    <div className="absolute bottom-6 left-6 text-white md:hidden">
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-primary px-3 py-1 rounded-full">{raffle.pointsPerTicket} PTS p/ bilhete</span>
                    </div>
                  </div>
                  <div className="p-8 md:p-12 flex flex-col justify-center">
                    <div className="hidden md:block mb-6">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] bg-primary/10 text-primary px-4 py-1.5 rounded-full">
                        {raffle.pointsPerTicket} Pontos por bilhete
                      </span>
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-secondary mb-4">{raffle.title}</h3>
                    <p className="text-secondary/60 mb-8 leading-relaxed text-[15px]">{raffle.description}</p>

                    <div className="space-y-4 mb-10">
                      <div className="flex items-center gap-3 text-secondary/70">
                        <Gift className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">{raffle.prize}</span>
                      </div>
                      <div className="flex items-center gap-3 text-secondary/70">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="text-sm font-medium">
                          Sorteio em: {raffle.drawDate ? new Date(`${raffle.drawDate}T00:00:00`).toLocaleDateString('pt-BR') : 'Em breve'}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuy(raffle)}
                      disabled={points < raffle.pointsPerTicket}
                      className={cn(
                        "w-full py-4 rounded-full text-[12px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                        points >= raffle.pointsPerTicket
                          ? "bg-secondary text-white hover:bg-secondary/90 shadow-lg shadow-secondary/20"
                          : "bg-neutral-100 text-neutral-400 cursor-not-allowed",
                      )}
                    >
                      <Ticket className="w-5 h-5" />
                      {points >= raffle.pointsPerTicket ? 'Participar Agora' : 'Pontos Insuficientes'}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}

            {!activeRaffles.length && (
              <div className="bg-white border border-secondary/5 rounded-[32px] p-12 text-center text-secondary/50">
                Nenhum sorteio ativo no momento.
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-10">
            <div className="bg-secondary p-10 rounded-[32px] text-white overflow-hidden relative">
              <Star className="absolute -top-10 -right-10 w-40 h-40 text-white/5 rotate-12" />
              <h3 className="text-xl font-serif font-bold mb-6">Como funciona?</h3>
              <ul className="space-y-6 relative z-10">
                {[
                  { title: 'Compre', desc: 'Cada real gasto na loja equivale a 1 ponto de lealdade.' },
                  { title: 'Acumule', desc: 'Seus pontos ficam salvos na sua conta.' },
                  { title: 'Participe', desc: 'Troque seus pontos acumulados por bilhetes.' },
                ].map((item, idx) => (
                  <li key={item.title} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center text-[12px] font-bold shrink-0">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-bold text-[13px] uppercase tracking-wider mb-1">{item.title}</p>
                      <p className="text-white/60 text-[13px] leading-relaxed">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white border border-secondary/5 rounded-[32px] p-8 shadow-xl shadow-secondary/5">
              <h3 className="text-lg font-serif font-bold text-secondary mb-6 flex items-center justify-between">
                Seus Bilhetes
                <span className="text-[11px] font-sans font-bold bg-secondary/5 text-secondary px-3 py-1 rounded-full">{tickets.length}</span>
              </h3>

              {tickets.length > 0 ? (
                <div className="space-y-4">
                  {tickets.slice().reverse().map((ticket: any) => (
                    <div key={ticket.id} className="p-4 bg-[#FBFBFA] rounded-2xl border border-secondary/5 flex items-center justify-between">
                      <div>
                        <p className="text-[13px] font-bold text-secondary uppercase truncate max-w-[150px]">{ticket.raffleTitle}</p>
                        <p className="text-[10px] text-secondary/40 font-mono tracking-wider">#{ticket.number}</p>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Confirmado</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 px-6">
                  <Ticket className="w-10 h-10 text-secondary/10 mx-auto mb-4" />
                  <p className="text-secondary/40 text-[13px] italic">Voce ainda nao possui bilhetes para sorteios ativos.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
