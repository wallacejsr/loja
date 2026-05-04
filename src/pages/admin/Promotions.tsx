import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Tag, Users, Calendar, Percent, ArrowUpRight } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { PromotionModal } from '../../components/admin/PromotionModal';
import { cn } from '../../lib/utils';

export function Promotions() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const promotions = [
    { 
      id: '1', 
      name: 'Black Friday 2024', 
      type: 'cupom', 
      code: 'BLACK10', 
      discount: '10%', 
      redemptions: 145, 
      revenue: 'R$ 12.430,00',
      status: 'Ativo',
      expiry: '2024-11-30'
    },
    { 
      id: '2', 
      name: 'Liquidação de Verão', 
      type: 'direto', 
      code: '-', 
      discount: '25%', 
      redemptions: 890, 
      revenue: 'R$ 45.120,00',
      status: 'Finalizado',
      expiry: '2024-02-15'
    },
    { 
      id: '3', 
      name: 'Primeira Compra', 
      type: 'cupom', 
      code: 'WELCOME10', 
      discount: '10%', 
      redemptions: 2134, 
      revenue: 'R$ 89.900,00',
      status: 'Ativo',
      expiry: 'Até revogar'
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Promoções & Cupons</h2>
          <p className="text-neutral-500 text-[13px]">Gerencie suas campanhas de marketing e descontos.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0A0A0A] text-white px-5 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Promoção
        </button>
      </div>

      <PromotionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total de Resgates</span>
          </div>
          <p className="text-2xl font-serif font-bold text-neutral-900">3,169</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Conversão de Ativos</span>
          </div>
          <p className="text-2xl font-serif font-bold text-neutral-900">12.4%</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
              <Percent className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Ticket Médio (Promo)</span>
          </div>
          <p className="text-2xl font-serif font-bold text-neutral-900">R$ 184,30</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 border-b border-neutral-100/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Buscar promoção ou código..."
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50/50 border border-neutral-100 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 text-[13px] transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100/60">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Campanha</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Código</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Desconto</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Resgates</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Receita</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {promotions.map((promo) => (
                <tr key={promo.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center">
                        <Tag className="w-4 h-4 text-neutral-400" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-neutral-900">{promo.name}</p>
                        <div className="flex items-center gap-1 text-[11px] text-neutral-400">
                           <Calendar className="w-3 h-3" />
                           Expira: {promo.expiry}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[11px] font-mono font-bold bg-neutral-100 px-2 py-1 rounded text-neutral-600">
                      {promo.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] font-bold text-neutral-900">{promo.discount}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-neutral-600 font-medium">{promo.redemptions}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[13px] text-neutral-900 font-bold">{promo.revenue}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full",
                      promo.status === 'Ativo' 
                        ? "bg-green-50 text-green-700 border border-green-100" 
                        : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                    )}>
                      {promo.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => showToast(`Editando ${promo.name}`)}
                        className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => showToast(`Removendo ${promo.name}`)}
                        className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
