import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Copy,
  Edit,
  Eye,
  Mail,
  MapPin,
  PauseCircle,
  Percent,
  PlayCircle,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Tag,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { useStoreCategories, useStoreProducts } from '../../hooks/useStoreData';
import { useAdminCurrency } from '../../hooks/useAdminCurrency';
import { showToast } from '../../lib/adminUtils';
import { useDeferredSearchTerm } from '../../hooks/useDeferredSearchTerm';
import {
  type AdminPromotionInput,
  type AdminPromotionRecord,
  type AdminPromotionStatus,
  createAdminPromotion,
  deleteAdminPromotion,
  getAdminPromotions,
  setAdminPromotionStatus,
  updateAdminPromotion,
} from '../../lib/storeApiRest';

type Product = {
  id: string;
  nome: string;
  preco: number;
  imagens: string[];
};

type PromotionStatus = AdminPromotionStatus;
type DiscountType = AdminPromotionInput['discountType'];
type ApplicationType = AdminPromotionInput['applicationType'];

type PromotionAddress = {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

type PromotionOrderItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type PromotionOrder = {
  id: string;
  orderNumber: string;
  purchaseDate: string;
  status: string;
  total: number;
  paymentMethod: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf?: string;
  };
  shippingAddress: PromotionAddress;
  items: PromotionOrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  history: {
    createdAt: string;
    paidAt?: string;
    shippedAt?: string;
    deliveredAt?: string;
  };
};

type PromotionCampaign = Omit<AdminPromotionRecord, 'usages'> & {
  usages: Array<AdminPromotionRecord['usages'][number] & { order?: PromotionOrder }>;
};

type CampaignDraft = AdminPromotionInput;

type FormModalState = {
  mode: 'create' | 'edit' | 'duplicate';
  campaignId?: string;
};

type ActionMenuState = {
  campaignId: string;
  top: number;
  left: number;
  openUp: boolean;
};

type ConfirmationState = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'default' | 'danger';
  onConfirm: () => void;
};


const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
});

