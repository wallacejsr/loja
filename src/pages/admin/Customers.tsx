import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  Copy,
  Edit,
  Eye,
  Mail,
  MessageCircle,
  Phone,
  Search,
  RefreshCw,
  ShoppingBag,
  User,
  X,
} from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import { StorePhoneField } from '../../components/StorePhoneField';
import { type AddressCountryCode, formatPhone as formatPhoneByCountry, getAdminTaxIdLabel, getPhoneE164, getWhatsAppUrl } from '../../lib/customerForm';
import { useAdminCurrency } from '../../hooks/useAdminCurrency';
import { useDeferredSearchTerm } from '../../hooks/useDeferredSearchTerm';
import { getAdminCustomers as fetchAdminCustomers, updateAdminCustomer as persistAdminCustomer } from '../../lib/storeApiRest';

type CustomerStatus = 'Ativo' | 'Inativo';
type OrderStatus = 'Aguardando Pagamento' | 'Pago' | 'Em Separação' | 'Enviado' | 'Entregue' | 'Cancelado';

type Address = {
  country?: AddressCountryCode;
  cep: string;
  street: string;
  number: string;
  complement?: string;
  district: string;
  city: string;
  state: string;
};

type CustomerOrderItem = {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

type CustomerOrder = {
  id: string;
  orderNumber: string;
  date: string;
  status: OrderStatus;
  itemsCount: number;
  total: number;
  paymentMethod: string;
  shippingAddress: Address;
  billingAddress: Address;
  items: CustomerOrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
};

type CustomerActivity = {
  id: string;
  type: string;
  description: string;
  dateTime: string;
};

type CustomerAuditLog = {
  id: string;
  customerId: string;
  user: string;
  field: string;
  previousValue: string;
  nextValue: string;
  dateTime: string;
  ip: string;
};

type CustomerRecord = {
  id: string;
  name: string;
  cpf: string;
  documentLabel?: string;
  birthDate: string;
  email: string;
  phone: string;
  phoneCountry?: AddressCountryCode;
  phoneE164?: string;
  registeredAt: string;
  status: CustomerStatus;
  blockPurchases: boolean;
  allowMarketing: boolean;
  shippingAddress: Address;
  billingAddress: Address;
  orders: CustomerOrder[];
  activities: CustomerActivity[];
  auditLogs: CustomerAuditLog[];
};

type ActionMenuState = {
  customerId: string;
  top: number;
  left: number;
  openUp: boolean;
};


const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
});

function getCustomerDocumentLabel(customer: Pick<CustomerRecord, 'documentLabel' | 'shippingAddress'>) {
  return customer.documentLabel || getAdminTaxIdLabel(customer.shippingAddress.country, 'F');
}

const statusTone: Record<CustomerStatus, string> = {
  Ativo: 'bg-emerald-50 text-emerald-600',
  Inativo: 'bg-neutral-100 text-neutral-600',
};

