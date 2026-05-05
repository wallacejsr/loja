import React, { useEffect, useState } from 'react';
import { X, Save, Folder, Info, Link as LinkIcon, Image as ImageIcon, ListOrdered } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { showToast } from '../../lib/adminUtils';
import { CategoryInput, StoreCategory } from '../../lib/storeApi';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  category?: StoreCategory | null;
  onSave: (category: CategoryInput) => Promise<void>;
}

const slugify = (value: string) => value
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\s+/g, '-')
  .replace(/[^\w-]+/g, '');

export function CategoryModal({ isOpen, onClose, category, onSave }: CategoryModalProps) {
  const [formData, setFormData] = useState<CategoryInput>({
    nome: '',
    slug: '',
    imagem: '',
    status: 'Ativo',
    showInMenu: true,
    menuOrder: 100,
  });
  const [isSaving, setIsSaving] = useState(false);
  const isEditing = Boolean(category);

  useEffect(() => {
    if (!isOpen) return;
    setFormData(category ? {
      nome: category.nome,
      slug: category.slug,
      imagem: category.imagem,
      status: category.status,
      showInMenu: category.showInMenu,
      menuOrder: category.menuOrder,
    } : {
      nome: '',
      slug: '',
      imagem: '',
      status: 'Ativo',
      showInMenu: true,
      menuOrder: 100,
    });
  }, [isOpen, category?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || !formData.slug) {
      showToast('Preencha nome e slug da categoria.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
      showToast(isEditing ? 'Categoria atualizada com sucesso!' : 'Categoria criada com sucesso!');
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar a categoria.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateName = (nome: string) => {
    setFormData((prev) => ({ ...prev, nome, slug: category ? prev.slug : slugify(nome) }));
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
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-neutral-900">{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</h3>
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
                    onChange={(e) => updateName(e.target.value)}
                    placeholder="Ex: Calças"
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                      className="w-full border border-neutral-200/60 pl-8 pr-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> URL da Imagem
                  </label>
                  <input
                    type="url"
                    value={formData.imagem}
                    onChange={(e) => setFormData((prev) => ({ ...prev, imagem: e.target.value }))}
                    placeholder="https://exemplo.com/categoria.png"
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as CategoryInput['status'] }))}
                      className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                      <ListOrdered className="w-3 h-3" /> Ordem
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.menuOrder}
                      onChange={(e) => setFormData((prev) => ({ ...prev, menuOrder: Number(e.target.value) }))}
                      className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                    />
                  </div>
                </div>

                <label className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-100 bg-neutral-50/60 px-4 py-3 cursor-pointer">
                  <div>
                    <span className="block text-[12px] font-bold text-neutral-900">Exibir no menu principal</span>
                    <span className="block text-[11px] text-neutral-500 mt-0.5">Apenas as 7 primeiras pela ordem ficam visíveis.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.showInMenu}
                    onChange={(e) => setFormData((prev) => ({ ...prev, showInMenu: e.target.checked }))}
                    className="w-5 h-5 accent-neutral-900"
                  />
                </label>
              </div>
            </form>

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
                disabled={isSaving}
                className="bg-neutral-950 text-white px-8 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10 disabled:opacity-60 disabled:cursor-wait"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Criar Categoria'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
