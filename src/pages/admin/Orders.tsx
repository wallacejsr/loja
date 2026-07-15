import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Eye,
  Mail,
  MapPin,
  MessageCircle,
  Package,
  Printer,
  RotateCw,
  Search,
  User,
  X,
} from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { type AddressCountryCode, getAdminTaxIdLabel, getPhoneDisplay, getWhatsAppUrl } from '../../lib/customerForm';
import { useAdminCurrency } from '../../hooks/useAdminCurrency';
import { useDeferredSearchTerm } from '../../hooks/useDeferredSearchTerm';
import {
  getStripeTrackedOrders,
  updateStripeTrackedOrderStatus,
  type StripeTrackedAdminOrder,
} from '../../lib/stripeAdminApi';

type OrderStatus =
  | StripeTrackedAdminOrder['status']
  | 'Aguardando Pagamento'
  | 'Pago'
  | 'Em SeparaÃ§Ã£o'
  | 'Enviado'
  | 'Entregue'
  | 'Cancelado';

type OrderLog = {
  id: string;
  user: string;
  dateTime: string;
  ip: string;
  action: string;
};

type OrderHistory = {
  createdAt: string;
  paidAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
};

type OrderItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type OrderAddress = {
  country?: AddressCountryCode | string;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

type OrderCustomer = {
  documentLabel?: string;
  name: string;
  email: string;
  phone: string;
  phoneCountry?: AddressCountryCode | string;
  phoneE164?: string;
  cpf?: string;
};

type AdminOrder = {
  id: string;
  orderNumber: string;
  purchaseDate: string;
  status: OrderStatus;
  total: number;
  paymentMethod: string;
  paymentStatus?: string;
  sessionStatus?: string;
  customer: OrderCustomer;
  shippingAddress: OrderAddress;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  history: OrderHistory;
  logs: OrderLog[];
  source?: 'stripe-server';
  stripeMode?: 'live' | 'test';
};

const statusOptions: OrderStatus[] = [
  'Aguardando Pagamento',
  'Pago',
  'Em SeparaÃ§Ã£o',
  'Enviado',
  'Entregue',
  'Cancelado',
];

const statusTone: Record<string, string> = {
  'Aguardando Pagamento': 'bg-amber-50 text-amber-600',
  Pago: 'bg-emerald-50 text-emerald-600',
  'Em SeparaÃ§Ã£o': 'bg-violet-50 text-violet-600',
  'Em Separacao': 'bg-violet-50 text-violet-600',
  Enviado: 'bg-blue-50 text-blue-600',
  Entregue: 'bg-neutral-100 text-neutral-600',
  Cancelado: 'bg-red-50 text-red-600',
};

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
});

const adminUserName = 'Admin Loja';

