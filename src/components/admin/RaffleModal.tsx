import React, { useEffect, useMemo, useState } from 'react';
import { X, Save, Trophy, Calendar, FileText, Image as ImageIcon, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { showToast } from '../../lib/adminUtils';
import { useStoreProducts } from '../../hooks/useStoreData';
import { Raffle, RaffleInput } from '../../lib/storeApi';

interface RaffleModalProps {
  isOpen: boolean;
  raffle?: Raffle | null;
  onClose: () => void;
  onSave: (raffle: RaffleInput) => Promise<void>;
}

type TabType = 'general' | 'details';
type PrizeMode = 'store_product' | 'custom';

const emptyForm: RaffleInput = {
  title: '',
  prize: '',
  description: '',
  image: '',
  productId: '',
  pointsPerTicket: 100,
  drawDate: '',
  ctaLabel: 'Participar agora',
  ctaLink: '/sorteios',
  totalParticipants: 0,
  totalTickets: 0,
  status: 'Ativo',
  position: 100,
};

export function RaffleModal({ isOpen, raffle, onClose, onSave }: RaffleModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [prizeMode, setPrizeMode] = useState<PrizeMode>('store_product');
  const [formData, setFormData] = useState<RaffleInput>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const products = useStoreProducts();
  const isEditing = Boolean(raffle);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === formData.productId),
    [products, formData.productId],
  );

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('general');
    setPrizeMode(raffle ? (raffle.productId ? 'store_product' : 'custom') : 'store_product');
    setFormData(raffle ? {
      title: raffle.title,
      prize: raffle.prize,
      description: raffle.description,
      image: raffle.image,
      productId: raffle.productId,
      pointsPerTicket: raffle.pointsPerTicket,
      drawDate: raffle.drawDate,
      ctaLabel: raffle.ctaLabel,
      ctaLink: raffle.ctaLink,
      totalParticipants: raffle.totalParticipants,
      totalTickets: raffle.totalTickets,
      status: raffle.status,
      position: raffle.position,
    } : emptyForm);
  }, [isOpen, raffle?.id]);

  const tabs = [
    { id: 'general', name: 'Geral', icon: Trophy },
    { id: 'details', name: 'CTA & MÃ­dia', icon: FileText },
  ];

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ['pointsPerTicket', 'totalParticipants', 'totalTickets', 'position'].includes(name) ? Number(value) : value,
    }));
  };

  const handleProductChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const product = products.find((item) => item.id === event.target.value);
    setFormData((prev) => ({
      ...prev,
      productId: event.target.value,
      image: product?.imagens[0] || prev.image,
      prize: prev.prize || product?.nome || '',
      title: prev.title || product?.nome || '',
    }));
  };

  const handlePrizeModeChange = (mode: PrizeMode) => {
    setPrizeMode(mode);
    if (mode === 'custom') {
      setFormData((prev) => ({ ...prev, productId: '' }));
    }
  };

  const handleSave = async (event?: React.FormEvent | React.MouseEvent) => {
    event?.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        ...formData,
        productId: prizeMode === 'store_product' ? formData.productId : '',
        image: formData.image || selectedProduct?.imagens[0] || '',
        ctaLabel: formData.ctaLabel || 'Participar agora',
        ctaLink: formData.ctaLink || '/sorteios',
      });
      showToast(isEditing ? 'Sorteio atualizado com sucesso!' : 'Sorteio criado com sucesso!');
      onClose();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'NÃ£o foi possÃ­vel salvar o sorteio.');
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
            onClick={() => !isSaving && onClose()}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
          >
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-white">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-serif font-bold text-neutral-900">{isEditing ? 'Editar Sorteio' : 'Novo Sorteio'}</h3>
                  <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Chamada da Home e clube de sorteios</p>
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={isSaving}
                className="p-2 hover:bg-neutral-200/50 rounded-full transition-colors text-neutral-400 hover:text-neutral-900 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex border-b border-neutral-100 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-4 text-[13px] font-semibold transition-all relative",
                    activeTab === tab.id ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-600",
                  )}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                  {activeTab === tab.id && (
                    <motion.div layoutId="activeTabRaffle" className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900" />
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {activeTab === 'general' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Tipo de premio</label>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handlePrizeModeChange('store_product')}
                        className={cn(
                          "text-left border px-4 py-3 rounded-xl transition-all",
                          prizeMode === 'store_product'
                            ? "border-neutral-900 bg-neutral-950 text-white"
                            : "border-neutral-200/60 bg-neutral-50/50 text-neutral-700 hover:bg-white",
                        )}
                      >
                        <span className="block text-[12px] font-bold uppercase tracking-wider">Produto da loja</span>
                        <span className={cn("block text-[12px] mt-1", prizeMode === 'store_product' ? "text-white/60" : "text-neutral-500")}>Usa um item cadastrado no catalogo.</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePrizeModeChange('custom')}
                        className={cn(
                          "text-left border px-4 py-3 rounded-xl transition-all",
                          prizeMode === 'custom'
                            ? "border-neutral-900 bg-neutral-950 text-white"
                            : "border-neutral-200/60 bg-neutral-50/50 text-neutral-700 hover:bg-white",
                        )}
                      >
                        <span className="block text-[12px] font-bold uppercase tracking-wider">Premio personalizado</span>
                        <span className={cn("block text-[12px] mt-1", prizeMode === 'custom' ? "text-white/60" : "text-neutral-500")}>Para iPhone, vale-compras, viagem etc.</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-[1fr_220px] gap-5">
                    {prizeMode === 'store_product' ? (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Produto do sorteio</label>
                        <select
                          name="productId"
                          value={formData.productId}
                          onChange={handleProductChange}
                          className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                        >
                          <option value="">Selecionar produto...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>{product.nome}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Nome do premio personalizado</label>
                        <input
                          name="prize"
                          value={formData.prize}
                          onChange={handleChange}
                          type="text"
                          required
                          placeholder="Ex: iPhone 15 Pro Max"
                          className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Status</label>
                      <select name="status" value={formData.status} onChange={handleChange} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]">
                        <option value="Ativo">Ativo</option>
                        <option value="Agendado">Agendado</option>
                        <option value="Finalizado">Finalizado</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Titulo do sorteio</label>
                    <input name="title" value={formData.title} onChange={handleChange} type="text" required placeholder="Ex: Concorra a um look completo" className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]" />
                  </div>

                  {prizeMode === 'store_product' && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Premio</label>
                      <input name="prize" value={formData.prize} onChange={handleChange} type="text" required placeholder="Ex: Conjunto Alfaiataria Bege" className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]" />
                    </div>
                  )}

                  <div className="grid sm:grid-cols-3 gap-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Pontos por bilhete</label>
                      <input name="pointsPerTicket" value={formData.pointsPerTicket} onChange={handleChange} type="number" min={0} required className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Data</label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-neutral-400 absolute left-4 top-3.5" />
                        <input name="drawDate" value={formData.drawDate} onChange={handleChange} type="date" className="w-full border border-neutral-200/60 pl-10 pr-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Ordem</label>
                      <input name="position" value={formData.position} onChange={handleChange} type="number" min={1} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]" />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Imagem do sorteio</label>
                    <div className="relative">
                      <ImageIcon className="w-4 h-4 text-neutral-400 absolute left-4 top-3.5" />
                      <input name="image" value={formData.image} onChange={handleChange} type="url" placeholder="https://exemplo.com/imagem.jpg" className="w-full border border-neutral-200/60 pl-10 pr-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]" />
                    </div>
                    <p className="text-[11px] text-neutral-400">Se deixar vazio, usamos a primeira imagem do produto selecionado.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Chamada</label>
                    <textarea name="description" value={formData.description} onChange={handleChange} rows={4} required placeholder="Ex: A cada compra voce acumula pontos para participar deste sorteio especial." className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] resize-none" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Texto do botao</label>
                      <div className="relative">
                        <Megaphone className="w-4 h-4 text-neutral-400 absolute left-4 top-3.5" />
                        <input name="ctaLabel" value={formData.ctaLabel} onChange={handleChange} type="text" className="w-full border border-neutral-200/60 pl-10 pr-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Link do botao</label>
                      <input name="ctaLink" value={formData.ctaLink} onChange={handleChange} type="text" placeholder="/sorteios" className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]" />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Participantes</label>
                      <input name="totalParticipants" value={formData.totalParticipants} onChange={handleChange} type="number" min={0} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Bilhetes</label>
                      <input name="totalTickets" value={formData.totalTickets} onChange={handleChange} type="number" min={0} className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]" />
                    </div>
                  </div>
                </div>
              )}
            </form>

            <div className="px-6 sm:px-8 py-5 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50/50">
              <button type="button" disabled={isSaving} onClick={onClose} className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={handleSave} type="submit" disabled={isSaving} className="bg-neutral-950 text-white px-8 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10 disabled:opacity-60 disabled:cursor-wait">
                <Save className="w-4 h-4" />
                {isSaving ? 'Salvando...' : isEditing ? 'Salvar sorteio' : 'Criar sorteio'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