export function Customers() {
  const { formatCurrency } = useAdminCurrency();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<ActionMenuState | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isReloading, setIsReloading] = useState(false);
  const normalizedSearchTerm = useDeferredSearchTerm(searchTerm);
  const loadCustomers = React.useCallback(async () => {
    setLoadingCustomers(true);
    setLoadingError(null);

    try {
      const nextCustomers = await fetchAdminCustomers();
      setCustomers(nextCustomers);
    } catch (error) {
      console.error('Falha ao carregar clientes do painel', error);
      setLoadingError(error instanceof Error ? error.message : 'Nao foi possivel carregar os clientes.');
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
      setIsReloading(false);
    }
  }, []);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

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

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      if (!normalizedSearchTerm) return true;
      return (
        customer.name.toLowerCase().includes(normalizedSearchTerm) ||
        customer.email.toLowerCase().includes(normalizedSearchTerm) ||
        customer.cpf.toLowerCase().includes(normalizedSearchTerm)
      );
    });
  }, [customers, normalizedSearchTerm]);

  const customerSummary = useMemo(() => customers.reduce((summary, customer) => {
    summary.totalCustomers += 1;
    if (customer.status === 'Ativo') summary.activeCustomers += 1;
    if (customer.orders.length > 0) summary.customersWithOrders += 1;
    summary.totalRevenue += customer.orders.reduce((orderSum, order) => orderSum + order.total, 0);
    return summary;
  }, {
    totalCustomers: 0,
    activeCustomers: 0,
    customersWithOrders: 0,
    totalRevenue: 0,
  }), [customers]);

  const customerRows = useMemo(() => filteredCustomers.map((customer) => ({
    customer,
    totalSpent: customer.orders.reduce((sum, order) => sum + order.total, 0),
    phoneDisplay: formatPhone(customer.phoneE164 || customer.phone, customer.phoneCountry || 'BR'),
  })), [filteredCustomers]);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const editingCustomer = useMemo(
    () => customers.find((customer) => customer.id === editingCustomerId) ?? null,
    [customers, editingCustomerId],
  );

  const selectedOrder = useMemo(() => {
    if (!selectedOrderId) return null;
    for (const customer of customers) {
      const order = customer.orders.find((item) => item.id === selectedOrderId);
      if (order) return { customer, order };
    }
    return null;
  }, [customers, selectedOrderId]);

  const copyToClipboard = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copiado com sucesso.`);
    } catch (error) {
      showToast(`Não foi possível copiar ${label.toLowerCase()}.`);
    }
  };

  const openWhatsApp = (customer: CustomerRecord) => {
    const message = `Ola ${customer.name}, estamos entrando em contato referente ao seu cadastro/pedido em nossa loja.`;
    const whatsappUrl = getWhatsAppUrl(
      customer.phoneE164 || customer.phone,
      customer.phoneCountry || 'BR',
      message,
    );
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    setActionMenu(null);
  };

  const openEmail = (customer: CustomerRecord) => {
    const subject = encodeURIComponent('Atendimento - Loja');
    const body = encodeURIComponent(
      `Olá ${customer.name},\n\nEstamos entrando em contato referente ao seu cadastro/pedido em nossa loja.\n\nAtenciosamente,\nEquipe da Loja`,
    );
    window.location.href = `mailto:${customer.email}?subject=${subject}&body=${body}`;
    setActionMenu(null);
  };

  const toggleActionMenu = (event: React.MouseEvent<HTMLButtonElement>, customerId: string) => {
    event.stopPropagation();

    if (actionMenu?.customerId === customerId) {
      setActionMenu(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 224;
    const menuHeight = 332;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const openUp = rect.bottom + menuHeight > viewportHeight - 16 && rect.top > menuHeight;

    setActionMenu({
      customerId,
      top: openUp ? rect.top - 8 : rect.bottom + 8,
      left: Math.min(Math.max(16, rect.right - menuWidth), viewportWidth - menuWidth - 16),
      openUp,
    });
  };

  const saveCustomer = async (updatedCustomer: CustomerRecord) => {
    try {
      await persistAdminCustomer(updatedCustomer.id, updatedCustomer);
      await loadCustomers();
      setEditingCustomerId(null);
      showToast('Cliente atualizado com sucesso.');
    } catch (error) {
      console.error('Falha ao salvar cliente', error);
      showToast(error instanceof Error ? error.message : 'Nao foi possivel salvar o cliente.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Clientes</h2>
          <p className="text-neutral-500 text-[13px]">Mini CRM do painel com visão 360º, histórico de pedidos e auditoria.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsReloading(true);
            void loadCustomers();
          }}
          disabled={loadingCustomers || isReloading}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${loadingCustomers || isReloading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Clientes cadastrados" value={String(customerSummary.totalCustomers)} />
        <SummaryCard label="Ativos" value={String(customerSummary.activeCustomers)} />
        <SummaryCard label="Com compras" value={String(customerSummary.customersWithOrders)} />
        <SummaryCard
          label="Faturamento dos clientes"
          value={formatCurrency(customerSummary.totalRevenue)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 border-b border-neutral-100/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 text-[13px] transition-all bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          </div>
        </div>

        {loadingCustomers ? (
          <div className="px-6 py-12 text-center text-sm text-neutral-500">Carregando clientes...</div>
        ) : loadingError ? (
          <div className="px-6 py-12 text-center">
            <div className="text-sm font-medium text-red-600">{loadingError}</div>
            <div className="mt-2 text-xs text-neutral-500">Tente recarregar a página para consultar a base real.</div>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-neutral-500">Nenhum cliente encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cliente</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Contato</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-center">Pedidos</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Total gasto</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              {customerRows.map(({ customer, totalSpent, phoneDisplay }) => (
                <tr key={customer.id} className="hover:bg-neutral-50/50 transition-colors group cursor-pointer" onClick={() => setSelectedCustomerId(customer.id)}>
                  <td className="py-4 px-6">
                    <div className="font-medium text-[13px] text-neutral-900 group-hover:text-blue-600 transition-colors">{customer.name}</div>
                    <div className="text-[11px] font-medium text-neutral-400 mt-0.5 tracking-wide">ID: {customer.id}</div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-[13px] text-neutral-600 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400" /> {customer.email}
                    </div>
                    <div className="text-[13px] text-neutral-600 flex items-center gap-2 mt-1">
                      <Phone className="w-3.5 h-3.5 text-neutral-400" /> {phoneDisplay}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-[13px] text-neutral-600 text-center font-medium">{customer.orders.length}</td>
                  <td className="py-4 px-6 text-[13px] font-medium text-neutral-900 text-right">{formatCurrency(totalSpent)}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${statusTone[customer.status]}`}>
                      {customer.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="inline-flex justify-end">
                      <button
                        type="button"
                        onClick={(event) => toggleActionMenu(event, customer.id)}
                        className="inline-flex items-center gap-2 rounded-xl border border-neutral-200/70 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 transition-colors hover:bg-neutral-50"
                      >
                        Ações
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        <div className="p-4 border-t border-neutral-100/60 flex items-center justify-between text-[13px] text-neutral-500 bg-white">
          <div>
            Mostrando <span className="font-medium text-neutral-900">1</span> a{' '}
            <span className="font-medium text-neutral-900">{filteredCustomers.length}</span> de{' '}
            <span className="font-medium text-neutral-900">{customers.length}</span> clientes
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 border border-neutral-200/60 rounded-xl hover:bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider transition-colors">
              Anterior
            </button>
            <button className="px-4 py-2 border border-neutral-200/60 rounded-xl hover:bg-neutral-50 text-neutral-900 text-[11px] font-semibold uppercase tracking-wider transition-colors">
              Próxima
            </button>
          </div>
        </div>
      </div>

      {actionMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setActionMenu(null)}>
          <div
            className="fixed z-50 w-56 rounded-2xl border border-neutral-200 bg-white p-2 shadow-[0_16px_30px_rgba(0,0,0,0.08)]"
            style={{
              left: actionMenu.left,
              top: actionMenu.top,
              transform: actionMenu.openUp ? 'translateY(-100%)' : undefined,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const customer = customers.find((item) => item.id === actionMenu.customerId);
              if (!customer) return null;

              return (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      setActionMenu(null);
                    }}
                  >
                    <Eye className="w-4 h-4 text-neutral-500" />
                    Visualizar
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
                    onClick={() => {
                      setEditingCustomerId(customer.id);
                      setActionMenu(null);
                    }}
                  >
                    <Edit className="w-4 h-4 text-neutral-500" />
                    Editar
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      setActionMenu(null);
                    }}
                  >
                    <ShoppingBag className="w-4 h-4 text-neutral-500" />
                    Ver pedidos
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
                    onClick={() => openWhatsApp(customer)}
                  >
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
                    onClick={() => openEmail(customer)}
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    E-mail
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
                    onClick={() => {
                      void copyToClipboard('Telefone', formatPhone(customer.phoneE164 || customer.phone, customer.phoneCountry || 'BR'));
                      setActionMenu(null);
                    }}
                  >
                    <Copy className="w-4 h-4 text-neutral-500" />
                    Copiar telefone
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-neutral-50"
                    onClick={() => {
                      void copyToClipboard('E-mail', customer.email);
                      setActionMenu(null);
                    }}
                  >
                    <Copy className="w-4 h-4 text-neutral-500" />
                    Copiar e-mail
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {selectedCustomer && (
        <CustomerViewModal
          customer={selectedCustomer}
          formatCurrency={formatCurrency}
          onClose={() => setSelectedCustomerId(null)}
          onEdit={() => {
            setSelectedCustomerId(null);
            setEditingCustomerId(selectedCustomer.id);
          }}
          onOpenOrder={(orderId) => setSelectedOrderId(orderId)}
          onOpenWhatsApp={() => openWhatsApp(selectedCustomer)}
          onOpenEmail={() => openEmail(selectedCustomer)}
        />
      )}

      {editingCustomer && (
        <CustomerEditModal customer={editingCustomer} onClose={() => setEditingCustomerId(null)} onSave={saveCustomer} />
      )}

      {selectedOrder && (
        <CustomerOrderDetailsModal
          customer={selectedOrder.customer}
          order={selectedOrder.order}
          formatCurrency={formatCurrency}
          onClose={() => setSelectedOrderId(null)}
        />
      )}
    </div>
  );
}