const statusTone: Record<PromotionStatus, string> = {
  Ativo: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  Pausado: 'bg-amber-50 text-amber-700 border border-amber-100',
  Finalizado: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
  Arquivada: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const emptyDraft: CampaignDraft = {
  name: '',
  description: '',
  promoCode: '',
  discountType: 'percentual',
  discountValue: 10,
  minOrderValue: 0,
  totalUseLimit: 0,
  useLimitPerCustomer: 1,
  startsAt: '2026-06-01T08:00',
  expiresAt: '',
  applicationType: 'todos',
  categoryNames: [],
  productIds: [],
  status: 'Ativo',
  audienceSize: 1000,
};

export function Promotions() {
  const products = useStoreProducts();
  const categories = useStoreCategories();
  const { formatCurrency, currencyCode } = useAdminCurrency();
  const [campaigns, setCampaigns] = useState<PromotionCampaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [formModal, setFormModal] = useState<FormModalState | null>(null);
  const [performanceCampaignId, setPerformanceCampaignId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<{ campaignId: string; order: PromotionOrder } | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);
  const normalizedSearchTerm = useDeferredSearchTerm(searchTerm);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function loadCampaigns() {
      try {
        setIsLoading(true);
        const data = await getAdminPromotions();
        if (active) {
          setCampaigns(data.map(normalizeCampaign));
        }
      } catch (error) {
        console.error('Falha ao carregar promoções', error);
        showToast('Falha ao carregar promoções.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }
    loadCampaigns();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!actionMenu || typeof window === 'undefined') return;
    const closeMenu = () => setActionMenu(null);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    return () => {
      window.removeEventListener('resize', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
    };
  }, [actionMenu]);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      if (!normalizedSearchTerm) return true;
      return (
        campaign.name.toLowerCase().includes(normalizedSearchTerm) ||
        campaign.promoCode.toLowerCase().includes(normalizedSearchTerm) ||
        campaign.description.toLowerCase().includes(normalizedSearchTerm)
      );
    });
  }, [campaigns, normalizedSearchTerm]);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === performanceCampaignId) ?? null,
    [campaigns, performanceCampaignId],
  );

  const editingCampaign = useMemo(() => {
    if (!formModal?.campaignId) return null;
    return campaigns.find((campaign) => campaign.id === formModal.campaignId) ?? null;
  }, [campaigns, formModal]);

  const campaignSummary = useMemo(() => {
    let totalRescues = 0;
    let totalPromoRevenue = 0;
    let activeCampaigns = 0;
    let activeCampaignsWithOrders = 0;

    for (const campaign of campaigns) {
      const campaignRevenue = getCampaignRevenue(campaign);
      totalRescues += campaign.usages.length;
      totalPromoRevenue += campaignRevenue;

      if (campaign.status === 'Ativo') {
        activeCampaigns += 1;
        if (campaign.usages.length > 0) {
          activeCampaignsWithOrders += 1;
        }
      }
    }

    return {
      totalRescues,
      totalPromoRevenue,
      activeConversion: activeCampaigns ? (activeCampaignsWithOrders / activeCampaigns) * 100 : 0,
      averagePromoTicket: totalRescues ? totalPromoRevenue / totalRescues : 0,
    };
  }, [campaigns]);

  const campaignRows = useMemo(() => filteredCampaigns.map((campaign) => ({
    campaign,
    revenue: getCampaignRevenue(campaign),
    discountLabel: getDiscountLabel(campaign, formatCurrency),
    expiresLabel: campaign.expiresAt ? formatShortDate(campaign.expiresAt) : 'Até revogar',
  })), [filteredCampaigns, formatCurrency]);


  const toggleActionMenu = (event: React.MouseEvent<HTMLButtonElement>, campaignId: string) => {
    event.stopPropagation();

    if (actionMenu?.campaignId === campaignId) {
      setActionMenu(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 248;
    const menuHeight = 338;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const openUp = rect.bottom + menuHeight > viewportHeight - 16 && rect.top > menuHeight;

    setActionMenu({
      campaignId,
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: Math.min(Math.max(16, rect.right - menuWidth), viewportWidth - menuWidth - 16),
      openUp,
    });
  };

  const copyCode = async (campaign: PromotionCampaign) => {
    if (!campaign.promoCode) {
      showToast('Esta campanha não usa código promocional.');
      setActionMenu(null);
      return;
    }

    try {
      await navigator.clipboard.writeText(campaign.promoCode);
      showToast('Código copiado com sucesso.');
    } catch (error) {
      showToast('Não foi possível copiar o código.');
    } finally {
      setActionMenu(null);
    }
  };
  const saveCampaign = async (draft: CampaignDraft) => {
    try {
      if (formModal?.mode === 'edit' && editingCampaign) {
        const updated = await updateAdminPromotion(editingCampaign.id, draft);
        setCampaigns((current) =>
          current.map((campaign) => (campaign.id === editingCampaign.id ? normalizeCampaign(updated as PromotionCampaign) : campaign)),
        );

        showToast('Campanha atualizada com sucesso.');
        setFormModal(null);
        return;
      }

      const created = await createAdminPromotion(draft);
      setCampaigns((current) => [normalizeCampaign(created as PromotionCampaign), ...current]);

      showToast(formModal?.mode === 'duplicate' ? 'Campanha duplicada com sucesso.' : 'Campanha criada com sucesso.');
      setFormModal(null);
    } catch (error) {
      console.error('Erro ao salvar campanha', error);
      showToast('Falha ao salvar a campanha.');
    }
  };

  const setCampaignStatus = async (campaignId: string, status: PromotionStatus, _actionLabel: string) => {
    try {
      const updated = await setAdminPromotionStatus(campaignId, status);
      setCampaigns((current) =>
        current.map((item) => (item.id === campaignId ? normalizeCampaign(updated as PromotionCampaign) : item)),
      );
      setActionMenu(null);
      return updated;
    } catch (error) {
      console.error('Erro ao atualizar status', error);
      showToast('Falha ao atualizar status da campanha.');
    }
  };

  const toggleCampaignStatus = async (campaign: PromotionCampaign) => {
    if (campaign.status !== 'Ativo' && campaign.status !== 'Pausado') {
      showToast('Esta campanha não pode alternar entre ativo e pausado.');
      setActionMenu(null);
      return;
    }

    const nextStatus = campaign.status === 'Ativo' ? 'Pausado' : 'Ativo';
    await setCampaignStatus(campaign.id, nextStatus, `Campanha ${nextStatus === 'Ativo' ? 'ativada' : 'pausada'} manualmente`);
    showToast(`Campanha ${nextStatus === 'Ativo' ? 'ativada' : 'pausada'} com sucesso.`);
  };

  const finalizeCampaign = (campaign: PromotionCampaign) => {
    if (campaign.status === 'Finalizado') {
      showToast('Esta campanha já está finalizada.');
      setActionMenu(null);
      return;
    }

    setConfirmation({
      title: 'Finalizar campanha',
      description: 'Deseja realmente finalizar esta campanha? Esta ação impedirá novos resgates.',
      confirmLabel: 'Finalizar campanha',
      tone: 'danger',
      onConfirm: async () => {
        await setCampaignStatus(campaign.id, 'Finalizado', 'Campanha finalizada manualmente');
        showToast('Campanha finalizada com sucesso.');
      },
    });
    setActionMenu(null);
  };

  const removeCampaign = (campaign: PromotionCampaign) => {
    const hasHistory = campaign.usages.length > 0;
    setConfirmation({
      title: hasHistory ? 'Arquivar campanha' : 'Excluir campanha',
      description: hasHistory
        ? 'Esta campanha já possui histórico de utilização e não pode ser removida. Ela será arquivada.'
        : 'Deseja realmente excluir esta campanha? Esta ação remove a campanha do painel.',
      confirmLabel: hasHistory ? 'Arquivar campanha' : 'Excluir campanha',
      tone: 'danger',
      onConfirm: async () => {
        if (hasHistory) {
          await setCampaignStatus(campaign.id, 'Arquivada', 'Campanha arquivada por possuir histórico de utilização');
          showToast('Esta campanha já possui histórico de utilização e não pode ser removida. Ela será arquivada.');
          return;
        }

        try {
          const result = await deleteAdminPromotion(campaign.id);
          if (result.archived) {
            const refreshed = await getAdminPromotions();
            setCampaigns(refreshed.map((item) => normalizeCampaign(item as PromotionCampaign)));
            showToast('Esta campanha possui historico e foi arquivada.');
            return;
          }
          setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
          showToast('Campanha excluida com sucesso.');
        } catch (error) {
          console.error('Erro ao excluir campanha', error);
          showToast('Falha ao excluir a campanha.');
        }
      },
    });
    setActionMenu(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Promoções & Cupons</h2>
          <p className="text-neutral-500 text-[13px]">Gerencie campanhas, acompanhe resultados e controle todo o ciclo de vida dos descontos.</p>
        </div>

        <button
          type="button"
          onClick={() => setFormModal({ mode: 'create' })}
          className="bg-neutral-950 text-white px-5 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-[0_4px_14px_rgba(0,0,0,0.15)]"
        >
          <Plus className="w-4 h-4" />
          Nova Promoção
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total de Resgates"
          value={String(campaignSummary.totalRescues)}
          icon={<Users className="w-4 h-4" />}
          iconTone="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          label="Conversão de Ativos"
          value={`${campaignSummary.activeConversion.toFixed(1)}%`}
          icon={<ArrowUpRight className="w-4 h-4" />}
          iconTone="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          label="Ticket Médio (Promo)"
          value={formatCurrency(campaignSummary.averagePromoTicket)}
          icon={<Percent className="w-4 h-4" />}
          iconTone="bg-violet-50 text-violet-600"
        />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 border-b border-neutral-100/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Buscar promoção ou código..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-neutral-50/50 border border-neutral-200/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 text-[13px] transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100/60">
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Campanha</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Código</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Desconto</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Resgates</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Receita</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold uppercase tracking-widest text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 text-[13px]">
                    Carregando campanhas...
                  </td>
                </tr>
              ) : campaignRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-neutral-500 text-[13px]">
                    Nenhuma campanha encontrada.
                  </td>
                </tr>
              ) : (
                campaignRows.map(({ campaign, revenue, discountLabel, expiresLabel }) => (
                  <tr key={campaign.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-500">
                          <Tag className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-neutral-900">{campaign.name}</div>
                          <div className="mt-1 flex items-center gap-1 text-[11px] text-neutral-400">
                            <Calendar className="w-3 h-3" />
                            Expira: {expiresLabel}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex text-[11px] font-mono font-bold bg-neutral-100 px-2 py-1 rounded text-neutral-600">
                        {campaign.promoCode || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-bold text-neutral-900">{discountLabel}</td>
                    <td className="px-6 py-4 text-[13px] font-medium text-neutral-600">{campaign.usages.length}</td>
                    <td className="px-6 py-4 text-[13px] font-bold text-neutral-900">{formatCurrency(revenue)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${statusTone[campaign.status]}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={(event) => toggleActionMenu(event, campaign.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/70 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 transition-colors hover:bg-neutral-50"
                      >
                        Ações
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-neutral-100/60 flex items-center justify-between text-[13px] text-neutral-500 bg-white">
          <div>
            Mostrando <span className="font-medium text-neutral-900">{filteredCampaigns.length}</span> de{' '}
            <span className="font-medium text-neutral-900">{campaigns.length}</span> campanhas
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Dados sincronizados com o banco de dados
          </div>
        </div>
      </div>

      {actionMenu && (
        <ActionMenuOverlay
          campaign={campaigns.find((item) => item.id === actionMenu.campaignId) ?? null}
          position={actionMenu}
          onClose={() => setActionMenu(null)}
          onViewPerformance={(campaign) => {
            setPerformanceCampaignId(campaign.id);
            setActionMenu(null);
          }}
          onEdit={(campaign) => {
            setFormModal({ mode: 'edit', campaignId: campaign.id });
            setActionMenu(null);
          }}
          onDuplicate={(campaign) => {
            setFormModal({ mode: 'duplicate', campaignId: campaign.id });
            setActionMenu(null);
          }}
          onCopyCode={copyCode}
          onToggleStatus={toggleCampaignStatus}
          onFinalize={finalizeCampaign}
          onDelete={removeCampaign}
        />
      )}

      {formModal && (
        <CampaignFormModal
          mode={formModal.mode}
          campaign={editingCampaign}
          categories={categories.map((category) => category.nome)}
          products={products}
          onClose={() => setFormModal(null)}
          onSave={saveCampaign}
        />
      )}

      {selectedCampaign && (
        <CampaignPerformanceModal
          campaign={selectedCampaign}
          products={products}
          onClose={() => setPerformanceCampaignId(null)}
          onOpenOrder={() => undefined}
        />
      )}

      {selectedOrder && (
        <PromotionOrderDetailsModal
          order={selectedOrder.order}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {confirmation && (
        <ConfirmationModal
          title={confirmation.title}
          description={confirmation.description}
          confirmLabel={confirmation.confirmLabel}
          tone={confirmation.tone}
          onClose={() => setConfirmation(null)}
          onConfirm={() => {
            confirmation.onConfirm();
            setConfirmation(null);
          }}
        />
      )}
    </div>
  );
}

function ActionMenuOverlay({
  campaign,
  position,
  onClose,
  onViewPerformance,
  onEdit,
  onDuplicate,
  onCopyCode,
  onToggleStatus,
  onFinalize,
  onDelete,
}: {
  campaign: PromotionCampaign | null;
  position: ActionMenuState;
  onClose: () => void;
  onViewPerformance: (campaign: PromotionCampaign) => void;
  onEdit: (campaign: PromotionCampaign) => void;
  onDuplicate: (campaign: PromotionCampaign) => void;
  onCopyCode: (campaign: PromotionCampaign) => void;
  onToggleStatus: (campaign: PromotionCampaign) => void;
  onFinalize: (campaign: PromotionCampaign) => void;
  onDelete: (campaign: PromotionCampaign) => void;
}) {
  if (!campaign) return null;

  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="fixed z-50 w-62 rounded-2xl border border-neutral-200 bg-white p-2 shadow-[0_16px_30px_rgba(0,0,0,0.08)]"
        style={{
          left: position.left,
          top: position.top,
          width: 248,
          transform: position.openUp ? 'translateY(-100%)' : undefined,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <MenuButton icon={<Eye className="w-4 h-4 text-neutral-500" />} label="Visualizar desempenho" onClick={() => onViewPerformance(campaign)} />
        <MenuButton icon={<Edit className="w-4 h-4 text-neutral-500" />} label="Editar campanha" onClick={() => onEdit(campaign)} />
        <MenuButton icon={<Copy className="w-4 h-4 text-neutral-500" />} label="Duplicar campanha" onClick={() => onDuplicate(campaign)} />
        <MenuButton icon={<Tag className="w-4 h-4 text-neutral-500" />} label="Copiar código" onClick={() => onCopyCode(campaign)} />

        {(campaign.status === 'Ativo' || campaign.status === 'Pausado') && (
          <MenuButton
            icon={
              campaign.status === 'Ativo' ? (
                <PauseCircle className="w-4 h-4 text-amber-600" />
              ) : (
                <PlayCircle className="w-4 h-4 text-emerald-600" />
              )
            }
            label={campaign.status === 'Ativo' ? 'Pausar campanha' : 'Ativar campanha'}
            onClick={() => onToggleStatus(campaign)}
          />
        )}

        {campaign.status !== 'Finalizado' && campaign.status !== 'Arquivada' && (
          <MenuButton
            icon={<Calendar className="w-4 h-4 text-neutral-500" />}
            label="Finalizar campanha"
            onClick={() => onFinalize(campaign)}
          />
        )}

        <MenuButton icon={<Trash2 className="w-4 h-4 text-red-500" />} label="Excluir campanha" tone="danger" onClick={() => onDelete(campaign)} />
      </div>
    </div>
  );
}

function CampaignPerformanceModal({
  campaign,
  products,
  onClose,
  onOpenOrder,
}: {
  campaign: PromotionCampaign;
  products: Product[];
  onClose: () => void;
  onOpenOrder: (order: PromotionOrder) => void;
}) {
  const { formatCurrency } = useAdminCurrency();
  const totalRevenue = getCampaignRevenue(campaign);
  const avgTicket = campaign.usages.length ? totalRevenue / campaign.usages.length : 0;
  const totalDiscount = campaign.usages.reduce((sum, usage) => sum + usage.discountApplied, 0);
  const conversionRate = campaign.audienceSize ? (campaign.usages.length / campaign.audienceSize) * 100 : 0;
  const uniqueCustomers = new Set(campaign.usages.map((usage) => usage.customerEmail.toLowerCase())).size;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.16)]">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-neutral-50/60">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Campanha {campaign.id}</div>
            <h3 className="mt-2 text-2xl font-serif text-neutral-900">Desempenho da campanha</h3>
            <p className="mt-1 text-[13px] text-neutral-500">Resultados, histórico de utilização e auditoria em um só lugar.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-6 md:p-8 space-y-8">
          <section className="grid gap-4 md:grid-cols-4">
            <InfoCard icon={<Tag className="w-4 h-4" />} label="Campanha" value={campaign.name} />
            <InfoCard icon={<Percent className="w-4 h-4" />} label="Código" value={campaign.promoCode || 'Sem código'} />
            <InfoCard icon={<Calendar className="w-4 h-4" />} label="Status" value={<StatusBadge status={campaign.status} />} />
            <InfoCard icon={<Users className="w-4 h-4" />} label="Tipo" value={campaign.promoCode ? 'Cupom' : 'Desconto direto'} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Panel title="Dados da campanha" icon={<Tag className="w-4 h-4" />}>
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField label="Nome da campanha" value={campaign.name} />
                  <DetailField label="Código promocional" value={campaign.promoCode || 'Sem código'} />
                  <DetailField label="Tipo de desconto" value={campaign.discountType === 'percentual' ? 'Percentual' : 'Valor fixo'} />
                  <DetailField label="Valor do desconto" value={getDiscountLabel(campaign, formatCurrency)} />
                  <DetailField label="Data de início" value={formatDateTime(campaign.startsAt)} />
                  <DetailField label="Data de expiração" value={campaign.expiresAt ? formatDateTime(campaign.expiresAt) : 'Até revogar'} />
                  <DetailField label="Status" value={campaign.status} />
                  <DetailField label="Aplicação" value={getApplicationLabel(campaign, products)} />
                </div>
              </Panel>

              <Panel title="Histórico de utilização" icon={<ShoppingBag className="w-4 h-4" />}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Pedido</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cliente</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Data</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Valor pedido</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Desconto aplicado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {campaign.usages.map((usage) => (
                        <tr key={usage.id} className="hover:bg-neutral-50/70" onClick={() => usage.order && onOpenOrder(usage.order)}>
                          <td className="py-3.5 text-[13px] font-medium text-neutral-900">{usage.order?.orderNumber || usage.orderNumber || '-'}</td>
                          <td className="py-3.5 text-[13px] text-neutral-500">{usage.customerName}</td>
                          <td className="py-3.5 text-[13px] text-neutral-500">{formatDateTime(usage.dateTime)}</td>
                          <td className="py-3.5 text-[13px] font-medium text-neutral-900 text-right">{formatCurrency(usage.orderValue)}</td>
                          <td className="py-3.5 text-[13px] text-right text-neutral-500">{formatCurrency(usage.discountApplied)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Indicadores">
                <div className="space-y-3">
                  <SummaryLine label="Total de resgates" value={String(campaign.usages.length)} />
                  <SummaryLine label="Receita gerada" value={formatCurrency(totalRevenue)} />
                  <SummaryLine label="Ticket médio" value={formatCurrency(avgTicket)} />
                  <SummaryLine label="Taxa de conversão" value={`${conversionRate.toFixed(1)}%`} />
                  <SummaryLine label="Valor total descontado" value={formatCurrency(totalDiscount)} />
                  <SummaryLine label="Clientes únicos" value={String(uniqueCustomers)} />
                </div>
              </Panel>

              <Panel title="Regras da campanha">
                <div className="space-y-3">
                  <SummaryLine label="Valor mínimo do pedido" value={campaign.minOrderValue ? formatCurrency(campaign.minOrderValue) : 'Sem mínimo'} />
                  <SummaryLine label="Limite total de usos" value={campaign.totalUseLimit ? String(campaign.totalUseLimit) : 'Sem limite'} />
                  <SummaryLine label="Limite por cliente" value={campaign.useLimitPerCustomer ? String(campaign.useLimitPerCustomer) : 'Sem limite'} />
                  <SummaryLine label="Descrição" value={campaign.description || 'Sem descrição'} />
                </div>
              </Panel>

              <Panel title="Logs de auditoria">
                <div className="space-y-3">
                  {campaign.logs.map((log) => (
                    <div key={log.id} className="rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2 text-[12px] text-neutral-500">
                        <span className="font-semibold text-neutral-700">{log.user}</span>
                        <span>{formatDateTime(log.dateTime)}</span>
                        <span>IP {log.ip}</span>
                      </div>
                      <div className="mt-1 text-sm text-neutral-800">{log.action}</div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CampaignFormModal({
  mode,
  campaign,
  categories,
  products,
  onClose,
  onSave,
}: {
  mode: 'create' | 'edit' | 'duplicate';
  campaign: PromotionCampaign | null;
  categories: string[];
  products: Product[];
  onClose: () => void;
  onSave: (draft: CampaignDraft) => void;
}) {
  const { formatCurrency, currencyCode } = useAdminCurrency();
  const [formData, setFormData] = useState<CampaignDraft>(getInitialDraft(mode, campaign));
  const [productSearch, setProductSearch] = useState('');
  const normalizedProductSearch = useDeferredSearchTerm(productSearch);

  useEffect(() => {
    setFormData(getInitialDraft(mode, campaign));
  }, [mode, campaign]);

  const filteredProducts = useMemo(() => products.filter((product) =>
    !normalizedProductSearch || product.nome.toLowerCase().includes(normalizedProductSearch),
  ), [normalizedProductSearch, products]);

  const updateField = <K extends keyof CampaignDraft>(field: K, value: CampaignDraft[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (categoryName: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryNames: prev.categoryNames.includes(categoryName)
        ? prev.categoryNames.filter((item) => item !== categoryName)
        : [...prev.categoryNames, categoryName],
    }));
  };

  const toggleProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((item) => item !== productId)
        : [...prev.productIds, productId],
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave(formData);
  };

  const title =
    mode === 'create' ? 'Nova campanha' : mode === 'duplicate' ? 'Duplicar campanha' : 'Editar campanha';

  const buttonLabel =
    mode === 'create' ? 'Criar campanha' : mode === 'duplicate' ? 'Duplicar campanha' : 'Salvar campanha';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.16)]">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-neutral-50/60">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Campanhas e descontos</div>
            <h3 className="mt-2 text-2xl font-serif text-neutral-900">{title}</h3>
            <p className="mt-1 text-[13px] text-neutral-500">Atualização instantânea no painel, sem recarregar a página.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(92vh-88px)] overflow-y-auto p-6 md:p-8 space-y-8">
          <Panel title="Informações básicas" icon={<Tag className="w-4 h-4" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Nome da campanha" value={formData.name} onChange={(value) => updateField('name', value)} required />
              <InputField label="Código promocional" value={formData.promoCode} onChange={(value) => updateField('promoCode', value.toUpperCase())} placeholder="Ex: BLACK10" />
              <div className="md:col-span-2">
                <TextareaField label="Descrição" value={formData.description} onChange={(value) => updateField('description', value)} />
              </div>
              <SelectField
                label="Tipo de desconto"
                value={formData.discountType}
                onChange={(value) => updateField('discountType', value as DiscountType)}
                options={[
                  { value: 'percentual', label: 'Percentual (%)' },
                  { value: 'valor_fixo', label: `Valor fixo (${currencyCode})` },
                ]}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Percentual (%)"
                  type="number"
                  value={formData.discountType === 'percentual' ? String(formData.discountValue) : ''}
                  onChange={(value) => updateField('discountValue', Number(value || 0))}
                  disabled={formData.discountType !== 'percentual'}
                />
                <InputField
                  label={`Valor fixo (${currencyCode})`}
                  type="number"
                  value={formData.discountType === 'valor_fixo' ? String(formData.discountValue) : ''}
                  onChange={(value) => updateField('discountValue', Number(value || 0))}
                  disabled={formData.discountType !== 'valor_fixo'}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Configurações" icon={<Percent className="w-4 h-4" />}>
            <div className="grid gap-4 md:grid-cols-4">
              <InputField
                label="Valor mínimo do pedido"
                type="number"
                value={String(formData.minOrderValue)}
                onChange={(value) => updateField('minOrderValue', Number(value || 0))}
              />
              <InputField
                label="Limite total de usos"
                type="number"
                value={String(formData.totalUseLimit)}
                onChange={(value) => updateField('totalUseLimit', Number(value || 0))}
              />
              <InputField
                label="Limite por cliente"
                type="number"
                value={String(formData.useLimitPerCustomer)}
                onChange={(value) => updateField('useLimitPerCustomer', Number(value || 0))}
              />
              <SelectField
                label="Status"
                value={formData.status}
                onChange={(value) => updateField('status', value as CampaignDraft['status'])}
                options={[
                  { value: 'Ativo', label: 'Ativo' },
                  { value: 'Pausado', label: 'Pausado' },
                  { value: 'Finalizado', label: 'Finalizado' },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Vigência" icon={<Calendar className="w-4 h-4" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <InputField
                label="Data de início"
                type="datetime-local"
                value={formData.startsAt}
                onChange={(value) => updateField('startsAt', value)}
              />
              <InputField
                label="Data de expiração"
                type="datetime-local"
                value={formData.expiresAt}
                onChange={(value) => updateField('expiresAt', value)}
              />
            </div>
          </Panel>

          <Panel title="Aplicação" icon={<ShoppingBag className="w-4 h-4" />}>
            <div className="space-y-5">
              <SelectField
                label="Onde aplicar"
                value={formData.applicationType}
                onChange={(value) => updateField('applicationType', value as ApplicationType)}
                options={[
                  { value: 'todos', label: 'Todos os produtos' },
                  { value: 'categorias', label: 'Categorias específicas' },
                  { value: 'produtos', label: 'Produtos específicos' },
                ]}
              />

              {formData.applicationType === 'categorias' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {categories.map((categoryName) => (
                    <div key={categoryName}>
                      <SelectableChip
                        active={formData.categoryNames.includes(categoryName)}
                        onClick={() => toggleCategory(categoryName)}
                        label={categoryName}
                      />
                    </div>
                  ))}
                </div>
              )}

              {formData.applicationType === 'produtos' && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(event) => setProductSearch(event.target.value)}
                      placeholder="Buscar produtos específicos..."
                      className="w-full pl-10 pr-4 py-3 border border-neutral-200/60 bg-neutral-50/50 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 text-[13px]"
                    />
                  </div>

                  <div className="max-h-72 overflow-y-auto rounded-2xl border border-neutral-200/60 divide-y divide-neutral-100">
                    {filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 ${formData.productIds.includes(product.id) ? 'bg-neutral-50' : ''}`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${formData.productIds.includes(product.id) ? 'bg-neutral-900 border-neutral-900 text-white' : 'border-neutral-200 bg-white'}`}>
                          {formData.productIds.includes(product.id) ? 'âœ“' : ''}
                        </div>
                        <img src={product.imagens[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-neutral-900 truncate">{product.nome}</div>
                          <div className="text-[11px] text-neutral-500">{formatCurrency(product.preco)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          <div className="flex justify-end gap-3 border-t border-neutral-100 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-neutral-950 text-white px-8 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all flex items-center gap-2 shadow-lg shadow-neutral-900/10"
            >
              <Save className="w-4 h-4" />
              {buttonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PromotionOrderDetailsModal({
  order,
  onClose,
}: {
  order: PromotionOrder;
  onClose: () => void;
}) {
  const { formatCurrency } = useAdminCurrency();
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.16)]">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-neutral-50/60">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Pedido {order.orderNumber}</div>
            <h3 className="mt-2 text-2xl font-serif text-neutral-900">Detalhes completos do pedido</h3>
            <p className="mt-1 text-[13px] text-neutral-500">Pedido vinculado ao histórico de utilização da campanha.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-6 md:p-8 space-y-8">
          <section className="grid gap-4 md:grid-cols-4">
            <InfoCard icon={<ShoppingBag className="w-4 h-4" />} label="Número do pedido" value={order.orderNumber} />
            <InfoCard icon={<User className="w-4 h-4" />} label="Cliente" value={order.customer.name} />
            <InfoCard icon={<Mail className="w-4 h-4" />} label="Pagamento" value={order.paymentMethod} />
            <InfoCard icon={<Tag className="w-4 h-4" />} label="Status" value={order.status} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Panel title="Produtos comprados" icon={<ShoppingBag className="w-4 h-4" />}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Produto</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">SKU</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Qtd.</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Unitário</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {order.items.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3.5 text-[13px] font-medium text-neutral-900">{item.name}</td>
                          <td className="py-3.5 text-[13px] text-neutral-500">{item.sku}</td>
                          <td className="py-3.5 text-[13px] text-neutral-500">{item.quantity}</td>
                          <td className="py-3.5 text-[13px] text-neutral-500">{formatCurrency(item.unitPrice)}</td>
                          <td className="py-3.5 text-[13px] text-right font-medium text-neutral-900">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title="EndereÃ§o de entrega" icon={<MapPin className="w-4 h-4" />}>
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField label="CEP" value={order.shippingAddress.cep} />
                  <DetailField label="Rua" value={order.shippingAddress.street} />
                  <DetailField label="Número" value={order.shippingAddress.number} />
                  <DetailField label="Complemento" value={order.shippingAddress.complement || 'Sem complemento'} />
                  <DetailField label="Bairro" value={order.shippingAddress.district} />
                  <DetailField label="Cidade" value={order.shippingAddress.city} />
                  <DetailField label="Estado" value={order.shippingAddress.state} />
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Resumo financeiro">
                <div className="space-y-3">
                  <SummaryLine label="Subtotal" value={formatCurrency(order.subtotal)} />
                  <SummaryLine label="Frete" value={formatCurrency(order.shipping)} />
                  <SummaryLine label="Descontos" value={formatCurrency(order.discount)} />
                  <SummaryLine label="Total final" value={formatCurrency(order.total)} strong />
                </div>
              </Panel>

              <Panel title="Histórico">
                <div className="space-y-3">
                  <SummaryLine label="Data da criação" value={formatDateTime(order.history.createdAt)} />
                  <SummaryLine label="Data do pagamento" value={order.history.paidAt ? formatDateTime(order.history.paidAt) : 'Ainda não registrado'} />
                  <SummaryLine label="Data do envio" value={order.history.shippedAt ? formatDateTime(order.history.shippedAt) : 'Ainda não registrado'} />
                  <SummaryLine label="Data da entrega" value={order.history.deliveredAt ? formatDateTime(order.history.deliveredAt) : 'Ainda não registrado'} />
                </div>
              </Panel>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ConfirmationModal({
  title,
  description,
  confirmLabel,
  tone,
  onClose,
  onConfirm,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'default' | 'danger';
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.16)]">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-serif text-neutral-900">{title}</h3>
            <p className="mt-2 text-sm text-neutral-500 leading-relaxed">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-6 py-3 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-colors ${
              tone === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-neutral-950 text-white hover:bg-neutral-800'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  iconTone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconTone: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconTone}`}>{icon}</div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
      </div>
      <p className="text-2xl font-serif font-bold text-neutral-900">{value}</p>
    </div>
  );
}

function MenuButton({
  icon,
  label,
  onClick,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-50 ${
        tone === 'danger' ? 'text-red-600' : 'text-neutral-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-neutral-200/50 bg-white p-5 md:p-6">
      <div className="flex items-center gap-2 pb-4 border-b border-neutral-100">
        {icon ? <span className="text-neutral-500">{icon}</span> : null}
        <h4 className="text-[12px] font-semibold uppercase tracking-[0.2em] text-neutral-600">{title}</h4>
      </div>
      <div className="pt-5">{children}</div>
    </div>
  );
}

function InfoCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/50 bg-white p-4">
      <div className="flex items-center gap-2 text-neutral-500">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-2 text-[15px] font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1 text-sm text-neutral-900 font-medium">{value}</div>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50/70 px-4 py-3">
      <span className="text-sm text-neutral-600">{label}</span>
      <span className={`text-sm text-right ${strong ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800'}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: PromotionStatus }) {
  return <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full ${statusTone[status]}`}>{status}</span>;
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{label}</label>
      <textarea
        rows={4}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] resize-none"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function SelectableChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-4 py-3 text-sm font-medium text-left transition-colors ${
        active ? 'border-neutral-900 bg-neutral-900 text-white' : 'border-neutral-200 bg-neutral-50/70 text-neutral-700 hover:bg-neutral-100'
      }`}
    >
      {label}
    </button>
  );
}

function getCampaignRevenue(campaign: PromotionCampaign) {
  return campaign.usages.reduce((sum, usage) => sum + usage.orderValue, 0);
}

function getDiscountLabel(
  campaign: Pick<PromotionCampaign, 'discountType' | 'discountValue'>,
  formatCurrency: (value: number) => string,
) {
  return campaign.discountType === 'percentual' ? `${campaign.discountValue}%` : formatCurrency(campaign.discountValue);
}

function getApplicationLabel(campaign: PromotionCampaign, products: Product[]) {
  if (campaign.applicationType === 'todos') return 'Todos os produtos';
  if (campaign.applicationType === 'categorias') return campaign.categoryNames.length ? campaign.categoryNames.join(', ') : 'Categorias específicas';

  const productNames = campaign.productIds
    .map((productId) => products.find((product) => product.id === productId)?.nome)
    .filter(Boolean) as string[];

  return productNames.length ? productNames.join(', ') : 'Produtos específicos';
}

function getInitialDraft(mode: FormModalState['mode'], campaign: PromotionCampaign | null): CampaignDraft {
  if (!campaign) return emptyDraft;

  if (mode === 'duplicate') {
    return {
      ...campaign,
      name: `${campaign.name} - Cópia`,
      promoCode: campaign.promoCode ? `${campaign.promoCode}-COPY` : '',
      status: 'Pausado',
    };
  }

  return {
    ...campaign,
    status: campaign.status === 'Arquivada' ? 'Pausado' : campaign.status,
  };
}


function normalizeCampaign(campaign: PromotionCampaign): PromotionCampaign {
  return {
    ...campaign,
    description: campaign.description || '',
    promoCode: campaign.promoCode || '',
    discountType: campaign.discountType || 'percentual',
    discountValue: Number(campaign.discountValue || 0),
    minOrderValue: Number(campaign.minOrderValue || 0),
    totalUseLimit: Number(campaign.totalUseLimit || 0),
    useLimitPerCustomer: Number(campaign.useLimitPerCustomer || 0),
    startsAt: campaign.startsAt || '',
    expiresAt: campaign.expiresAt || '',
    applicationType: campaign.applicationType || 'todos',
    categoryNames: Array.isArray(campaign.categoryNames) ? campaign.categoryNames : [],
    productIds: Array.isArray(campaign.productIds) ? campaign.productIds : [],
    status: campaign.status || 'Ativo',
    audienceSize: Number(campaign.audienceSize || 0),
    usages: Array.isArray(campaign.usages) ? campaign.usages : [],
    logs: Array.isArray(campaign.logs) ? campaign.logs : [],
  };
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