function normalizeStatusKey(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function resolveStatusTone(status: string) {
  if (statusTone[status]) {
    return statusTone[status];
  }

  if (normalizeStatusKey(status) === 'em separacao') {
    return 'bg-violet-50 text-violet-600';
  }

  return 'bg-neutral-100 text-neutral-600';
}

function getOrderDocumentLabel(order: AdminOrder) {
  return order.customer.documentLabel || getAdminTaxIdLabel(order.shippingAddress.country, 'F');
}

function mapServerOrders(serverOrders: StripeTrackedAdminOrder[]): AdminOrder[] {
  return [...serverOrders]
    .map((order) => ({ ...order }))
    .sort((left, right) => new Date(right.purchaseDate).getTime() - new Date(left.purchaseDate).getTime());
}

export function Orders() {
  const { formatCurrency } = useAdminCurrency();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [contactMenuOrderId, setContactMenuOrderId] = useState<string | null>(null);
  const [statusMenuOrderId, setStatusMenuOrderId] = useState<string | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [trackingBackend, setTrackingBackend] = useState<'file' | 'supabase' | 'mariadb' | null>(null);
  const normalizedSearchTerm = useDeferredSearchTerm(searchTerm);

  const loadOrders = React.useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError('');

    try {
      const payload = await getStripeTrackedOrders();
      setTrackingBackend(payload.backend);
      setOrders(mapServerOrders(payload.orders));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel sincronizar os pedidos.';
      setOrdersError(message);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !normalizedSearchTerm
        || order.orderNumber.toLowerCase().includes(normalizedSearchTerm)
        || order.customer.name.toLowerCase().includes(normalizedSearchTerm)
        || order.customer.email.toLowerCase().includes(normalizedSearchTerm);

      const matchesStatus = !statusFilter || normalizeStatusKey(order.status) === normalizeStatusKey(statusFilter);

      return matchesSearch && matchesStatus;
    });
  }, [normalizedSearchTerm, orders, statusFilter]);

  const orderSummary = useMemo(() => orders.reduce((summary, order) => {
    summary.totalOrders += 1;

    if (['aguardando pagamento', 'pago', 'em separacao'].includes(normalizeStatusKey(order.status))) {
      summary.pendingAction += 1;
    }

    if (normalizeStatusKey(order.status) === 'enviado') {
      summary.inTransit += 1;
    }

    summary.totalRevenue += order.total;
    return summary;
  }, {
    totalOrders: 0,
    pendingAction: 0,
    inTransit: 0,
    totalRevenue: 0,
  }), [orders]);

  const orderRows = useMemo(() => filteredOrders.map((order) => ({
    order,
    itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
  })), [filteredOrders]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const updateOrderStatus = async (order: AdminOrder, nextStatus: OrderStatus) => {
    if (normalizeStatusKey(order.status) === normalizeStatusKey(nextStatus)) {
      setStatusMenuOrderId(null);
      return;
    }

    try {
      const payload = await updateStripeTrackedOrderStatus(order.orderNumber, nextStatus, adminUserName);
      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.orderNumber === order.orderNumber
            ? { ...payload.order }
            : currentOrder,
        ),
      );
      showToast(`Status atualizado para ${nextStatus}.`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel atualizar o status deste pedido.');
    } finally {
      setStatusMenuOrderId(null);
    }
  };

  const openWhatsApp = (order: AdminOrder) => {
    const message = `Ola ${order.customer.name}, estamos entrando em contato referente ao seu pedido ${order.orderNumber}. Atenciosamente, Equipe da Loja`;
    const whatsappUrl = getWhatsAppUrl(
      order.customer.phoneE164 || order.customer.phone,
      order.customer.phoneCountry || 'BR',
      message,
    );
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setContactMenuOrderId(null);
  };

  const openEmail = (order: AdminOrder) => {
    const subject = encodeURIComponent(`Pedido ${order.orderNumber}`);
    const body = encodeURIComponent(
      `OlÃ¡ ${order.customer.name},\n\nEstamos entrando em contato referente ao seu pedido.\n\nAtenciosamente,\nEquipe da Loja`,
    );
    window.location.href = `mailto:${order.customer.email}?subject=${subject}&body=${body}`;
    setContactMenuOrderId(null);
  };

  const printOrder = (order: AdminOrder) => {
    const printWindow = window.open('', '_blank', 'width=980,height=760');
    if (!printWindow) {
      showToast('NÃ£o foi possÃ­vel abrir a janela de impressÃ£o.');
      return;
    }

    const documentLabel = getOrderDocumentLabel(order);
    const itemsRows = order.items
      .map(
        (item) => `
          <tr>
            <td>${item.name}</td>
            <td>${item.sku}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unitPrice)}</td>
            <td>${formatCurrency(item.subtotal)}</td>
          </tr>`,
      )
      .join('');

    const logsRows = order.logs
      .map(
        (log) => `
          <tr>
            <td>${dateTimeFormatter.format(new Date(log.dateTime))}</td>
            <td>${log.user}</td>
            <td>${log.ip}</td>
            <td>${log.action}</td>
          </tr>`,
      )
      .join('');

    printWindow.document.write(`
      <html lang="pt-BR">
        <head>
          <title>Pedido ${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 32px; color: #171717; }
            h1, h2 { margin: 0 0 12px; }
            .section { margin-top: 28px; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
            .card { border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #e5e5e5; padding: 10px; text-align: left; font-size: 13px; }
            th { background: #fafafa; }
          </style>
        </head>
        <body>
          <h1>Pedido ${order.orderNumber}</h1>
          <div>Status: ${order.status}</div>
          <div>Data: ${dateTimeFormatter.format(new Date(order.purchaseDate))}</div>

          <div class="section grid">
            <div class="card">
              <h2>Cliente</h2>
              <div>${order.customer.name}</div>
              <div>${order.customer.email}</div>
              <div>${formatPhone(order.customer.phoneE164 || order.customer.phone, order.customer.phoneCountry || 'BR')}</div>
              <div>${documentLabel}: ${order.customer.cpf || 'NÃ£o informado'}</div>
            </div>
            <div class="card">
              <h2>Entrega</h2>
              <div>${order.shippingAddress.street}, ${order.shippingAddress.number}</div>
              <div>${order.shippingAddress.complement || 'Sem complemento'}</div>
              <div>${order.shippingAddress.district} - ${order.shippingAddress.city}/${order.shippingAddress.state}</div>
              <div>CEP ${order.shippingAddress.cep}</div>
            </div>
          </div>

          <div class="section">
            <h2>Produtos</h2>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>SKU</th>
                  <th>Qtd.</th>
                  <th>UnitÃ¡rio</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>${itemsRows}</tbody>
            </table>
          </div>

          <div class="section">
            <h2>Resumo financeiro</h2>
            <div>Subtotal: ${formatCurrency(order.subtotal)}</div>
            <div>Frete: ${formatCurrency(order.shipping)}</div>
            <div>Descontos: ${formatCurrency(order.discount)}</div>
            <div><strong>Total: ${formatCurrency(order.total)}</strong></div>
          </div>

          <div class="section">
            <h2>Auditoria</h2>
            <table>
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>UsuÃ¡rio</th>
                  <th>IP</th>
                  <th>AÃ§Ã£o</th>
                </tr>
              </thead>
              <tbody>${logsRows}</tbody>
            </table>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Pedidos</h2>
          <p className="text-neutral-500 text-[13px]">Gerencie, acompanhe e opere todos os pedidos da loja.</p>
        </div>

        <button
          type="button"
          onClick={() => void loadOrders()}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-700 transition-colors hover:bg-neutral-50"
        >
          <RotateCw className={`h-4 w-4 ${ordersLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {trackingBackend ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-[12px] leading-relaxed text-sky-700">
          Pedidos sincronizados pelo backend <span className="font-semibold">{trackingBackend}</span>. A tela agora exibe apenas registros reais retornados pela API.
        </div>
      ) : null}

      {ordersError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] leading-relaxed text-red-700">
          Nao foi possivel carregar os pedidos reais agora. Detalhe: {ordersError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total de pedidos" value={String(orderSummary.totalOrders)} />
        <SummaryCard label="Aguardando aÃ§Ã£o" value={String(orderSummary.pendingAction)} />
        <SummaryCard label="Em transporte" value={String(orderSummary.inTransit)} />
        <SummaryCard label="Faturamento listado" value={formatCurrency(orderSummary.totalRevenue)} />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 border-b border-neutral-100/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar por ID, cliente ou e-mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 text-[13px] transition-all bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="border border-neutral-200/60 bg-neutral-50/50 hover:bg-neutral-50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 rounded-xl transition-colors focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 appearance-none"
            >
              <option value="">Todos os Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Pedido</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cliente</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Data</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Itens</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Total</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">AÃ§Ãµes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              {ordersLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-[13px] text-neutral-500">
                    Carregando pedidos reais...
                  </td>
                </tr>
              ) : null}

              {!ordersLoading && orderRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-[13px] text-neutral-500">
                    {orders.length === 0
                      ? 'Nenhum pedido real foi encontrado ainda.'
                      : 'Nenhum pedido encontrado com os filtros atuais.'}
                  </td>
                </tr>
              ) : null}

              {!ordersLoading && orderRows.map(({ order, itemCount }) => (
                <tr key={order.id} className="hover:bg-neutral-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedOrderId(order.id)}>
                  <td className="py-4 px-6">
                    <div className="font-medium text-[13px] text-neutral-900 group-hover:text-blue-600 transition-colors">{order.orderNumber}</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5 tracking-wide">{order.paymentMethod}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-[13px] font-medium text-neutral-900">{order.customer.name}</div>
                    <div className="text-[11px] font-medium text-neutral-400 mt-0.5 tracking-wide">{order.customer.email}</div>
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-600">{formatDateTime(order.purchaseDate)}</td>
                  <td className="py-4 px-6">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-600">{itemCount}</td>
                  <td className="py-4 px-6 text-[13px] font-medium text-neutral-900 text-right">{formatCurrency(order.total)}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-1">
                      <ActionButton
                        title="Visualizar"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedOrderId(order.id);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </ActionButton>

                      <div className="relative">
                        <ActionButton
                          title="Contatar"
                          onClick={(event) => {
                            event.stopPropagation();
                            setContactMenuOrderId((current) => (current === order.id ? null : order.id));
                            setStatusMenuOrderId(null);
                          }}
                        >
                          <MessageCircle className="w-4 h-4" />
                        </ActionButton>

                        {contactMenuOrderId === order.id && (
                          <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-neutral-200 bg-white shadow-[0_16px_30px_rgba(0,0,0,0.08)] z-20">
                            <button
                              type="button"
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-neutral-50 rounded-t-2xl"
                              onClick={(event) => {
                                event.stopPropagation();
                                openWhatsApp(order);
                              }}
                            >
                              <MessageCircle className="w-4 h-4 text-emerald-600" />
                              WhatsApp
                            </button>
                            <button
                              type="button"
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-neutral-50 rounded-b-2xl"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEmail(order);
                              }}
                            >
                              <Mail className="w-4 h-4 text-blue-600" />
                              E-mail
                            </button>
                          </div>
                        )}
                      </div>

                      <ActionButton
                        title="Imprimir pedido"
                        onClick={(event) => {
                          event.stopPropagation();
                          printOrder(order);
                        }}
                      >
                        <Printer className="w-4 h-4" />
                      </ActionButton>

                      <div className="relative">
                        <ActionButton
                          title="Atualizar status"
                          onClick={(event) => {
                            event.stopPropagation();
                            setStatusMenuOrderId((current) => (current === order.id ? null : order.id));
                            setContactMenuOrderId(null);
                          }}
                        >
                          <RotateCw className="w-4 h-4" />
                        </ActionButton>

                        {statusMenuOrderId === order.id && (
                          <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-neutral-200 bg-white shadow-[0_16px_30px_rgba(0,0,0,0.08)] z-20 p-2">
                            {statusOptions.map((status) => (
                              <button
                                key={status}
                                type="button"
                                className={`
                                  w-full rounded-xl px-3 py-2 text-sm text-left transition-colors
                                  ${normalizeStatusKey(order.status) === normalizeStatusKey(status) ? 'bg-neutral-900 text-white' : 'hover:bg-neutral-50 text-neutral-700'}
                                `}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void updateOrderStatus(order, status);
                                }}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-neutral-100/60 flex items-center justify-between text-[13px] text-neutral-500 bg-white">
          <div>
            Mostrando <span className="font-medium text-neutral-900">{orderRows.length === 0 ? 0 : 1}</span> a{' '}
            <span className="font-medium text-neutral-900">{filteredOrders.length}</span> de{' '}
            <span className="font-medium text-neutral-900">{orders.length}</span> pedidos
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Lista em tempo real
          </div>
        </div>
      </div>

      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          formatCurrency={formatCurrency}
          onClose={() => setSelectedOrderId(null)}
          onChangeStatus={(status) => void updateOrderStatus(selectedOrder, status)}
          onOpenWhatsApp={() => openWhatsApp(selectedOrder)}
          onOpenEmail={() => openEmail(selectedOrder)}
          onPrint={() => printOrder(selectedOrder)}
        />
      )}
    </div>
  );
}