function CustomerViewModal({
  customer,
  formatCurrency,
  onClose,
  onEdit,
  onOpenOrder,
  onOpenWhatsApp,
  onOpenEmail,
}: {
  customer: CustomerRecord;
  formatCurrency: (value: number) => string;
  onClose: () => void;
  onEdit: () => void;
  onOpenOrder: (orderId: string) => void;
  onOpenWhatsApp: () => void;
  onOpenEmail: () => void;
}) {
  const totalSpent = customer.orders.reduce((sum, order) => sum + order.total, 0);
  const ticketAverage = customer.orders.length ? totalSpent / customer.orders.length : 0;
  const lastOrder = [...customer.orders].sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
  const biggestOrder = [...customer.orders].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.16)]">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-neutral-50/60">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Cliente {customer.id}</div>
            <h3 className="mt-2 text-2xl font-serif text-neutral-900">Perfil completo do cliente</h3>
            <p className="mt-1 text-[13px] text-neutral-500">Visão consolidada de cadastro, pedidos, indicadores e atividades.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-white"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-6 md:p-8 space-y-8">
          <section className="grid gap-4 md:grid-cols-4">
            <InfoCard icon={<User className="w-4 h-4" />} label="Nome completo" value={customer.name} />
            <InfoCard icon={<Phone className="w-4 h-4" />} label="Telefone" value={formatPhone(customer.phoneE164 || customer.phone, customer.phoneCountry || 'BR')} />
            <InfoCard icon={<Mail className="w-4 h-4" />} label="E-mail" value={customer.email} />
            <InfoCard icon={<ShoppingBag className="w-4 h-4" />} label="Status" value={<StatusBadge status={customer.status} />} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <Panel title="Dados do cliente" icon={<User className="w-4 h-4" />}>
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField label="ID" value={customer.id} />
                  <DetailField label={getCustomerDocumentLabel(customer)} value={customer.cpf || 'Não informado'} />
                  <DetailField label="E-mail" value={customer.email} />
                  <DetailField label="Telefone" value={formatPhone(customer.phoneE164 || customer.phone, customer.phoneCountry || 'BR')} />
                  <DetailField label="Data de cadastro" value={formatDateTime(customer.registeredAt)} />
                  <DetailField label="Data de nascimento" value={customer.birthDate ? formatShortDate(customer.birthDate) : 'Não informada'} />
                </div>
              </Panel>

              <Panel title="Endereços">
                <div className="grid gap-4 md:grid-cols-2">
                  <AddressCard title="Entrega" address={customer.shippingAddress} />
                  <AddressCard title="Cobrança" address={customer.billingAddress} />
                </div>
              </Panel>

              <Panel title="Histórico de pedidos" icon={<ShoppingBag className="w-4 h-4" />}>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Pedido</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Data</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-center">Itens</th>
                        <th className="py-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Valor total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {customer.orders.map((order) => (
                        <tr key={order.id} className="cursor-pointer hover:bg-neutral-50/70" onClick={() => onOpenOrder(order.id)}>
                          <td className="py-3.5 text-[13px] font-medium text-neutral-900">{order.orderNumber}</td>
                          <td className="py-3.5 text-[13px] text-neutral-500">{formatDateTime(order.date)}</td>
                          <td className="py-3.5">
                            <OrderStatusBadge status={order.status} />
                          </td>
                          <td className="py-3.5 text-[13px] text-neutral-500 text-center">{order.itemsCount}</td>
                          <td className="py-3.5 text-[13px] text-right font-medium text-neutral-900">{formatCurrency(order.total)}</td>
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
                  <SummaryLine label="Total de pedidos" value={String(customer.orders.length)} />
                  <SummaryLine label="Total gasto" value={formatCurrency(totalSpent)} />
                  <SummaryLine label="Ticket médio" value={formatCurrency(ticketAverage)} />
                  <SummaryLine label="Última compra" value={lastOrder ? formatDateTime(lastOrder.date) : 'Sem compras'} />
                  <SummaryLine label="Maior compra" value={biggestOrder ? formatCurrency(biggestOrder.total) : formatCurrency(0)} />
                </div>
              </Panel>

              <Panel title="Ações rápidas">
                <div className="grid gap-2 sm:grid-cols-2">
                  <QuickButton icon={<MessageCircle className="w-4 h-4 text-emerald-600" />} label="WhatsApp" onClick={onOpenWhatsApp} />
                  <QuickButton icon={<Mail className="w-4 h-4 text-blue-600" />} label="E-mail" onClick={onOpenEmail} />
                </div>
              </Panel>

              <Panel title="Histórico de atividades">
                <div className="space-y-3">
                  {customer.activities.map((activity) => (
                    <div key={activity.id} className="rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-3">
                      <div className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">{activity.type}</div>
                      <div className="mt-1 text-sm text-neutral-800">{activity.description}</div>
                      <div className="mt-2 text-[12px] text-neutral-500">{formatDateTime(activity.dateTime)}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Logs de auditoria">
                <div className="space-y-3">
                  {customer.auditLogs.length ? (
                    customer.auditLogs.map((log) => (
                      <div key={log.id} className="rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-neutral-500">
                          <span className="font-semibold text-neutral-700">{log.user}</span>
                          <span>{formatDateTime(log.dateTime)}</span>
                          <span>IP {log.ip}</span>
                        </div>
                        <div className="mt-2 text-sm text-neutral-800">
                          <strong>{log.field}:</strong> {log.previousValue} → {log.nextValue}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70 px-4 py-4 text-sm text-neutral-500">
                      Nenhuma alteração manual registrada ainda.
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CustomerEditModal({
  customer,
  onClose,
  onSave,
}: {
  customer: CustomerRecord;
  onClose: () => void;
  onSave: (customer: CustomerRecord) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CustomerRecord>(customer);

  useEffect(() => {
    setFormData(customer);
  }, [customer]);

  const updateField = <K extends keyof CustomerRecord>(field: K, value: CustomerRecord[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddress = (type: 'shippingAddress' | 'billingAddress', field: keyof Address, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    await onSave({
      ...formData,
      phone: formatPhoneByCountry(formData.phoneE164 || formData.phone, formData.phoneCountry || 'BR'),
      phoneE164: getPhoneE164(formData.phoneE164 || formData.phone, formData.phoneCountry || 'BR'),
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.16)]">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-neutral-50/60">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Cliente {customer.id}</div>
            <h3 className="mt-2 text-2xl font-serif text-neutral-900">Editar cadastro do cliente</h3>
            <p className="mt-1 text-[13px] text-neutral-500">Atualização instantânea no painel, sem recarregar a página.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(92vh-88px)] overflow-y-auto p-6 md:p-8 space-y-8">
          <Panel title="Dados pessoais" icon={<User className="w-4 h-4" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="Nome" value={formData.name} onChange={(value) => updateField('name', value)} />
              <InputField label={getCustomerDocumentLabel(formData)} value={formData.cpf} onChange={(value) => updateField('cpf', value)} />
              <InputField label="Data de nascimento" type="date" value={formData.birthDate} onChange={(value) => updateField('birthDate', value)} />
            </div>
          </Panel>

          <Panel title="Contato" icon={<Mail className="w-4 h-4" />}>
            <div className="grid gap-4 md:grid-cols-2">
              <InputField label="E-mail" type="email" value={formData.email} onChange={(value) => updateField('email', value)} />
              <div className="md:col-span-2">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Telefone</label>
                <StorePhoneField
                  locale="pt-BR"
                  name="adminCustomerPhone"
                  countryCode={formData.phoneCountry || 'BR'}
                  value={formData.phone}
                  onChange={(nextValue, nextCountry) => {
                    updateField('phoneCountry', nextCountry);
                    updateField('phone', nextValue);
                  }}
                />
              </div>
            </div>
          </Panel>

          <Panel title="Endereço de entrega">
            <AddressForm address={formData.shippingAddress} onChange={(field, value) => updateAddress('shippingAddress', field, value)} />
          </Panel>

          <Panel title="Endereço de cobrança">
            <AddressForm address={formData.billingAddress} onChange={(field, value) => updateAddress('billingAddress', field, value)} />
          </Panel>

          <Panel title="Configurações">
            <div className="grid gap-4 md:grid-cols-3">
              <SelectField
                label="Status"
                value={formData.status}
                onChange={(value) => updateField('status', value as CustomerStatus)}
                options={['Ativo', 'Inativo']}
              />
              <SelectField
                label="Bloquear compras"
                value={formData.blockPurchases ? 'Sim' : 'Não'}
                onChange={(value) => updateField('blockPurchases', value === 'Sim')}
                options={['Não', 'Sim']}
              />
              <SelectField
                label="Permitir marketing"
                value={formData.allowMarketing ? 'Sim' : 'Não'}
                onChange={(value) => updateField('allowMarketing', value === 'Sim')}
                options={['Sim', 'Não']}
              />
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
              <Edit className="w-4 h-4" />
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerOrderDetailsModal({
  customer,
  order,
  formatCurrency,
  onClose,
}: {
  customer: CustomerRecord;
  order: CustomerOrder;
  formatCurrency: (value: number) => string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.16)]">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-neutral-50/60">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Pedido {order.orderNumber}</div>
            <h3 className="mt-2 text-2xl font-serif text-neutral-900">Detalhes completos do pedido</h3>
            <p className="mt-1 text-[13px] text-neutral-500">Pedido vinculado ao cliente {customer.name}.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-6 md:p-8 space-y-8">
          <section className="grid gap-4 md:grid-cols-4">
            <InfoCard icon={<ShoppingBag className="w-4 h-4" />} label="Número do pedido" value={order.orderNumber} />
            <InfoCard icon={<Phone className="w-4 h-4" />} label="Cliente" value={customer.name} />
            <InfoCard icon={<Mail className="w-4 h-4" />} label="Pagamento" value={order.paymentMethod} />
            <InfoCard icon={<User className="w-4 h-4" />} label="Status" value={<OrderStatusBadge status={order.status} />} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Panel title="Produtos comprados">
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

              <Panel title="Endereços">
                <div className="grid gap-4 md:grid-cols-2">
                  <AddressCard title="Entrega" address={order.shippingAddress} />
                  <AddressCard title="Cobrança" address={order.billingAddress} />
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

              <Panel title="Dados gerais">
                <div className="space-y-3">
                  <SummaryLine label="Data do pedido" value={formatDateTime(order.date)} />
                  <SummaryLine label="Quantidade de itens" value={String(order.itemsCount)} />
                  <SummaryLine label="Forma de pagamento" value={order.paymentMethod} />
                </div>
              </Panel>
            </div>
          </section>
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

function QuickButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
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
      <span className={`text-sm ${strong ? 'font-bold text-neutral-900' : 'font-semibold text-neutral-800'}`}>{value}</span>
    </div>
  );
}

function AddressCard({ title, address }: { title: string; address: Address }) {
  return (
    <div className="rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{title}</div>
      <div className="mt-2 space-y-1 text-sm text-neutral-800">
        <div>{address.street}, {address.number}</div>
        <div>{address.complement || 'Sem complemento'}</div>
        <div>{address.district} - {address.city}/{address.state}</div>
        <div>CEP {address.cep}</div>
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px]"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  optionLabels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  optionLabels?: Record<string, string>;
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
          <option key={option} value={option}>
            {optionLabels?.[option] || option}
          </option>
        ))}
      </select>
    </div>
  );
}

function AddressForm({
  address,
  onChange,
}: {
  address: Address;
  onChange: (field: keyof Address, value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InputField label="CEP" value={address.cep} onChange={(value) => onChange('cep', value)} />
      <InputField label="Rua" value={address.street} onChange={(value) => onChange('street', value)} />
      <InputField label="Número" value={address.number} onChange={(value) => onChange('number', value)} />
      <InputField label="Complemento" value={address.complement || ''} onChange={(value) => onChange('complement', value)} />
      <InputField label="Bairro" value={address.district} onChange={(value) => onChange('district', value)} />
      <InputField label="Cidade" value={address.city} onChange={(value) => onChange('city', value)} />
      <InputField label="Estado" value={address.state} onChange={(value) => onChange('state', value)} />
    </div>
  );
}

function StatusBadge({ status }: { status: CustomerStatus }) {
  return <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full ${statusTone[status]}`}>{status}</span>;
}

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const tone =
    status === 'Pago'
      ? 'bg-emerald-50 text-emerald-600'
      : status === 'Aguardando Pagamento'
        ? 'bg-amber-50 text-amber-600'
        : status === 'Em Separação'
          ? 'bg-violet-50 text-violet-600'
          : status === 'Enviado'
            ? 'bg-blue-50 text-blue-600'
            : status === 'Entregue'
              ? 'bg-neutral-100 text-neutral-600'
              : 'bg-red-50 text-red-600';

  return <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full ${tone}`}>{status}</span>;
}

function formatPhone(value: string, countryCode: AddressCountryCode = 'BR') {
  return formatPhoneByCountry(value, countryCode);
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}

function formatShortDate(value: string) {
  return shortDateFormatter.format(new Date(value));
}

