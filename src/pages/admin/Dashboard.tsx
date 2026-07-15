import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  DollarSign,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PromotionModal } from '../../components/admin/PromotionModal';
import { useAdminCurrency } from '../../hooks/useAdminCurrency';
import { useSettings } from '../../hooks/useSettings';
import {
  getAdminDashboardSummary,
  type AdminDashboardRecentOrder,
  type AdminDashboardSummary,
} from '../../lib/storeApiRest';

type DashboardStatCard = {
  description?: string;
  icon: typeof DollarSign;
  isCurrency?: boolean;
  key: string;
  name: string;
  value: number;
};

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const statusToneMap: Record<string, string> = {
  'Aguardando Pagamento': 'bg-amber-50 text-amber-600',
  Pago: 'bg-emerald-50 text-emerald-600',
  'Em Separacao': 'bg-violet-50 text-violet-600',
  Enviado: 'bg-blue-50 text-blue-600',
  Entregue: 'bg-neutral-100 text-neutral-600',
  Cancelado: 'bg-red-50 text-red-600',
};

function getStatusTone(status: string) {
  return statusToneMap[status] || 'bg-neutral-100 text-neutral-600';
}

function formatOrderDate(value: string) {
  try {
    return dateTimeFormatter.format(new Date(value));
  } catch {
    return value;
  }
}

