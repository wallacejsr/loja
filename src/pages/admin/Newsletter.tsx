import React, { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Mail, RefreshCw, Search } from 'lucide-react';
import { getNewsletterSubscribers, NewsletterSubscriber } from '../../lib/storeApi';
import { showToast } from '../../lib/adminUtils';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function Newsletter() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadSubscribers = async () => {
    setLoading(true);
    try {
      const data = await getNewsletterSubscribers();
      setSubscribers(data);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel carregar os inscritos da newsletter.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSubscribers();
  }, []);

  const filteredSubscribers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();

    return subscribers.filter((subscriber) => {
      const matchesSearch =
        !normalized
        || subscriber.email.toLowerCase().includes(normalized)
        || subscriber.source.toLowerCase().includes(normalized)
        || subscriber.couponCode.toLowerCase().includes(normalized);

      const matchesStatus = !statusFilter || subscriber.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, subscribers]);

  const summary = useMemo(() => {
    const todayKey = new Date().toDateString();

    return {
      total: subscribers.length,
      today: subscribers.filter((subscriber) => new Date(subscriber.createdAt).toDateString() === todayKey).length,
      footer: subscribers.filter((subscriber) => subscriber.source === 'footer-newsletter').length,
      withCoupon: subscribers.filter((subscriber) => Boolean(subscriber.couponCode.trim())).length,
    };
  }, [subscribers]);

  const exportSubscribers = () => {
    if (filteredSubscribers.length === 0) {
      showToast('Nao ha leads para exportar com os filtros atuais.');
      return;
    }

    const headers = ['email', 'status', 'source', 'coupon_code', 'created_at', 'updated_at'];
    const rows = filteredSubscribers.map((subscriber) => [
      subscriber.email,
      subscriber.status,
      subscriber.source,
      subscriber.couponCode,
      subscriber.createdAt,
      subscriber.updatedAt,
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `newsletter-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
    showToast('Leads exportados com sucesso.');
  };

  const copyValue = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copiado com sucesso.`);
    } catch {
      showToast(`Nao foi possivel copiar ${label.toLowerCase()}.`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-3xl font-serif text-neutral-900 tracking-tight">Newsletter</h2>
          <p className="text-neutral-500 text-[13px]">Acompanhe os inscritos captados pelo bloco de e-mail da loja e exporte os leads para campanhas.</p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={exportSubscribers}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white hover:bg-neutral-800"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
          <button
            type="button"
            onClick={() => void loadSubscribers()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total de leads" value={String(summary.total)} />
        <SummaryCard label="Novos hoje" value={String(summary.today)} />
        <SummaryCard label="Origem footer" value={String(summary.footer)} />
        <SummaryCard label="Com cupom pronto" value={String(summary.withCoupon)} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/40 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col items-center justify-between gap-4 border-b border-neutral-100/60 p-6 sm:flex-row">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Buscar por e-mail, origem ou cupom..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-xl border border-neutral-200/60 bg-neutral-50/50 py-2.5 pl-10 pr-4 text-[13px] transition-all hover:bg-neutral-50 focus:border-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-xl border border-neutral-200/60 bg-neutral-50/50 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 transition-colors focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 sm:w-auto"
          >
            <option value="">Todos os status</option>
            <option value="Ativo">Ativo</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100/60 bg-neutral-50/50">
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Lead</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Origem</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cupom</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Cadastro</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Atualizacao</th>
                <th className="px-6 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Status</th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-neutral-500">
                    Carregando leads...
                  </td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-neutral-500">
                    Nenhum inscrito encontrado.
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="transition-colors hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-600">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-[13px] font-medium text-neutral-900">{subscriber.email}</div>
                          <div className="mt-1 text-[11px] text-neutral-400">ID: {subscriber.id.slice(0, 18)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-neutral-600">{subscriber.source}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                        {subscriber.couponCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[13px] text-neutral-600">{formatDateTime(subscriber.createdAt)}</td>
                    <td className="px-6 py-4 text-[13px] text-neutral-600">{formatDateTime(subscriber.updatedAt)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={subscriber.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void copyValue('E-mail', subscriber.email)}
                          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
                        >
                          <Copy className="h-4 w-4" />
                          E-mail
                        </button>
                        <button
                          type="button"
                          onClick={() => void copyValue('Cupom', subscriber.couponCode)}
                          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-700 hover:bg-neutral-50"
                        >
                          <Copy className="h-4 w-4" />
                          Cupom
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
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200/40 bg-white p-5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: NewsletterSubscriber['status'] }) {
  const tone = status === 'Ativo' ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${tone}`}>
      {status}
    </span>
  );
}

function formatDateTime(value: string) {
  try {
    return dateTimeFormatter.format(new Date(value));
  } catch {
    return value;
  }
}
