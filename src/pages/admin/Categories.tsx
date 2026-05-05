import React, { useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Search, Link as LinkIcon, Menu, MoreHorizontal, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { showToast } from '../../lib/adminUtils';
import { CategoryModal } from '../../components/admin/CategoryModal';
import { useStoreData } from '../../hooks/useStoreData';
import { CategoryInput, StoreCategory } from '../../lib/storeApi';

export function Categories() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<StoreCategory | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<StoreCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { categories, addCategory, editCategory, removeCategory } = useStoreData();

  const menuCandidates = useMemo(() => categories
    .filter((categoria) => categoria.status === 'Ativo' && categoria.showInMenu)
    .sort((a, b) => a.menuOrder - b.menuOrder || a.nome.localeCompare(b.nome)), [categories]);
  const visibleMenuIds = new Set(menuCandidates.slice(0, 7).map((categoria) => categoria.id));
  const overflowMenuIds = new Set(menuCandidates.slice(7).map((categoria) => categoria.id));
  const filteredCategories = categories.filter((categoria) => categoria.nome.toLowerCase().includes(searchTerm.toLowerCase()));

  const openNewCategory = () => {
    setSelectedCategory(null);
    setIsModalOpen(true);
  };

  const openEditCategory = (category: StoreCategory) => {
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (category: CategoryInput) => {
    if (selectedCategory) {
      await editCategory(selectedCategory.id, category);
    } else {
      await addCategory(category);
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await removeCategory(categoryToDelete.id);
      showToast('Categoria removida com sucesso!');
      setCategoryToDelete(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível remover a categoria.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Categorias</h2>
          <p className="text-neutral-500 text-[13px]">Organize o catálogo e escolha até 7 categorias para a barra principal.</p>
        </div>
        <button
          onClick={openNewCategory}
          className="bg-[#0A0A0A] text-white px-5 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-neutral-200/40 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Menu principal</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{Math.min(menuCandidates.length, 7)} / 7</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200/40 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Todas as categorias</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{categories.filter((categoria) => categoria.status === 'Ativo').length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-neutral-200/40 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Entram no dropdown</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{overflowMenuIds.size}</p>
        </div>
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        category={selectedCategory}
        onSave={handleSaveCategory}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCategory(null);
        }}
      />

      <AnimatePresence>
        {categoryToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setCategoryToDelete(null)}
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
                    <h3 className="text-base font-bold text-neutral-900">Excluir categoria?</h3>
                    <p className="text-[13px] text-neutral-500 mt-1 leading-relaxed">
                      Deseja excluir a categoria <span className="font-semibold text-neutral-900">"{categoryToDelete.nome}"</span>?
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCategoryToDelete(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5 bg-neutral-50/60 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setCategoryToDelete(null)}
                  className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteCategory}
                  className="bg-red-600 text-white px-6 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-600/10 disabled:opacity-60 disabled:cursor-wait"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Excluindo...' : 'Excluir categoria'}
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
              placeholder="Buscar categorias..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 text-[13px] transition-all bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Nome</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Slug</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Menu</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Ordem</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Home</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Produtos</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              {filteredCategories.map((categoria) => (
                <tr key={categoria.id} className="hover:bg-neutral-50/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6 font-medium text-[13px] text-neutral-900 capitalize group-hover:text-blue-600 transition-colors">{categoria.nome}</td>
                  <td className="py-4 px-6 text-[13px] text-neutral-500">
                    <span className="inline-flex items-center">
                      <LinkIcon className="w-3.5 h-3.5 mr-1.5 text-neutral-400" />
                      /{categoria.slug}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {visibleMenuIds.has(categoria.id) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-600">
                        <Menu className="w-3 h-3" /> Visível
                      </span>
                    ) : overflowMenuIds.has(categoria.id) ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700">
                        <MoreHorizontal className="w-3 h-3" /> Dropdown
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-500">
                        Oculto
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-600">{categoria.menuOrder}</td>
                  <td className="py-4 px-6">
                    {categoria.showOnHome ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700">
                        Exibir
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-neutral-100 text-neutral-500">
                        Não
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${categoria.status === 'Ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-600'}`}>
                      {categoria.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-600">
                    {categoria.productCount || 0}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditCategory(categoria); }}
                        className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-100"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCategoryToDelete(categoria); }}
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
