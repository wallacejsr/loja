import React, { useEffect, useMemo, useState } from 'react';
import { Archive, CheckCircle2, Mail, MessageSquareText, RefreshCw, Search, Send, User, X } from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import {
  type ContactMessage,
  type ContactMessageStatus,
  getContactMessages,
  updateContactMessage,
} from '../../lib/storeApiRest';

const statusTone: Record<ContactMessageStatus, string> = {
  Novo: 'bg-blue-50 text-blue-700',
  Lido: 'bg-amber-50 text-amber-700',
  Respondido: 'bg-emerald-50 text-emerald-700',
  Arquivado: 'bg-neutral-100 text-neutral-600',
};

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function Messages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await getContactMessages();
      setMessages(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível carregar as mensagens.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
  }, []);

  const filteredMessages = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    return messages.filter((message) => {
      const matchesSearch =
        !normalized ||
        message.name.toLowerCase().includes(normalized) ||
        message.email.toLowerCase().includes(normalized) ||
        message.message.toLowerCase().includes(normalized) ||
        message.orderNumber.toLowerCase().includes(normalized);

      const matchesStatus = !statusFilter || message.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [messages, searchTerm, statusFilter]);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedMessageId) ?? null,
    [messages, selectedMessageId],
  );

  const handleMessageUpdate = async (id: string, patch: Parameters<typeof updateContactMessage>[1], successMessage: string) => {
    try {
      const updated = await updateContactMessage(id, patch);
      setMessages((current) => current.map((message) => (message.id === id ? updated : message)));
      showToast(successMessage);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Não foi possível atualizar a mensagem.');
    }
  };

  const totalMessages = messages.length;
  const newMessages = messages.filter((message) => message.status === 'Novo').length;
  const answeredMessages = messages.filter((message) => message.status === 'Respondido').length;
  const linkedOrders = messages.filter((message) => Boolean(message.orderNumber)).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Mensagens</h2>
          <p className="text-neutral-500 text-[13px]">Central de mensagens enviadas pelo formulário de contato da loja.</p>
        </div>

        <button
          type="button"
          onClick={() => void loadMessages()}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total de mensagens" value={String(totalMessages)} />
        <SummaryCard label="Novas" value={String(newMessages)} />
        <SummaryCard label="Respondidas" value={String(answeredMessages)} />
        <SummaryCard label="Com pedido vinculado" value={String(linkedOrders)} />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200/40 shadow-[0_2px_10px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className="p-6 border-b border-neutral-100/60 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar por nome, e-mail, pedido ou trecho da mensagem..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-neutral-200/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 text-[13px] transition-all bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full sm:w-auto border border-neutral-200/60 bg-neutral-50/50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 rounded-xl transition-colors focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          >
            <option value="">Todos os status</option>
            <option value="Novo">Novo</option>
            <option value="Lido">Lido</option>
            <option value="Respondido">Respondido</option>
            <option value="Arquivado">Arquivado</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cliente</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Contato</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Mensagem</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Pedido</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Recebida em</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="py-3.5 px-6 text-[11px] font-semibold uppercase tracking-wider text-neutral-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-neutral-500">
                    Carregando mensagens...
                  </td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-neutral-500">
                    Nenhuma mensagem encontrada.
                  </td>
                </tr>
              ) : (
                filteredMessages.map((message) => (
                  <tr key={message.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-[13px] font-medium text-neutral-900">{message.name}</div>
                      <div className="text-[11px] text-neutral-400 mt-1">ID: {message.id.slice(0, 8)}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-[13px] text-neutral-600">{message.email}</div>
                      <div className="text-[13px] text-neutral-600 mt-1">{message.phone || 'Sem telefone'}</div>
                    </td>
                    <td className="py-4 px-6 max-w-[340px]">
                      <div className="text-[13px] text-neutral-700 line-clamp-2">{message.message}</div>
                    </td>
                    <td className="py-4 px-6 text-[13px] text-neutral-600">{message.orderNumber || '—'}</td>
                    <td className="py-4 px-6 text-[13px] text-neutral-600">{formatDateTime(message.createdAt)}</td>
                    <td className="py-4 px-6">
                      <StatusBadge status={message.status} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedMessageId(message.id)}
                          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
                        >
                          <MessageSquareText className="w-4 h-4" />
                          Visualizar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMessage && (
        <MessageDetailsModal
          message={selectedMessage}
          onClose={() => setSelectedMessageId(null)}
          onUpdate={async (patch, successMessage) => {
            await handleMessageUpdate(selectedMessage.id, patch, successMessage);
          }}
        />
      )}
    </div>
  );
}

