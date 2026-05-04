import React, { useState } from 'react';
import { X, Save, Image as ImageIcon, Link as LinkIcon, Type } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../lib/adminUtils';

interface BannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BannerModal({ isOpen, onClose }: BannerModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    image: '',
    link: ''
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.image) {
      showToast('Por favor, preencha o título e a imagem.');
      return;
    }
    showToast('Banner criado com sucesso!');
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
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-neutral-900">Novo Banner</h3>
                  <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Destaques da Home</p>
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
                    <Type className="w-3 h-3" /> Título do Banner
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Coleção de Inverno 2024"
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> URL da Imagem
                  </label>
                  <input 
                    type="url" 
                    required
                    value={formData.image}
                    onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                  />
                  {formData.image && (
                    <div className="mt-2 aspect-[21/9] rounded-xl overflow-hidden border border-neutral-100 bg-neutral-50">
                      <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                    <LinkIcon className="w-3 h-3" /> Link de Destino
                  </label>
                  <input 
                    type="text" 
                    value={formData.link}
                    onChange={(e) => setFormData(prev => ({ ...prev, link: e.target.value }))}
                    placeholder="/colecao/verao"
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
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
                type="submit"
                className="bg-neutral-950 text-white px-8 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10"
              >
                <Save className="w-4 h-4" />
                Criar Banner
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
