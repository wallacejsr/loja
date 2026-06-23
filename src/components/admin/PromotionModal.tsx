import React, { useState } from 'react';
import { X, Save, Percent, Calendar, Tag, Package, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/adminUtils';
import { useAdminCurrency } from '../../hooks/useAdminCurrency';
import { useStoreProducts } from '../../hooks/useStoreData';

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'general' | 'products' | 'schedule';

export function PromotionModal({ isOpen, onClose }: PromotionModalProps) {
  const { currencyCode } = useAdminCurrency();
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const products = useStoreProducts();

  const tabs = [
    { id: 'general', name: 'Geral', icon: Tag },
    { id: 'products', name: 'Produtos', icon: Package },
    { id: 'schedule', name: 'Agendamento', icon: Calendar },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Promoção criada com sucesso!');
    onClose();
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = products.filter(p => 
    p.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-neutral-900">Nova Promoção</h3>
                  <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Campanhas e Descontos</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-neutral-200/50 rounded-full transition-colors text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-neutral-100 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-4 text-[13px] font-semibold transition-all relative",
                    activeTab === tab.id 
                      ? "text-neutral-900" 
                      : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                  {activeTab === tab.id && (
                    <motion.div 
                      layoutId="activeTabPromotion"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Nome da Campanha</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Black Friday 2024"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Tipo de Desconto</label>
                        <select className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] appearance-none">
                          <option>Porcentagem (%)</option>
                          <option>{`Valor Fixo (${currencyCode})`}</option>
                          <option>Frete Grátis</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Valor do Desconto</label>
                        <input 
                          type="number" 
                          placeholder="0"
                          className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 text-neutral-500">Código do Cupom (Opcional)</label>
                      <input 
                        type="text" 
                        placeholder="BLACK10"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'products' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Buscar produtos para aplicar desconto..."
                      className="w-full pl-10 pr-4 py-3 border border-neutral-200/60 bg-neutral-50/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 text-[13px]"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto border border-neutral-100 rounded-xl divide-y divide-neutral-100">
                    {filteredProducts.map(produto => (
                      <div 
                        key={produto.id}
                        onClick={() => toggleProduct(produto.id)}
                        className={cn(
                          "flex items-center gap-4 p-4 cursor-pointer hover:bg-neutral-50 transition-colors",
                          selectedProducts.includes(produto.id) && "bg-neutral-50/80"
                        )}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                          selectedProducts.includes(produto.id) 
                            ? "bg-neutral-900 border-neutral-900 text-white" 
                            : "border-neutral-200 bg-white"
                        )}>
                          {selectedProducts.includes(produto.id) && <X className="w-3 h-3 rotate-45" />}
                        </div>
                        <img src={produto.imagem} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-neutral-900 truncate">{produto.nome}</p>
                          <p className="text-[11px] text-neutral-500">{produto.preco}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    {selectedProducts.length} produtos selecionados
                  </p>
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Início da Promoção</label>
                      <input 
                        type="datetime-local" 
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Término (Opcional)</label>
                      <input 
                        type="datetime-local" 
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                    <p className="text-[12px] text-amber-700 leading-relaxed font-medium">
                      Nota: Se agendado para o futuro, o desconto só ficará ativo no site no horário definido. Caso deixe o término vazio, a promoção ficará ativa por tempo indeterminado.
                    </p>
                  </div>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50/50">
              <button 
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave}
                type="submit"
                className="bg-neutral-950 text-white px-8 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10"
              >
                <Save className="w-4 h-4" />
                Criar Campanha
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