function OrderDetailsModal({
  order,
  formatCurrency,
  onClose,
  onChangeStatus,
  onOpenWhatsApp,
  onOpenEmail,
  onPrint,
}: {
  order: AdminOrder;
  formatCurrency: (value: number) => string;
  onClose: () => void;
  onChangeStatus: (status: OrderStatus) => void;
  onOpenWhatsApp: () => void;
  onOpenEmail: () => void;
  onPrint: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.16)]">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-neutral-50/60">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Pedido {order.orderNumber}</div>
            <h3 className="mt-2 text-2xl font-serif text-neutral-900">Detalhes completos do pedido</h3>
            <p className="mt-1 text-[13px] text-neutral-500">Consulta operacional, auditoria e atualizaÃ§Ã£o de status em um sÃ³ lugar.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-white"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-6 md:p-8 space-y-8">
          <section className="grid gap-4 md:grid-cols-4">
            <InfoCard icon={<Package className="w-4 h-4" />} label="NÃºmero do pedido" value={order.orderNumber} />
            <InfoCard icon={<RotateCw className="w-4 h-4" />} label="Status atual" value={<StatusBadge status={order.status} />} />
            <InfoCard icon={<ChevronDown className="w-4 h-4" />} label="Forma de pagamento" value={order.paymentMethod} />
            <InfoCard icon={<MapPin className="w-4 h-4" />} label="Total" value={formatCurrency(order.total)} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <Panel title="Dados do Cliente" icon={<User className="w-4 h-4" />}>
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField label="Nome completo" value={order.customer.name} />
                  <DetailField label="E-mail" value={order.customer.email} />
                  <DetailField label="Telefone" value={formatPhone(order.customer.phoneE164 || order.customer.phone, order.customer.phoneCountry || 'BR')} />
                  <DetailField label={getOrderDocumentLabel(order)} value={order.customer.cpf || 'NÃ£o informado'} />
                </div>
              </Panel>

              <Panel title="EndereÃ§o de Entrega" icon={<MapPin className="w-4 h-4" />}>
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField label="CEP" value={order.shippingAddress.cep} />
                  <DetailField label="Rua" value={order.shippingAddress.street} />
                  <DetailField label="NÃºmero" value={order.shippingAddress.number} />
                  <DetailField label="Complemento" value={order.shippingAddress.complement || 'Sem complemento'} />
                  <DetailField label="Bairro" value={order.shippingAddress.district} />
                  <DetailField label="Cidade" value={order.shippingAddress.city} />
                  <DetailField label="Estado" value={order.shippingAddress.state} />
                </div>
              </Panel>

              <Panel title="Produtos Comprados" icon={<Package className="w-4 h-4" />}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Produto</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">SKU</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Qtd.</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">UnitÃ¡rio</th>
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
            </div>

            <div className="space-y-6">
              <Panel title="Resumo Financeiro">
                <div className="space-y-3">
                  <SummaryLine label="Subtotal" value={formatCurrency(order.subtotal)} />
                  <SummaryLine label="Frete" value={formatCurrency(order.shipping)} />
                  <SummaryLine label="Descontos" value={formatCurrency(order.discount)} />
                  <SummaryLine label="Total final" value={formatCurrency(order.total)} strong />
                </div>
              </Panel>

              <Panel title="HistÃ³rico">
                <div className="space-y-3">
                  <SummaryLine label="Data da criaÃ§Ã£o" value={formatDateTime(order.history.createdAt)} />
                  <SummaryLine label="Data do pagamento" value={order.history.paidAt ? formatDateTime(order.history.paidAt) : 'Ainda nÃ£o registrado'} />
                  <SummaryLine label="Data do envio" value={order.history.shippedAt ? formatDateTime(order.history.shippedAt) : 'Ainda nÃ£o registrado'} />
                  <SummaryLine label="Data da entrega" value={order.history.deliveredAt ? formatDateTime(order.history.deliveredAt) : 'Ainda nÃ£o registrado'} />
                </div>
              </Panel>

              <Panel title="AÃ§Ãµes rÃ¡pidas">
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={onOpenWhatsApp}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
                    >
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={onOpenEmail}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
                    >
                      <Mail className="w-4 h-4 text-blue-600" />
                      E-mail
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {statusOptions.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => onChangeStatus(status)}
                        className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                          normalizeStatusKey(order.status) === normalizeStatusKey(status)
                            ? 'bg-neutral-900 text-white'
                            : 'border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>
          </section>

          <Panel title="Logs de alteraÃ§Ãµes">
            <div className="space-y-3">
              {order.logs.map((log) => (
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
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-neutral-200/40 p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors rounded-lg hover:bg-neutral-100"
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full capitalize ${resolveStatusTone(status)}`}>{status}</span>;
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
      <span className={`text-sm ${strong ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800'}`}>{value}</span>
    </div>
  );
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatPhone(value: string, countryCode: AddressCountryCode | string = 'BR') {
  return getPhoneDisplay(value, countryCode as AddressCountryCode);
}

function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}
