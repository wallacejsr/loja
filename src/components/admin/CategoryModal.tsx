import React, { useState } from 'react';
import { X, Save, Folder, Info, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../lib/adminUtils';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CategoryModal({ isOpen, onClose }: CategoryModalProps) {
  const [formData, setFormData] = useState({
    nome: '',
    slug: '',
    descricao: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Categoria criada com sucesso!');
    onClose();
  };

  const updateSlug = (nome: string) => {
    const slug = nome.toLowerCase()
      .normalize('NFD') // remove accents
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
    setFormData(prev => ({ ...prev, nome, slug }));
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
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-neutral-900">Nova Categoria</h3>
                  <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Gestão de Catálogo</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-neutral-200/50 rounded-full transition-colors text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSave} className="p-8 space-y-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                    <Info className="w-3 h-3" /> Nome da Categoria
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formData.nome}
                    onChange={(e) => updateSlug(e.target.value)}
                    placeholder="Ex: Camisetas Premium"
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                    <LinkIcon className="w-3 h-3" /> Slug da URL
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 text-[13px] text-neutral-400">/</span>
                    <input 
                      type="text" 
                      required
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full border border-neutral-200/60 pl-8 pr-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 font-medium">O slug é usado no link da página da categoria.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                    Descrição (Opcional)
                  </label>
                  <textarea 
                    rows={3}
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descreva o propósito desta categoria..."
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] resize-none"
                  />
                </div>
              </div>
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
                className="bg-neutral-950 text-white px-8 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10"
              >
                <Save className="w-4 h-4" />
                Criar Categoria
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
