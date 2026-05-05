import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Save, Box, DollarSign, Image as ImageIcon, Info, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/adminUtils';
import { useStoreData } from '../../hooks/useStoreData';
import { uploadProductImage } from '../../lib/storeApi';
import { Product } from '../../data/mockData';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

type TabType = 'info' | 'pricing' | 'media';

interface PendingImage {
  id: string;
  file?: File;
  preview: string;
  existingUrl?: string;
}

export function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    sku: '',
    preco: '',
    precoPromocional: '',
    estoque: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { categories, addProduct, editProduct } = useStoreData();
  const isEditing = Boolean(product);

  const tabs = [
    { id: 'info', name: 'Informações', icon: Info },
    { id: 'pricing', name: 'Preços & Estoque', icon: DollarSign },
    { id: 'media', name: 'Mídia', icon: ImageIcon },
  ];

  const categoryOptions = useMemo(() => categories.map((category) => category.nome), [categories]);

  const releaseImagePreviews = (items: PendingImage[]) => {
    items.forEach((image) => {
      if (!image.existingUrl) URL.revokeObjectURL(image.preview);
    });
  };

  const resetForm = () => {
    releaseImagePreviews(images);
    setImages([]);
    setFormData({
      nome: '',
      descricao: '',
      categoria: '',
      sku: '',
      preco: '',
      precoPromocional: '',
      estoque: '',
    });
    setActiveTab('info');
  };

  useEffect(() => {
    if (!isOpen) return;

    releaseImagePreviews(images);
    if (!product) {
      setImages([]);
      setFormData({
        nome: '',
        descricao: '',
        categoria: '',
        sku: '',
        preco: '',
        precoPromocional: '',
        estoque: '',
      });
      setActiveTab('info');
      return;
    }

    setImages(product.imagens.slice(0, 4).map((url) => ({
      id: crypto.randomUUID(),
      preview: url,
      existingUrl: url,
    })));
    setFormData({
      nome: product.nome,
      descricao: product.descricao,
      categoria: product.categoria,
      sku: product.id,
      preco: String(product.preco),
      precoPromocional: product.precoPromocional ? String(product.precoPromocional) : '',
      estoque: String(product.estoque),
    });
    setActiveTab('info');
  }, [isOpen, product?.id]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addFiles = (files: FileList | File[]) => {
    const nextImages = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, Math.max(0, 4 - images.length))
      .map((file) => ({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      }));

    if (!nextImages.length) return;
    setImages((current) => [...current, ...nextImages]);
  };

  const removeImage = (id: string) => {
    setImages((current) => {
      const image = current.find((item) => item.id === id);
      if (image && !image.existingUrl) URL.revokeObjectURL(image.preview);
      return current.filter((item) => item.id !== id);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nome || !formData.categoria || !formData.preco || !formData.estoque) {
      showToast('Preencha nome, categoria, preço e estoque.');
      setActiveTab(!formData.nome || !formData.categoria ? 'info' : 'pricing');
      return;
    }

    if (!images.length) {
      showToast('Adicione pelo menos uma imagem do produto.');
      setActiveTab('media');
      return;
    }

    setIsSaving(true);
    try {
      const imageUrls = await Promise.all(images.map((image) => (
        image.existingUrl || (image.file ? uploadProductImage(image.file) : '')
      )));
      const payload = {
        id: formData.sku || undefined,
        nome: formData.nome,
        preco: Number(formData.preco),
        precoPromocional: formData.precoPromocional ? Number(formData.precoPromocional) : undefined,
        categoria: formData.categoria as Product['categoria'],
        subcategoria: '',
        imagens: imageUrls,
        descricao: formData.descricao,
        composicao: '',
        tamanhos: [],
        cores: [],
        estoque: Number(formData.estoque),
      };

      if (product) {
        await editProduct(product.id, payload);
        showToast('Produto atualizado com sucesso!');
      } else {
        await addProduct(payload);
        showToast('Produto cadastrado com sucesso!');
      }
      handleClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível salvar o produto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-neutral-900">{isEditing ? 'Editar Produto' : 'Novo Produto'}</h3>
                  <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Cadastro de Catálogo</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-neutral-200/50 rounded-full transition-colors text-neutral-400 hover:text-neutral-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-neutral-100 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-4 text-[13px] font-semibold transition-all relative',
                    activeTab === tab.id ? 'text-neutral-900' : 'text-neutral-400 hover:text-neutral-600',
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

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 space-y-6">
              {activeTab === 'info' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="grid gap-6">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Nome do Produto</label>
                      <input
                        type="text"
                        required
                        value={formData.nome}
                        onChange={(e) => setFormData((prev) => ({ ...prev, nome: e.target.value }))}
                        placeholder="Ex: Camiseta Cotton Premium"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Descrição Curta</label>
                      <textarea
                        rows={3}
                        value={formData.descricao}
                        onChange={(e) => setFormData((prev) => ({ ...prev, descricao: e.target.value }))}
                        placeholder="Uma breve descrição para a listagem..."
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] resize-none"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Categoria</label>
                        <select
                          required
                          value={formData.categoria}
                          onChange={(e) => setFormData((prev) => ({ ...prev, categoria: e.target.value }))}
                          className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] appearance-none"
                        >
                          <option value="">Selecione...</option>
                          {categoryOptions.map((category) => (
                            <option key={category} value={category}>{category}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">SKU / Referência</label>
                        <input
                          type="text"
                          value={formData.sku}
                          onChange={(e) => setFormData((prev) => ({ ...prev, sku: e.target.value }))}
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
                        min="0"
                        step="0.01"
                        required
                        value={formData.preco}
                        onChange={(e) => setFormData((prev) => ({ ...prev, preco: e.target.value }))}
                        placeholder="0,00"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Preço Promocional (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.precoPromocional}
                        onChange={(e) => setFormData((prev) => ({ ...prev, precoPromocional: e.target.value }))}
                        placeholder="0,00"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Quantidade em Estoque</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={formData.estoque}
                        onChange={(e) => setFormData((prev) => ({ ...prev, estoque: e.target.value }))}
                        placeholder="0"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'media' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      addFiles(e.dataTransfer.files);
                    }}
                    className="w-full border-2 border-dashed border-neutral-200 rounded-2xl p-12 text-center hover:border-neutral-300 transition-colors cursor-pointer bg-neutral-50/30"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm border border-neutral-100">
                        <Plus className="w-5 h-5 text-neutral-400" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-neutral-900">Clique para selecionar</p>
                        <p className="text-[11px] text-neutral-500 font-medium">Ou arraste as imagens aqui</p>
                      </div>
                    </div>
                  </button>
                  <div className="grid grid-cols-4 gap-4">
                    {[0, 1, 2, 3].map((index) => {
                      const image = images[index];
                      return (
                        <div key={image?.id || index} className="aspect-square bg-neutral-50 border border-neutral-100 rounded-xl flex items-center justify-center border-dashed overflow-hidden relative group">
                          {image ? (
                            <>
                              <img src={image.preview} alt={`Produto ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => removeImage(image.id)}
                                className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-neutral-500 hover:text-red-600 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover imagem"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <ImageIcon className="w-5 h-5 text-neutral-200" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </form>

            <div className="px-8 py-6 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50/50">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Descartar
              </button>
              <button
                onClick={handleSave}
                type="submit"
                disabled={isSaving}
                className="bg-neutral-950 text-white px-8 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10 disabled:opacity-60 disabled:cursor-wait"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Salvar Produto'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
