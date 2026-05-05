import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Link as LinkIcon } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { CategoryModal } from '../../components/admin/CategoryModal';
import { useStoreData } from '../../hooks/useStoreData';

export function Categories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { categories } = useStoreData();
  const filteredCategories = categories.filter((categoria) => categoria.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleAction = (action: string, name?: string) => {
    showToast(`${action}${name ? `: ${name}` : ''}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Categorias</h2>
          <p className="text-neutral-500 text-[13px]">Organize o catálogo de produtos da sua loja.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0A0A0A] text-white px-5 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </button>
      </div>

      <CategoryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Filters and Search */}
        <div className="p-6 border-b border-neutral-100/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar categorias..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
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
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Nome</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Slug (URL)</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Produtos</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              {filteredCategories.map((categoria) => (
                <tr key={categoria.nome} className="hover:bg-neutral-50/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6 font-medium text-[13px] text-neutral-900 capitalize group-hover:text-blue-600 transition-colors">{categoria.nome}</td>
                  <td className="py-4 px-6 text-[13px] text-neutral-500 flex items-center mt-0.5">
                     <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
                     /{categoria.slug}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">
                      Ativo
                    </span>
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-600">
                     {categoria.productCount || 0}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAction('Editar categoria', categoria.nome); }}
                        className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-100" 
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleAction('Excluir categoria', categoria.nome); }}
                        className="p-2 text-neutral-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50" 
                        title="Excluir"
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
