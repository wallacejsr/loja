import React, { useState } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Image as ImageIcon, AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { showToast } from '../../lib/adminUtils';
import { ProductModal } from '../../components/admin/ProductModal';
import { useStoreData } from '../../hooks/useStoreData';
import { Product } from '../../data/mockData';

export function Products() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { products, removeProduct } = useStoreData();
  const filteredProducts = products.filter((produto) => (
    produto.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    produto.id.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  const handleAction = (action: string, name?: string) => {
    showToast(`${action}${name ? `: ${name}` : ''}`);
  };

  const handleNewProduct = () => {
    setSelectedProduct(null);
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await removeProduct(productToDelete.id);
      showToast('Produto excluído com sucesso!');
      setProductToDelete(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível excluir o produto.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Produtos</h2>
          <p className="text-neutral-500 text-[13px]">Gerencie seu catálogo de produtos.</p>
        </div>
        <button 
          onClick={handleNewProduct}
          className="bg-[#0A0A0A] text-white px-5 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </button>
      </div>

      <ProductModal isOpen={isModalOpen} product={selectedProduct} onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }} />

      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setProductToDelete(null)}
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
                    <h3 className="text-base font-bold text-neutral-900">Excluir produto?</h3>
                    <p className="text-[13px] text-neutral-500 mt-1 leading-relaxed">
                      Deseja excluir o produto <span className="font-semibold text-neutral-900">"{productToDelete.nome}"</span>?
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setProductToDelete(null)}
                  className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 py-5 bg-neutral-50/60 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setProductToDelete(null)}
                  className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteProduct}
                  className="bg-red-600 text-white px-6 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg shadow-red-600/10 disabled:opacity-60 disabled:cursor-wait"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? 'Excluindo...' : 'Excluir produto'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        {/* Filters and Search */}
        <div className="p-6 border-b border-neutral-100/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 text-[13px] transition-all bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => handleAction('Abrir filtros')}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 border border-neutral-200/60 bg-white px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 rounded-xl transition-colors"
            >
              <Filter className="w-3.5 h-3.5" />
              Filtros
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Produto</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Categoria</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Preço</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Estoque</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              {filteredProducts.map((produto) => (
                <tr key={produto.id} className="hover:bg-neutral-50/50 transition-colors group cursor-pointer">
                  <td className="py-4 px-6 flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#F5F5F7] rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center border border-neutral-200/50">
                      {produto.imagens[0] ? (
                        <img src={produto.imagens[0]} alt={produto.nome} className="w-full h-full object-cover mix-blend-multiply" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-neutral-300" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-[13px] text-neutral-900 group-hover:text-blue-600 transition-colors">{produto.nome}</div>
                      <div className="text-[11px] font-medium text-neutral-400 mt-0.5 tracking-wide">REF: {produto.id}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-600 capitalize">
                    {produto.categoria}
                  </td>
                  <td className="py-4 px-6 text-[13px] font-medium text-neutral-900">
                    R$ {produto.preco.toFixed(2).replace('.', ',')}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600">
                      Em estoque
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleEditProduct(produto); }}
                        className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-100" 
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setProductToDelete(produto); }}
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
        
        {/* Pagination */}
        <div className="p-4 border-t border-neutral-100/60 flex items-center justify-between text-[13px] text-neutral-500 bg-white">
          <div>Mostrando <span className="font-medium text-neutral-900">{filteredProducts.length ? 1 : 0}</span> a <span className="font-medium text-neutral-900">{filteredProducts.length}</span> de <span className="font-medium text-neutral-900">{products.length}</span> resultados</div>
          <div className="flex gap-2">
            <button 
              onClick={() => handleAction('Navegar para página anterior')}
              className="px-4 py-2 border border-neutral-200/60 rounded-xl hover:bg-neutral-50 disabled:opacity-50 text-[11px] font-semibold uppercase tracking-wider transition-colors"
            >
              Anterior
            </button>
            <button 
              onClick={() => handleAction('Navegar para próxima página')}
              className="px-4 py-2 border border-neutral-200/60 rounded-xl hover:bg-neutral-50 disabled:opacity-50 text-[11px] font-semibold uppercase tracking-wider transition-colors"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