export function Dashboard() {
  const navigate = useNavigate();
  const [isPromotionModalOpen, setIsPromotionModalOpen] = useState(false);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { formatCurrency } = useAdminCurrency();
  const { settings } = useSettings();

  const supportHref = settings.supportEmail || settings.email
    ? `mailto:${settings.supportEmail || settings.email}`
    : '#';

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError('');

      try {
        const payload = await getAdminDashboardSummary();
        if (!mounted) return;
        setSummary(payload);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar o dashboard.');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo<DashboardStatCard[]>(() => {
    if (!summary) {
      return [
        { key: 'revenue', name: 'Receita total', value: 0, icon: DollarSign, isCurrency: true },
        { key: 'orders', name: 'Pedidos', value: 0, icon: ShoppingCart },
        { key: 'customers', name: 'Clientes novos', value: 0, icon: Users },
        { key: 'products', name: 'Produtos ativos', value: 0, icon: Package },
      ];
    }

    return [
      {
        key: 'revenue',
        name: summary.metrics.revenue.label,
        value: summary.metrics.revenue.value,
        description: summary.metrics.revenue.description,
        icon: DollarSign,
        isCurrency: true,
      },
      {
        key: 'orders',
        name: summary.metrics.orders.label,
        value: summary.metrics.orders.value,
        description: summary.metrics.orders.description,
        icon: ShoppingCart,
      },
      {
        key: 'customers',
        name: summary.metrics.newCustomers.label,
        value: summary.metrics.newCustomers.value,
        description: summary.metrics.newCustomers.description,
        icon: Users,
      },
      {
        key: 'products',
        name: summary.metrics.activeProducts.label,
        value: summary.metrics.activeProducts.value,
        description: summary.metrics.activeProducts.description,
        icon: Package,
      },
    ];
  }, [summary]);

  const recentOrders = summary?.recentOrders || [];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Visao Geral</h2>
        <p className="text-neutral-500 text-[13px]">Acompanhe as metricas e o desempenho real da sua loja.</p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="bg-white rounded-2xl border border-neutral-200/40 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-inner flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-600 uppercase tracking-wider">
                {loading ? 'Carregando' : 'Ao vivo'}
              </span>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 mb-1">{stat.name}</p>
              <h3 className="text-[28px] font-medium text-neutral-900 tracking-tight">
                {stat.isCurrency ? formatCurrency(stat.value) : stat.value}
              </h3>
              <p className="mt-2 min-h-[20px] text-[12px] text-neutral-500">
                {loading ? 'Sincronizando dados do painel...' : (stat.description || 'Sem anotacoes adicionais.')}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[13px] font-semibold uppercase tracking-widest text-neutral-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-neutral-400" />
              Pedidos Recentes
            </h3>
            <button
              onClick={() => navigate('/admin/orders')}
              className="text-[11px] font-semibold text-neutral-500 hover:text-black uppercase tracking-wider transition-colors flex items-center gap-1 group"
            >
              Ver todos <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          <div className="-mx-6 border-t border-neutral-100/60 flex-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
                    <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Pedido ID</th>
                    <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cliente</th>
                    <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Data</th>
                    <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                    <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-10 px-6 text-center text-[13px] text-neutral-500">
                        Carregando pedidos recentes...
                      </td>
                    </tr>
                  ) : null}

                  {!loading && recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 px-6 text-center text-[13px] text-neutral-500">
                        Nenhum pedido real encontrado ainda. Assim que as compras entrarem na base, elas aparecem aqui.
                      </td>
                    </tr>
                  ) : null}

                  {!loading && recentOrders.map((order: AdminDashboardRecentOrder) => (
                    <tr
                      key={`${order.source}:${order.orderNumber}`}
                      className="hover:bg-neutral-50/50 transition-colors group cursor-pointer"
                      onClick={() => navigate('/admin/orders')}
                    >
                      <td className="py-4 px-6 font-medium text-[13px] text-neutral-900 group-hover:text-blue-600 transition-colors">
                        {order.orderNumber}
                      </td>
                      <td className="py-4 px-6 text-[13px] text-neutral-600">{order.customerName}</td>
                      <td className="py-4 px-6 text-neutral-500 text-[13px]">{formatOrderDate(order.createdAt)}</td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full capitalize ${getStatusTone(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-medium text-[13px] text-neutral-900 text-right">
                        {formatCurrency(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-widest text-neutral-900 mb-6 flex items-center gap-2">
              Acoes Rapidas
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/products')}
                className="w-full bg-[#0A0A0A] text-white px-5 py-3.5 font-semibold tracking-wide text-[13px] rounded-xl hover:bg-neutral-800 transition-all flex items-center justify-center gap-3 shadow-[0_4px_14px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.2)]"
              >
                <Package className="w-4 h-4 text-white/70" />
                Adicionar Produto
              </button>
              <button
                onClick={() => setIsPromotionModalOpen(true)}
                className="w-full bg-white border border-neutral-200 text-neutral-700 px-5 py-3.5 font-semibold tracking-wide text-[13px] rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all flex items-center justify-center gap-3"
              >
                <TrendingUp className="w-4 h-4 text-neutral-400" />
                Criar Promocao
              </button>

              <PromotionModal isOpen={isPromotionModalOpen} onClose={() => setIsPromotionModalOpen(false)} />
              <button
                onClick={() => navigate('/admin/customers')}
                className="w-full bg-white border border-neutral-200 text-neutral-700 px-5 py-3.5 font-semibold tracking-wide text-[13px] rounded-xl hover:bg-neutral-50 hover:border-neutral-300 transition-all flex items-center justify-center gap-3"
              >
                <Users className="w-4 h-4 text-neutral-400" />
                Novo Cliente
              </button>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-100/60">
            <div className="bg-[#F5F5F7] rounded-xl p-5 border border-neutral-200/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-neutral-200/50 to-transparent rounded-bl-[100px] -mr-4 -mt-4" />
              <h4 className="text-[11px] font-semibold uppercase tracking-widest text-neutral-900 mb-1.5 relative z-10">Suporte da Loja</h4>
              <p className="text-[13px] text-neutral-500 mb-4 leading-relaxed relative z-10 pr-4">Precisa de ajuda com o painel ou com a loja?</p>
              <a href={supportHref} className="text-[11px] font-semibold text-blue-600 uppercase tracking-widest hover:text-blue-700 hover:underline relative z-10">Falar com Suporte -&gt;</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