function MessageDetailsModal({
  message,
  onClose,
  onUpdate,
}: {
  message: ContactMessage;
  onClose: () => void;
  onUpdate: (patch: { status?: ContactMessageStatus; adminNotes?: string; repliedAt?: string }, successMessage: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(message.adminNotes);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNotes(message.adminNotes);
  }, [message]);

  const saveNotes = async () => {
    setSaving(true);
    await onUpdate({ adminNotes: notes }, 'Anotações salvas com sucesso.');
    setSaving(false);
  };

  const updateStatus = async (status: ContactMessageStatus) => {
    setSaving(true);
    await onUpdate(
      {
        status,
        repliedAt: status === 'Respondido' ? new Date().toISOString() : message.repliedAt,
      },
      `Mensagem marcada como ${status.toLowerCase()}.`,
    );
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.16)]">
        <div className="px-6 py-5 border-b border-neutral-100 flex items-start justify-between gap-4 bg-neutral-50/60">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">Mensagem recebida</div>
            <h3 className="mt-2 text-2xl font-serif text-neutral-900">{message.name}</h3>
            <p className="mt-1 text-[13px] text-neutral-500">Detalhes completos do contato enviado pelo formulário da loja.</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl text-neutral-400 hover:text-neutral-900 hover:bg-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="max-h-[calc(92vh-88px)] overflow-y-auto p-6 md:p-8 space-y-8">
          <section className="grid gap-4 md:grid-cols-4">
            <InfoCard icon={<User className="w-4 h-4" />} label="Cliente" value={message.name} />
            <InfoCard icon={<Mail className="w-4 h-4" />} label="E-mail" value={message.email} />
            <InfoCard icon={<Send className="w-4 h-4" />} label="Status" value={<StatusBadge status={message.status} />} />
            <InfoCard icon={<MessageSquareText className="w-4 h-4" />} label="Pedido" value={message.orderNumber || 'Sem vínculo'} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <Panel title="Dados do contato" icon={<User className="w-4 h-4" />}>
                <div className="grid gap-4 md:grid-cols-2">
                  <DetailField label="Nome" value={message.name} />
                  <DetailField label="E-mail" value={message.email} />
                  <DetailField label="Telefone" value={message.phone || 'Não informado'} />
                  <DetailField label="Pedido" value={message.orderNumber || 'Não informado'} />
                  <DetailField label="Recebida em" value={formatDateTime(message.createdAt)} />
                  <DetailField label="Última atualização" value={formatDateTime(message.updatedAt)} />
                </div>
              </Panel>

              <Panel title="Mensagem" icon={<MessageSquareText className="w-4 h-4" />}>
                <div className="rounded-2xl border border-neutral-100 bg-neutral-50/70 px-4 py-4 text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap">
                  {message.message}
                </div>
              </Panel>

              <Panel title="Anotações internas">
                <div className="space-y-4">
                  <textarea
                    rows={5}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="w-full border border-neutral-200/60 px-4 py-3 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900 transition-all rounded-xl text-[13px] resize-none"
                    placeholder="Anotações da equipe sobre o atendimento..."
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void saveNotes()}
                      disabled={saving}
                      className="bg-neutral-950 text-white px-6 py-3 font-semibold uppercase tracking-wider text-[11px] rounded-xl hover:bg-neutral-800 transition-all disabled:opacity-60"
                    >
                      Salvar anotações
                    </button>
                  </div>
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Ações rápidas">
                <div className="space-y-3">
                  <QuickButton icon={<Mail className="w-4 h-4 text-blue-600" />} label="Responder por e-mail" onClick={() => {
                    window.location.href = `mailto:${message.email}?subject=${encodeURIComponent('Retorno do atendimento - Loja')}`;
                  }} />
                  <QuickButton icon={<CheckCircle2 className="w-4 h-4 text-amber-600" />} label="Marcar como lido" onClick={() => void updateStatus('Lido')} />
                  <QuickButton icon={<Send className="w-4 h-4 text-emerald-600" />} label="Marcar como respondido" onClick={() => void updateStatus('Respondido')} />
                  <QuickButton icon={<Archive className="w-4 h-4 text-neutral-600" />} label="Arquivar mensagem" onClick={() => void updateStatus('Arquivado')} />
                </div>
              </Panel>

              <Panel title="Resumo">
                <div className="space-y-3">
                  <SummaryLine label="Origem" value={message.source} />
                  <SummaryLine label="Respondida em" value={message.repliedAt ? formatDateTime(message.repliedAt) : 'Ainda não respondida'} />
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
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-neutral-50/70 px-4 py-3">
      <span className="text-sm text-neutral-600">{label}</span>
      <span className="text-sm font-semibold text-neutral-800 text-right">{value}</span>
    </div>
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
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-neutral-200 px-4 py-3 text-[12px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
    >
      {icon}
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: ContactMessageStatus }) {
  return <span className={`inline-flex px-2.5 py-1 text-[11px] font-semibold rounded-full ${statusTone[status]}`}>{status}</span>;
}

function formatDateTime(value: string) {
  return dateTimeFormatter.format(new Date(value));
}
