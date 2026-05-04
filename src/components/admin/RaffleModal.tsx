import React, { useState } from 'react';
import { X, Save, Trophy, Calendar, FileText, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/adminUtils';

interface RaffleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'general' | 'details';

export function RaffleModal({ isOpen, onClose }: RaffleModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  const tabs = [
    { id: 'general', name: 'Geral', icon: Trophy },
    { id: 'details', name: 'Detalhes', icon: FileText },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Sorteio criado com sucesso!');
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
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-neutral-900">Novo Sorteio</h3>
                  <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Clube de Lealdade</p>
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
                      layoutId="activeTabRaffle"
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
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Nome do Sorteio / Prêmio</label>
                      <input 
                        type="text" 
                        required
                        placeholder="Ex: Uma viagem para as Maldivas"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                    
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Pontos Necessários</label>
                        <input 
                          type="number" 
                          required
                          placeholder="Ex: 500"
                          className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Total de Participantes (Opcional)</label>
                        <input 
                          type="number" 
                          placeholder="Ex: 1000"
                          className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Data do Sorteio</label>
                      <div className="relative">
                         <Calendar className="w-4 h-4 text-neutral-400 absolute left-4 top-3.5" />
                         <input 
                           type="date" 
                           required
                           className="w-full border border-neutral-200/60 pl-10 pr-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                         />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">URL da Imagem</label>
                    <div className="relative">
                      <ImageIcon className="w-4 h-4 text-neutral-400 absolute left-4 top-3.5" />
                      <input 
                        type="url" 
                        placeholder="https://exemplo.com/imagem.jpg"
                        className="w-full border border-neutral-200/60 pl-10 pr-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Descrição e Regras</label>
                    <textarea 
                      rows={5}
                      placeholder="Descreva as regras do sorteio..."
                      className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] resize-none"
                    ></textarea>
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
                Criar Sorteio
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
