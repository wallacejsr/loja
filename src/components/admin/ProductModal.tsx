import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Save, Box, DollarSign, Image as ImageIcon, Info, Plus, Trash2, SwatchBook } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/adminUtils';
import { useStoreActions, useStoreCategories } from '../../hooks/useStoreData';
import { useAdminCurrency } from '../../hooks/useAdminCurrency';
import { uploadProductImage } from '../../lib/storeApi';
import { Product } from '../../data/mockData';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

type TabType = 'info' | 'pricing' | 'variations' | 'media';

interface PendingImage {
  id: string;
  file?: File;
  preview: string;
  existingUrl?: string;
}

const defaultSizes = ['PP', 'P', 'M', 'G', 'GG', 'XG', '34', '36', '38', '40', '42', '44', '46'];

export function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const { currencyCode } = useAdminCurrency();
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isSaving, setIsSaving] = useState(false);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [isOneSize, setIsOneSize] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSize, setCustomSize] = useState('');
  const [colors, setColors] = useState<{ nome: string; hex: string }[]>([]);
  const [colorDraft, setColorDraft] = useState({ nome: '', hex: '#E3CAA5' });
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    subcategoria: '',
    sku: '',
    preco: '',
    precoPromocional: '',
    estoque: '',
    shippingWeightGrams: '500',
    lancamento: false,
    maisVendido: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const categories = useStoreCategories();
  const { addProduct, editProduct } = useStoreActions();
  const isEditing = Boolean(product);

  const tabs = [
    { id: 'info', name: 'Informações', icon: Info },
    { id: 'pricing', name: 'Preços & Estoque', icon: DollarSign },
    { id: 'variations', name: 'Variações', icon: SwatchBook },
    { id: 'media', name: 'Mídia', icon: ImageIcon },
  ];

  const categoryOptions = useMemo(() => categories.map((category) => category.nome), [categories]);
  const selectedCategory = useMemo(
    () => categories.find((category) => category.nome === formData.categoria) || null,
    [categories, formData.categoria],
  );
  const subcategoryOptions = selectedCategory?.subcategories || [];

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
      subcategoria: '',
      sku: '',
      preco: '',
      precoPromocional: '',
      estoque: '',
      shippingWeightGrams: '500',
      lancamento: false,
      maisVendido: false,
    });
    setIsOneSize(false);
    setSelectedSizes([]);
    setCustomSize('');
    setColors([]);
    setColorDraft({ nome: '', hex: '#E3CAA5' });
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
        subcategoria: '',
        sku: '',
        preco: '',
        precoPromocional: '',
        estoque: '',
        shippingWeightGrams: '500',
        lancamento: false,
        maisVendido: false,
      });
      setIsOneSize(false);
      setSelectedSizes([]);
      setCustomSize('');
      setColors([]);
      setColorDraft({ nome: '', hex: '#E3CAA5' });
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
      subcategoria: product.subcategoria || '',
      sku: product.id,
      preco: String(product.preco),
      precoPromocional: product.precoPromocional ? String(product.precoPromocional) : '',
      estoque: String(product.estoque),
      shippingWeightGrams: String(product.shippingWeightGrams || 500),
      lancamento: Boolean(product.lancamento),
      maisVendido: Boolean(product.maisVendido),
    });
    setIsOneSize(product.tamanhos.length === 1 && ['Único', 'Unico', 'Tamanho Único', 'Tamanho Unico'].includes(product.tamanhos[0]));
    setSelectedSizes(product.tamanhos.length ? product.tamanhos : []);
    setCustomSize('');
    setColors(product.cores || []);
    setColorDraft({ nome: '', hex: '#E3CAA5' });
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

  const toggleSize = (size: string) => {
    setIsOneSize(false);
    setSelectedSizes((current) => (current.includes(size) ? current.filter((item) => item !== size) : [...current, size]));
  };

  const addCustomSize = () => {
    const size = customSize.trim();
    if (!size) return;
    setIsOneSize(false);
    setSelectedSizes((current) => (current.includes(size) ? current : [...current, size]));
    setCustomSize('');
  };

  const addColor = () => {
    const name = colorDraft.nome.trim();
    if (!name) {
      showToast('Informe o nome da cor.');
      return;
    }
    setColors((current) => [...current, { nome: name, hex: colorDraft.hex }]);
    setColorDraft({ nome: '', hex: '#E3CAA5' });
  };

  const removeColor = (index: number) => {
    setColors((current) => current.filter((_, itemIndex) => itemIndex !== index));
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

    const sizesToSave = isOneSize ? ['Único'] : selectedSizes;
    if (!sizesToSave.length) {
      showToast('Selecione pelo menos um tamanho ou marque tamanho único.');
      setActiveTab('variations');
      return;
    }

    setIsSaving(true);
    try {
      const imageUrls = await Promise.all(images.map((image) => image.existingUrl || (image.file ? uploadProductImage(image.file) : '')));
      const payload = {
        id: formData.sku || undefined,
        nome: formData.nome,
        preco: Number(formData.preco),
        precoPromocional: formData.precoPromocional ? Number(formData.precoPromocional) : undefined,
        categoria: formData.categoria as Product['categoria'],
        subcategoria: formData.subcategoria,
        imagens: imageUrls,
        descricao: formData.descricao,
        composicao: '',
        tamanhos: sizesToSave,
        cores: colors,
        estoque: Number(formData.estoque),
        shippingWeightGrams: Number(formData.shippingWeightGrams || 500),
        lancamento: formData.lancamento,
        maisVendido: formData.maisVendido,
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
                  {activeTab === tab.id && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />}
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
                          onChange={(e) => setFormData((prev) => ({ ...prev, categoria: e.target.value, subcategoria: '' }))}
                          className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] appearance-none"
                        >
                          <option value="">Selecione...</option>
                          {categoryOptions.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Subcategoria</label>
                        <select
                          value={formData.subcategoria}
                          onChange={(e) => setFormData((prev) => ({ ...prev, subcategoria: e.target.value }))}
                          disabled={!subcategoryOptions.length}
                          className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] appearance-none disabled:opacity-60"
                        >
                          <option value="">{subcategoryOptions.length ? 'Selecione...' : 'Sem subcategorias cadastradas'}</option>
                          {subcategoryOptions.map((subcategory) => (
                            <option key={subcategory} value={subcategory}>
                              {subcategory}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2 sm:col-span-2">
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
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{`Preço de Venda (${currencyCode})`}</label>
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
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{`Preço Promocional (${currencyCode})`}</label>
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

                  <div className="grid sm:grid-cols-2 gap-4 border-t border-neutral-100 pt-6">
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Peso para Frete (g)</label>
                      <input
                        type="number"
                        min="50"
                        step="10"
                        value={formData.shippingWeightGrams}
                        onChange={(e) => setFormData((prev) => ({ ...prev, shippingWeightGrams: e.target.value }))}
                        placeholder="500"
                        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                      <p className="text-[11px] text-neutral-400">Usado no calculo das opcoes de frete internacional.</p>
                    </div>

                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-100 bg-neutral-50/60 px-4 py-4 cursor-pointer hover:bg-neutral-50 transition-colors">
                      <div>
                        <span className="block text-[12px] font-bold text-neutral-900">Marcar como lançamento</span>
                        <span className="block text-[11px] text-neutral-500 mt-0.5">Exibe este produto na faixa Lançamentos da Home.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.lancamento}
                        onChange={(e) => setFormData((prev) => ({ ...prev, lancamento: e.target.checked }))}
                        className="w-5 h-5 accent-neutral-900 shrink-0"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-100 bg-neutral-50/60 px-4 py-4 cursor-pointer hover:bg-neutral-50 transition-colors">
                      <div>
                        <span className="block text-[12px] font-bold text-neutral-900">Marcar como mais vendido</span>
                        <span className="block text-[11px] text-neutral-500 mt-0.5">Exibe este produto na faixa Mais Vendidos da Home.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.maisVendido}
                        onChange={(e) => setFormData((prev) => ({ ...prev, maisVendido: e.target.checked }))}
                        className="w-5 h-5 accent-neutral-900 shrink-0"
                      />
                    </label>
                  </div>
                </div>
              )}

              {activeTab === 'variations' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                  <section className="space-y-4">
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-900">Tamanhos</h4>
                      <p className="text-[12px] text-neutral-500 mt-1">Escolha a grade disponível ou marque tamanho único.</p>
                    </div>

                    <label className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-100 bg-neutral-50/60 px-4 py-3 cursor-pointer">
                      <div>
                        <span className="block text-[12px] font-bold text-neutral-900">Produto possui tamanho único</span>
                        <span className="block text-[11px] text-neutral-500 mt-0.5">Usa “Único” como opção de tamanho.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={isOneSize}
                        onChange={(e) => {
                          setIsOneSize(e.target.checked);
                          if (e.target.checked) setSelectedSizes([]);
                        }}
                        className="w-5 h-5 accent-neutral-900"
                      />
                    </label>

                    {!isOneSize && (
                      <>
                        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                          {defaultSizes.map((size) => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => toggleSize(size)}
                              className={cn(
                                'h-10 rounded-lg border text-[12px] font-bold transition-colors',
                                selectedSizes.includes(size)
                                  ? 'bg-neutral-950 text-white border-neutral-950'
                                  : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-900',
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </div>

                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customSize}
                            onChange={(e) => setCustomSize(e.target.value)}
                            placeholder="Tamanho personalizado"
                            className="flex-1 border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                          />
                          <button
                            type="button"
                            onClick={addCustomSize}
                            className="px-4 py-3 rounded-xl bg-neutral-950 text-white hover:bg-neutral-800 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {selectedSizes.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedSizes.map((size) => (
                              <button
                                key={size}
                                type="button"
                                onClick={() => toggleSize(size)}
                                className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1.5 text-[12px] font-semibold text-neutral-700 hover:bg-red-50 hover:text-red-600 transition-colors"
                              >
                                {size}
                                <X className="w-3 h-3" />
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </section>

                  <section className="space-y-4 border-t border-neutral-100 pt-6">
                    <div>
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-900">Cores</h4>
                      <p className="text-[12px] text-neutral-500 mt-1">Cadastre nome e amostra da cor que aparecerão no produto.</p>
                    </div>

                    <div className="grid sm:grid-cols-[1fr_auto_auto] gap-3">
                      <input
                        type="text"
                        value={colorDraft.nome}
                        onChange={(e) => setColorDraft((prev) => ({ ...prev, nome: e.target.value }))}
                        placeholder="Nome da cor. Ex: Bege"
                        className="border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                      />
                      <input
                        type="color"
                        value={colorDraft.hex}
                        onChange={(e) => setColorDraft((prev) => ({ ...prev, hex: e.target.value }))}
                        className="h-12 w-full sm:w-16 rounded-xl border border-neutral-200 bg-white p-1"
                      />
                      <button
                        type="button"
                        onClick={addColor}
                        className="px-5 py-3 rounded-xl bg-neutral-950 text-white text-[11px] font-bold uppercase tracking-wider hover:bg-neutral-800 transition-colors"
                      >
                        Adicionar
                      </button>
                    </div>

                    {colors.length > 0 ? (
                      <div className="grid sm:grid-cols-2 gap-3">
                        {colors.map((color, index) => (
                          <div key={`${color.nome}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-100 bg-neutral-50/60 px-4 py-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-7 h-7 rounded-full border border-neutral-200 shadow-sm shrink-0" style={{ backgroundColor: color.hex }} />
                              <div className="min-w-0">
                                <p className="text-[13px] font-bold text-neutral-900 truncate">{color.nome}</p>
                                <p className="text-[11px] text-neutral-500 font-mono">{color.hex}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeColor(index)}
                              className="p-2 text-neutral-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/60 px-4 py-4 text-[12px] text-neutral-500">
                        Nenhuma cor cadastrada. Se deixar vazio, o produto será exibido sem seleção de cor.
                      </div>
                    )}
                  </section>
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
