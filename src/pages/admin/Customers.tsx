import React, { useState } from 'react';
import { Search, Eye, Edit, Mail, Phone } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';

export function Customers() {
  const [searchTerm, setSearchTerm] = useState('');

  const handleAction = (action: string, name: string) => {
    showToast(`${action}: ${name}`);
  };

  const customers = [
    { id: '1', name: 'Cliente Teste', email: 'cliente@exemplo.com', phone: '(11) 99999-9999', orders: 12, total: 'R$ 4.500,00', status: 'Ativo' },
    { id: '2', name: 'Maria Silva', email: 'maria@exemplo.com', phone: '(21) 98888-8888', orders: 5, total: 'R$ 1.250,90', status: 'Ativo' },
    { id: '3', name: 'João Souza', email: 'joao@exemplo.com', phone: '(31) 97777-7777', orders: 1, total: 'R$ 89,90', status: 'Ativo' },
    { id: '4', name: 'Ana Paula', email: 'ana@exemplo.com', phone: '(41) 96666-6666', orders: 0, total: 'R$ 0,00', status: 'Inativo' },
    { id: '5', name: 'Carlos Eduardo', email: 'carlos@exemplo.com', phone: '(51) 95555-5555', orders: 3, total: 'R$ 850,50', status: 'Ativo' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Clientes</h2>
          <p className="text-neutral-500 text-[13px]">Gerencie os clientes e o histórico de compras.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Filters and Search */}
        <div className="p-6 border-b border-neutral-100/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 text-[13px] transition-all bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cliente</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Contato</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-center">Pedidos</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Total Gasto</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-neutral-50/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6">
                     <div className="font-medium text-[13px] text-neutral-900 group-hover:text-blue-600 transition-colors">{customer.name}</div>
                     <div className="text-[11px] font-medium text-neutral-400 mt-0.5 tracking-wide">ID: {customer.id}</div>
                  </td>
                  <td className="py-4 px-6">
                     <div className="text-[13px] text-neutral-600 flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-neutral-400" /> {customer.email}
                     </div>
                     <div className="text-[13px] text-neutral-600 flex items-center gap-2 mt-1">
                        <Phone className="w-3.5 h-3.5 text-neutral-400" /> {customer.phone}
                     </div>
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-600 text-center font-medium">
                     {customer.orders}
                  </td>
                  <td className="py-4 px-6 text-[13px] font-medium text-neutral-900 text-right">
                    {customer.total}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold
                      ${customer.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-600'}
                    `}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAction('Editar cliente', customer.name); }}
                        className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-100" 
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAction('Ver detalhes do cliente', customer.name); }}
                        className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-100" 
                        title="Ver Detalhes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-neutral-100/60 flex items-center justify-between text-[13px] text-neutral-500 bg-white">
          <div>Mostrando <span className="font-medium text-neutral-900">1</span> a <span className="font-medium text-neutral-900">5</span> de <span className="font-medium text-neutral-900">1.254</span> clientes</div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleAction('Navegar para página anterior', 'previous')}
              className="px-4 py-2 border border-neutral-200/60 rounded-xl hover:bg-neutral-50 disabled:opacity-50 text-[11px] font-semibold uppercase tracking-wider transition-colors"
            >
              Anterior
            </button>
            <button 
              onClick={() => handleAction('Navegar para próxima página', 'next')}
              className="px-4 py-2 border border-neutral-200/60 rounded-xl hover:bg-neutral-50 text-neutral-900 text-[11px] font-semibold uppercase tracking-wider transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
