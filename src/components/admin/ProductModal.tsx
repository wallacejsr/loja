import React, { useState } from 'react';
import { X, Save, Box, DollarSign, Image as ImageIcon, Info, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/adminUtils';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'info' | 'pricing' | 'media';

export function ProductModal({ isOpen, onClose }: ProductModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');

  const tabs = [
    { id: 'info', name: 'Informações', icon: Info },
    { id: 'pricing', name: 'Preços & Estoque', icon: DollarSign },
    { id: 'media', name: 'Mídia', icon: ImageIcon },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Produto cadastrado com sucesso!');
    onClose();
  };

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
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-neutral-900">Novo Produto</h3>
                  <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Cadastro de Catálogo</p>
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
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              {activeTab === 'info' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Nome do Produto</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Camiseta Cotton Premium"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Descrição Curta</label>
                      <textarea 
                        rows={3} 
                        placeholder="Uma breve descrição para a listagem..."
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] resize-none"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Categoria</label>
                        <select className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] appearance-none">
                          <option>Selecione...</option>
                          <option>Camisetas</option>
                          <option>Calças</option>
                          <option>Acessórios</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">SKU / Referência</label>
                        <input 
                          type="text" 
                          placeholder="ABC-123"
                          className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Preço de Venda (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0,00"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Preço Promocional (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0,00"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Quantidade em Estoque</label>
                      <input 
                        type="number" 
                        placeholder="0"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="border-2 border-dashed border-neutral-200 rounded-2xl p-12 text-center hover:border-neutral-300 transition-colors cursor-pointer bg-neutral-50/30">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-neutral-100">
                        <Plus className="w-5 h-5 text-neutral-400" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-neutral-900">Clique para selecionar</p>
                        <p className="text-[11px] text-neutral-500 font-medium">Ou arraste as imagens aqui</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                     {[1,2,3,4].map(i => (
                        <div key={i} className="aspect-square bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center border-dashed">
                           <ImageIcon className="w-5 h-5 text-neutral-200" />
                        </div>
                     ))}
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
                Descartar
              </button>
              <button 
                onClick={handleSave}
                type="submit"
                className="bg-neutral-950 text-white px-8 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10"
              >
                <Save className="w-4 h-4" />
                Salvar Produto
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
