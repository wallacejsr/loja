import React, { useState } from 'react';
import { Eye, Search, MessageSquare } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';

export function Orders() {
  const [searchTerm, setSearchTerm] = useState('');

  const handleAction = (action: string, id: string) => {
    showToast(`${action}: ${id}`);
  };

  const recentOrders = [
    { id: '#1234', customer: 'Maria Silva', email: 'maria@exemplo.com', date: 'Hoje, 10:23', total: 'R$ 359,90', status: 'Pago', items: 2 },
    { id: '#1233', customer: 'João Souza', email: 'joao@exemplo.com', date: 'Hoje, 09:12', total: 'R$ 1.250,00', status: 'Aguardando Pagamento', items: 5 },
    { id: '#1232', customer: 'Ana Paula', email: 'ana@exemplo.com', date: 'Ontem, 16:45', total: 'R$ 89,90', status: 'Enviado', items: 1 },
    { id: '#1231', customer: 'Carlos Eduardo', email: 'carlos@exemplo.com', date: 'Ontem, 14:20', total: 'R$ 450,50', status: 'Entregue', items: 3 },
    { id: '#1230', customer: 'Fernanda Lima', email: 'fernanda@exemplo.com', date: '01/05/2026', total: 'R$ 299,00', status: 'Cancelado', items: 2 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Pedidos</h2>
          <p className="text-neutral-500 text-[13px]">Gerencie e acompanhe os pedidos da loja.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Filters and Search */}
        <div className="p-6 border-b border-neutral-100/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar por ID, cliente ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 text-[13px] transition-all bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
             <select className="border border-neutral-200/60 bg-neutral-50/50 hover:bg-neutral-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 rounded-xl transition-colors focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 appearance-none">
                <option value="">Todos os Status</option>
                <option value="pago">Pago</option>
                <option value="aguardando">Aguardando Pagamento</option>
                <option value="enviado">Enviado</option>
                <option value="entregue">Entregue</option>
                <option value="cancelado">Cancelado</option>
             </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Pedido</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cliente</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Data</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Itens</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Total</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6 font-medium text-[13px] text-neutral-900 group-hover:text-blue-600 transition-colors">{order.id}</td>
                  <td className="py-4 px-6">
                     <div className="text-[13px] font-medium text-neutral-900">{order.customer}</div>
                     <div className="text-[11px] font-medium text-neutral-400 mt-0.5 tracking-wide">{order.email}</div>
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-600">
                    {order.date}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full capitalize
                        ${order.status === 'Pago' ? 'bg-emerald-50 text-emerald-600' : ''}
                        ${order.status === 'Aguardando Pagamento' ? 'bg-amber-50 text-amber-600' : ''}
                        ${order.status === 'Enviado' ? 'bg-blue-50 text-blue-600' : ''}
                        ${order.status === 'Entregue' ? 'bg-neutral-100 text-neutral-600' : ''}
                        ${order.status === 'Cancelado' ? 'bg-red-50 text-red-600' : ''}
                      `}>
                        {order.status}
                      </span>
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-600">
                    {order.items}
                  </td>
                  <td className="py-4 px-6 text-[13px] font-medium text-neutral-900 text-right">
                    {order.total}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAction('Contatar cliente', order.customer); }}
                        className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-100" 
                        title="Contatar"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAction('Ver detalhes do pedido', order.id); }}
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
          <div>Mostrando <span className="font-medium text-neutral-900">1</span> a <span className="font-medium text-neutral-900">5</span> de <span className="font-medium text-neutral-900">150</span> pedidos</div>
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
