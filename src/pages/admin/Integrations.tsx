import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  CreditCard,
  Globe,
  Link2,
  LockKeyhole,
  PlugZap,
  RadioTower,
  RefreshCw,
  Save,
  ShieldCheck,
  Sparkles,
  Truck,
  Webhook,
  XCircle,
} from 'lucide-react';
import { showToast } from '../../lib/adminUtils';
import {
  getStripeStatus,
  saveStripeCredentials,
  testStripeConnection,
  type StripeConnectionTestResponse,
  type StripeModeCredentialState,
  type StripeStatusResponse,
} from '../../lib/stripeAdminApi';
import { getIntegrationsApiBaseUrl } from '../../lib/storeBackend';
import { useSettings, type StoreSettings } from '../../hooks/useSettings';
import type { StoreCurrencyCode, StripeMode } from '../../types/settings';

type IntegrationTabId = 'marketing' | 'payments' | 'shipping' | 'webhooks';

type IntegrationTab = {
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  id: IntegrationTabId;
  label: string;
};

type StripeSettingsDraft = Pick<
  StoreSettings,
  | 'stripeAllowApplePay'
  | 'stripeAllowCard'
  | 'stripeAllowGooglePay'
  | 'stripeCancelUrl'
  | 'stripeCurrency'
  | 'stripeEnabled'
  | 'stripeMode'
  | 'stripeSuccessUrl'
>;

type StripeCredentialDraft = {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
};

const tabs: IntegrationTab[] = [
  {
    id: 'payments',
    label: 'Pagamentos',
    description: 'Gateways, status tecnico e comportamento do checkout.',
    icon: CreditCard,
  },
  {
    id: 'shipping',
    label: 'Frete',
    description: 'Carriers, cotacoes e regras logisticas.',
    icon: Truck,
  },
  {
    id: 'marketing',
    label: 'Marketing',
    description: 'Pixels, analytics e automacoes.',
    icon: Globe,
  },
  {
    id: 'webhooks',
    label: 'Webhooks',
    description: 'Eventos, callbacks e monitoramento.',
    icon: Webhook,
  },
];

const currencyOptions: Array<{ label: string; value: StoreCurrencyCode }> = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'BRL', label: 'BRL - Real brasileiro' },
];

function extractStripeSettings(settings: StoreSettings): StripeSettingsDraft {
  return {
    stripeEnabled: settings.stripeEnabled,
    stripeMode: settings.stripeMode,
    stripeCurrency: settings.stripeCurrency,
    stripeAllowCard: settings.stripeAllowCard,
    stripeAllowApplePay: settings.stripeAllowApplePay,
    stripeAllowGooglePay: settings.stripeAllowGooglePay,
    stripeSuccessUrl: settings.stripeSuccessUrl,
    stripeCancelUrl: settings.stripeCancelUrl,
  };
}

function createEmptyCredentialDraft(): StripeCredentialDraft {
  return {
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
  };
}

function buildIntegrationsApiUrl(path: string) {
  return new URL(`${getIntegrationsApiBaseUrl()}${path}`, window.location.origin).toString();
}

function formatCredentialTimestamp(value: string | null) {
  if (!value) {
    return 'Ainda nao salvo';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Atualizado recentemente';
  }

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function getModeLabel(mode: StripeMode) {
  return mode === 'live' ? 'Producao' : 'Teste';
}

const inputClass =
  'w-full rounded-xl border border-neutral-200/70 bg-white px-4 py-3 text-[13px] text-neutral-900 outline-none transition-all focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900';

const helperTextClass = 'mt-2 text-[11px] leading-relaxed text-neutral-400';

export function Integrations() {
  const { settings, updateSettings } = useSettings();
  const [activeTab, setActiveTab] = useState<IntegrationTabId>('payments');
  const activeTabConfig = useMemo(
    () => tabs.find((tab) => tab.id === activeTab) || tabs[0],
    [activeTab],
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
          <Sparkles className="h-3.5 w-3.5" />
          Nova area administrativa
        </div>
        <div className="space-y-1.5">
          <h2 className="text-3xl font-serif tracking-tight text-neutral-900">Integracoes</h2>
          <p className="max-w-3xl text-[13px] leading-relaxed text-neutral-500">
            Centralize pagamentos, frete, marketing e eventos em uma unica area do painel.
            Nesta etapa, a Stripe ja pode ser configurada visualmente e acompanhar o status tecnico.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Gateway atual"
          value={settings.stripeEnabled ? 'Stripe ativa' : 'Stripe inativa'}
          description="Controle a disponibilidade do gateway sem expor segredos no front."
          icon={CreditCard}
        />
        <SummaryCard
          title="Modo"
          value={settings.stripeMode === 'live' ? 'Producao' : 'Teste'}
          description="Ambiente usado para as proximas etapas de checkout e webhook."
          icon={RadioTower}
        />
        <SummaryCard
          title="Escopo desta etapa"
          value="Credenciais"
          description="Storage privado, diagnostico tecnico e teste real contra a API da Stripe."
          icon={BadgeCheck}
        />
        <SummaryCard
          title="Proxima meta"
          value="Webhook"
          description="Receber eventos oficiais da Stripe para conciliar pagamento, falha e estorno."
          icon={PlugZap}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/50 bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="border-b border-neutral-100/80 px-6 py-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-lg font-serif font-bold text-neutral-900">Modulos de integracao</h3>
            <p className="text-[12px] text-neutral-500">
              Separe o que e operacao do dia a dia do que e infraestrutura sensivel.
            </p>
          </div>
        </div>

        <div className="border-b border-neutral-100/80 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const isActive = tab.id === activeTab;
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-[12px] font-semibold transition-all ${
                    isActive
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-[0_8px_24px_rgba(17,24,39,0.14)]'
                      : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-6">
          {activeTab === 'payments' ? (
            <PaymentsTab
              settings={settings}
              onSave={(draft) => {
                updateSettings(draft);
              }}
            />
          ) : activeTab === 'webhooks' ? (
            <WebhooksTab settings={settings} />
          ) : (
            <PlaceholderTab tab={activeTabConfig} />
          )}
        </div>
      </div>
    </div>
  );
}

function WebhooksTab({ settings }: { settings: StoreSettings }) {
  const webhookUrl = useMemo(() => {
    return buildIntegrationsApiUrl('/stripe/webhook');
  }, []);

  const stripeEvents = [
    'checkout.session.completed',
    'checkout.session.async_payment_succeeded',
    'checkout.session.async_payment_failed',
    'checkout.session.expired',
  ];

  const copyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copiado.`);
    } catch {
      showToast(`Nao foi possivel copiar ${label.toLowerCase()}.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <section className="rounded-2xl border border-neutral-200/50 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                <Webhook className="h-3.5 w-3.5" />
                Stripe webhook
              </span>
              <h3 className="text-2xl font-serif font-bold text-neutral-900">Endpoint pronto para colar na Stripe</h3>
              <p className="max-w-2xl text-[13px] leading-relaxed text-neutral-500">
                Este endpoint valida a assinatura oficial da Stripe, registra os eventos recebidos e atualiza a trilha server-side do checkout.
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] font-semibold text-amber-700">
              Modo atual: {getModeLabel(settings.stripeMode)}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-neutral-200/60 bg-neutral-50/70 p-4">
            <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
              URL do webhook
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <div className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[13px] font-medium text-neutral-900 break-all">
                {webhookUrl}
              </div>
              <button
                type="button"
                onClick={() => void copyValue(webhookUrl, 'URL do webhook')}
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[12px] font-semibold text-neutral-700 transition-all hover:border-neutral-300 hover:text-neutral-900"
              >
                <Link2 className="h-4 w-4" />
                Copiar URL
              </button>
            </div>
            <p className={helperTextClass}>
              No painel da Stripe, crie um endpoint novo apontando para essa URL e depois copie o valor `whsec_...` gerado para a aba Pagamentos.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200/50 bg-neutral-950 p-6 text-white shadow-[0_12px_34px_rgba(15,23,42,0.18)]">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
              <ShieldCheck className="h-3.5 w-3.5" />
              Fluxo recomendado
            </span>
            <h3 className="text-xl font-serif font-bold">Segredo do endpoint separado da secret key</h3>
          </div>

          <div className="mt-5 space-y-3 text-[13px] leading-relaxed text-white/75">
            <p>
              A Stripe vai gerar um `whsec_...` exclusivo para este endpoint. Ele nao e a mesma coisa que a sua secret key `sk_...`.
            </p>
            <p>
              Salve o segredo de teste quando estiver em homologacao e o segredo de producao quando trocar o modo para live.
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <section className="rounded-2xl border border-neutral-200/50 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="space-y-2">
            <h4 className="text-lg font-serif font-bold text-neutral-900">Eventos para assinar</h4>
            <p className="text-[12px] leading-relaxed text-neutral-500">
              Estes sao os eventos que ja tratamos operacionalmente nesta etapa.
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {stripeEvents.map((eventName) => (
              <div
                key={eventName}
                className="flex flex-col gap-2 rounded-2xl border border-neutral-200/60 bg-neutral-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="text-[13px] font-semibold text-neutral-900">{eventName}</p>
                  <p className="text-[11px] leading-relaxed text-neutral-500">
                    {eventName === 'checkout.session.completed' && 'Confirma o fechamento inicial da sessao de checkout.'}
                    {eventName === 'checkout.session.async_payment_succeeded' && 'Marca pagamentos assincronos aprovados depois do retorno do cliente.'}
                    {eventName === 'checkout.session.async_payment_failed' && 'Registra falhas de pagamento assincrono para conciliacao.'}
                    {eventName === 'checkout.session.expired' && 'Encerra sessoes expiradas sem depender do navegador do cliente.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void copyValue(eventName, 'Nome do evento')}
                  className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[11px] font-semibold text-neutral-700 transition-all hover:border-neutral-300 hover:text-neutral-900"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  Copiar
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200/50 bg-neutral-50/80 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="space-y-2">
            <h4 className="text-lg font-serif font-bold text-neutral-900">Checklist rapido</h4>
            <p className="text-[12px] leading-relaxed text-neutral-500">
              O caminho mais limpo para fechar a configuracao sem ruído.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            {[
              'Criar o endpoint na dashboard da Stripe usando a URL acima.',
              'Selecionar os quatro eventos de checkout listados nesta aba.',
              'Copiar o signing secret gerado pela Stripe.',
              'Voltar na aba Pagamentos e salvar esse valor no campo Webhook secret do modo correspondente.',
              'Usar "Send test webhook" na Stripe para validar o retorno 200.',
            ].map((item, index) => (
              <div key={item} className="flex items-start gap-3 rounded-2xl border border-neutral-200/60 bg-white px-4 py-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-[11px] font-semibold text-white">
                  {index + 1}
                </div>
                <p className="pt-1 text-[12px] leading-relaxed text-neutral-600">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function PaymentsTab({
  settings,
  onSave,
}: {
  onSave: (draft: StripeSettingsDraft) => void;
  settings: StoreSettings;
}) {
  const [draft, setDraft] = useState<StripeSettingsDraft>(() => extractStripeSettings(settings));
  const [credentialDrafts, setCredentialDrafts] = useState<Record<StripeMode, StripeCredentialDraft>>({
    test: createEmptyCredentialDraft(),
    live: createEmptyCredentialDraft(),
  });
  const [credentialSaving, setCredentialSaving] = useState(false);
  const [connectionTesting, setConnectionTesting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<StripeConnectionTestResponse | null>(null);
  const [connectionError, setConnectionError] = useState('');
  const [stripeStatus, setStripeStatus] = useState<StripeStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');

  useEffect(() => {
    setDraft(extractStripeSettings(settings));
  }, [settings]);

  const loadStripeStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError('');

    try {
      setStripeStatus(await getStripeStatus());
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar o status tecnico da Stripe.';
      setStatusError(message);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStripeStatus();
  }, [loadStripeStatus]);

  useEffect(() => {
    setConnectionError('');
  }, [draft.stripeMode]);

  const currentModeState = useMemo<StripeModeCredentialState | null>(
    () => stripeStatus?.modes[draft.stripeMode] || null,
    [draft.stripeMode, stripeStatus],
  );
  const currentCredentialDraft = credentialDrafts[draft.stripeMode];
  const hasChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(extractStripeSettings(settings)),
    [draft, settings],
  );
  const hasCredentialChanges = useMemo(
    () => Boolean(
      currentCredentialDraft.publishableKey.trim()
      || currentCredentialDraft.secretKey.trim()
      || currentCredentialDraft.webhookSecret.trim(),
    ),
    [currentCredentialDraft],
  );

  const statusTone = currentModeState?.effective.ready
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-amber-200 bg-amber-50 text-amber-700';

  const updateDraft = <Key extends keyof StripeSettingsDraft>(
    key: Key,
    value: StripeSettingsDraft[Key],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(draft);
    showToast('Configuracoes da Stripe salvas.');
  };

  const updateCredentialDraft = <Key extends keyof StripeCredentialDraft>(
    key: Key,
    value: StripeCredentialDraft[Key],
  ) => {
    setCredentialDrafts((prev) => ({
      ...prev,
      [draft.stripeMode]: {
        ...prev[draft.stripeMode],
        [key]: value,
      },
    }));
  };

  const clearCredentialDraft = (mode: StripeMode) => {
    setCredentialDrafts((prev) => ({
      ...prev,
      [mode]: createEmptyCredentialDraft(),
    }));
  };

  const handleSaveCredentials = async () => {
    if (!hasCredentialChanges) {
      showToast('Preencha pelo menos uma chave da Stripe para salvar.');
      return;
    }

    setCredentialSaving(true);

    try {
      const response = await saveStripeCredentials({
        mode: draft.stripeMode,
        publishableKey: currentCredentialDraft.publishableKey,
        secretKey: currentCredentialDraft.secretKey,
        webhookSecret: currentCredentialDraft.webhookSecret,
      });

      setStripeStatus(response.status);
      clearCredentialDraft(draft.stripeMode);
      showToast(response.message);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel salvar as chaves da Stripe.');
    } finally {
      setCredentialSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setConnectionTesting(true);
    setConnectionError('');

    try {
      const response = await testStripeConnection(draft.stripeMode);
      setConnectionResult(response);
      showToast(`Conexao Stripe validada no modo ${draft.stripeMode === 'live' ? 'live' : 'test'}.`);
      await loadStripeStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel testar a conexao com a Stripe.';
      setConnectionError(message);
      showToast(message);
    } finally {
      setConnectionTesting(false);
    }
  };

  const backendLabel = stripeStatus?.backend === 'supabase' ? 'Supabase privado' : 'Repositorio privado';
  const storageAlert = statusError || stripeStatus?.storageError || '';
  const currentConnectionResult = connectionResult?.mode === draft.stripeMode ? connectionResult : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200/50 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
                  <CreditCard className="h-3.5 w-3.5" />
                  Pagamentos internacionais
                </div>
                <div className="space-y-2">
                  <h4 className="text-3xl font-serif font-bold tracking-tight text-neutral-900">Stripe Checkout</h4>
                  <p className="max-w-3xl text-[13px] leading-relaxed text-neutral-500">
                    Configure o gateway, o modo operacional e os retornos do checkout em uma sequencia mais limpa.
                    Agora as chaves da Stripe podem ficar salvas em storage privado, sem cair em armazenamento do navegador nem no codigo do front.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 xl:min-w-[260px]">
                <div className={`rounded-2xl border px-4 py-4 shadow-sm ${statusTone}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                    Status do modo {draft.stripeMode === 'live' ? 'live' : 'test'}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[12px] font-semibold">
                    <RadioTower className="h-3.5 w-3.5" />
                    {currentModeState?.effective.ready ? 'Credenciais completas' : 'Credenciais pendentes'}
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200/60 bg-neutral-50/70 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                    Fonte ativa
                  </p>
                  <p className="mt-2 text-[12px] leading-relaxed text-neutral-600">
                    {currentModeState?.effective.source === 'database'
                      ? 'O checkout vai priorizar as chaves privadas salvas no banco.'
                      : currentModeState?.effective.source === 'environment'
                        ? 'Ainda existe fallback por env vars enquanto o banco nao estiver completo.'
                        : 'Nenhuma credencial valida foi encontrada ainda para este modo.'}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <SectionPanel
            eyebrow="Configuracao basica"
            title="Controles principais do checkout"
            description="Ative o gateway, escolha o ambiente e defina a moeda enviada para a Stripe."
          >
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)_minmax(240px,0.85fr)]">
              <ToggleCard
                title="Ativar Stripe"
                description="Quando desativado, a loja continua operando sem este gateway mesmo que as chaves ja estejam prontas."
                checked={draft.stripeEnabled}
                onToggle={() => updateDraft('stripeEnabled', !draft.stripeEnabled)}
              />

              <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Modo operacional</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(['test', 'live'] as StripeMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => updateDraft('stripeMode', mode)}
                      className={`min-h-[128px] rounded-xl border px-4 py-4 text-left text-[12px] font-semibold transition-all ${
                        draft.stripeMode === mode
                          ? 'border-neutral-900 bg-neutral-900 text-white shadow-[0_8px_20px_rgba(17,24,39,0.12)]'
                          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-900'
                      }`}
                    >
                      <span className="block uppercase tracking-[0.16em]">{mode === 'live' ? 'Live' : 'Test'}</span>
                      <span className={`mt-2 block text-[11px] leading-relaxed ${draft.stripeMode === mode ? 'text-white/70' : 'text-neutral-400'}`}>
                        {mode === 'live' ? 'Produz cobrancas reais no ambiente oficial.' : 'Usa ambiente de homologacao para validar o fluxo.'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Moeda do checkout
                </label>
                <select
                  value={draft.stripeCurrency}
                  onChange={(event) => updateDraft('stripeCurrency', event.target.value as StoreCurrencyCode)}
                  className={`${inputClass} mt-3`}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label}
                    </option>
                  ))}
                </select>
                <p className={helperTextClass}>
                  Esta moeda acompanha a criacao da session e define como os valores chegam ao checkout hospedado.
                </p>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            eyebrow="Credenciais privadas"
            title="Chaves da Stripe salvas no banco"
            description="Os valores completos so trafegam para o backend no momento do salvamento. Depois disso, o painel trabalha apenas com mascaras e status."
          >
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <CredentialSummaryCard
                  title="Publishable key"
                  status={currentModeState?.stored.publishableKeyConfigured ? 'Configurada' : 'Pendente'}
                  tone={currentModeState?.stored.publishableKeyConfigured ? 'success' : 'warning'}
                  helper={currentModeState?.stored.publishableKeyMasked || 'Ainda nao salva'}
                />
                <CredentialSummaryCard
                  title="Secret key"
                  status={currentModeState?.stored.secretKeyConfigured ? 'Configurada' : 'Pendente'}
                  tone={currentModeState?.stored.secretKeyConfigured ? 'success' : 'warning'}
                  helper={currentModeState?.stored.secretKeyMasked || 'Ainda nao salva'}
                />
                <CredentialSummaryCard
                  title="Webhook secret"
                  status={currentModeState?.stored.webhookSecretConfigured ? 'Configurado' : 'Pendente'}
                  tone={currentModeState?.stored.webhookSecretConfigured ? 'success' : 'warning'}
                  helper={currentModeState?.stored.webhookSecretMasked || 'Ainda nao salvo'}
                />
                <CredentialSummaryCard
                  title="Ambiente"
                  status={getModeLabel(draft.stripeMode)}
                  tone="neutral"
                  helper={`Atualizado: ${formatCredentialTimestamp(currentModeState?.stored.updatedAt || null)}`}
                />
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
                <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <CredentialField
                      label="Publishable key"
                      value={currentCredentialDraft.publishableKey}
                      placeholder={currentModeState?.stored.publishableKeyMasked || 'pk_test_...'}
                      onChange={(value) => updateCredentialDraft('publishableKey', value)}
                      helper="Pode ser trocada a qualquer momento. Se deixar vazio, mantemos a ultima chave salva."
                    />
                    <CredentialField
                      label="Secret key"
                      value={currentCredentialDraft.secretKey}
                      placeholder={currentModeState?.stored.secretKeyMasked || 'sk_test_...'}
                      onChange={(value) => updateCredentialDraft('secretKey', value)}
                      helper="Esta chave nunca volta completa para a interface apos o salvamento."
                    />
                  </div>

                  <div className="mt-4">
                    <CredentialField
                      label="Webhook secret"
                      value={currentCredentialDraft.webhookSecret}
                      placeholder={currentModeState?.stored.webhookSecretMasked || 'whsec_...'}
                      onChange={(value) => updateCredentialDraft('webhookSecret', value)}
                      helper="Usaremos esta chave nas proximas etapas de webhook e confirmacao de eventos."
                    />
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-[12px] font-semibold text-neutral-900">Modo selecionado: {getModeLabel(draft.stripeMode)}</p>
                      <p className="text-[11px] leading-relaxed text-neutral-500">
                        Voce pode manter um conjunto de chaves para teste e outro para producao no mesmo painel.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => clearCredentialDraft(draft.stripeMode)}
                        className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-neutral-200 bg-white px-4 py-2 text-[12px] font-semibold text-neutral-600 transition-all hover:border-neutral-300 hover:text-neutral-900"
                      >
                        Limpar rascunho
                      </button>
                      <button
                        type="button"
                        onClick={handleTestConnection}
                        disabled={connectionTesting}
                        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2 text-[12px] font-semibold transition-all ${
                          connectionTesting
                            ? 'cursor-wait border-neutral-200 bg-neutral-100 text-neutral-500'
                            : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:text-neutral-900'
                        }`}
                      >
                        <BadgeCheck className="h-4 w-4" />
                        {connectionTesting ? 'Testando...' : 'Testar conexao'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCredentials}
                        disabled={!hasCredentialChanges || credentialSaving}
                        className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] transition-all ${
                          hasCredentialChanges && !credentialSaving
                            ? 'bg-neutral-950 text-white shadow-[0_10px_24px_rgba(17,24,39,0.14)] hover:bg-neutral-800'
                            : 'cursor-not-allowed bg-neutral-200 text-neutral-500'
                        }`}
                      >
                        <Save className="h-4 w-4" />
                        {credentialSaving ? 'Salvando...' : 'Salvar chaves'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-2xl border border-neutral-200/60 bg-neutral-50/70 p-5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Teste real da conexao</p>

                    {currentConnectionResult ? (
                      <div className="mt-4 space-y-4">
                        <div
                          className={`rounded-2xl border px-4 py-4 text-[12px] leading-relaxed ${
                            currentConnectionResult.modeMatchesSelection
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                              : 'border-amber-200 bg-amber-50 text-amber-800'
                          }`}
                        >
                          <p className="font-semibold">
                            {currentConnectionResult.modeMatchesSelection
                              ? 'Conta Stripe respondeu corretamente para este ambiente.'
                              : 'A chave respondeu, mas o ambiente retornado nao bate com o modo selecionado.'}
                          </p>
                          <p className="mt-1">
                            Fonte da secret key: <span className="font-semibold uppercase">{currentConnectionResult.secretSource}</span>
                          </p>
                        </div>

                        <div className="grid gap-3">
                          <ConnectionDetail label="Conta" value={currentConnectionResult.businessName} />
                          <ConnectionDetail label="Account ID" value={currentConnectionResult.accountId} mono />
                          <ConnectionDetail label="Pais / moeda" value={`${currentConnectionResult.country || '--'} / ${currentConnectionResult.currency || '--'}`} />
                          <ConnectionDetail label="Modo retornado" value={currentConnectionResult.livemode ? 'Live' : 'Test'} />
                          <ConnectionDetail label="Cobrancas" value={currentConnectionResult.chargesEnabled ? 'Habilitadas' : 'Ainda desabilitadas'} />
                          <ConnectionDetail label="Cadastro Stripe" value={currentConnectionResult.detailsSubmitted ? 'Dados enviados' : 'Configuracao pendente'} />
                        </div>

                        <p className="text-[11px] leading-relaxed text-neutral-500">
                          Ultimo teste em {formatCredentialTimestamp(currentConnectionResult.timestamp)}.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3 text-[12px] leading-relaxed text-neutral-600">
                        <p>
                          O teste consulta a API real da Stripe com a <span className="font-semibold text-neutral-900">secret key efetiva</span> deste modo.
                        </p>
                        <p>
                          Assim a gente valida se a conta responde, se o ambiente bate com o selecionado e se a conta ja esta pronta para cobrar.
                        </p>
                      </div>
                    )}

                    {connectionError && (
                      <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] leading-relaxed text-rose-700">
                        {connectionError}
                      </div>
                    )}

                    {!currentConnectionResult && !connectionError && (
                      <div className="mt-4 rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 text-[11px] leading-relaxed text-neutral-500">
                        Dica: salve ao menos a <span className="font-semibold text-neutral-900">secret key</span> do modo atual e depois rode o teste.
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-neutral-200/60 bg-neutral-50/70 p-5 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Como isso funciona</p>
                    <div className="mt-4 space-y-3 text-[12px] leading-relaxed text-neutral-600">
                      <p>
                        As credenciais ficam fora de <span className="font-semibold text-neutral-900">store_settings</span>, fora do armazenamento do navegador e fora do bundle da loja.
                      </p>
                      <p>
                        O painel recebe somente status, ambiente ativo e valores mascarados para confirmar qual chave ja foi cadastrada.
                      </p>
                      <p>
                        O teste real usa a chave privada efetiva deste modo e ajuda a detectar cedo chave errada, modo invertido ou conta ainda nao habilitada.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            eyebrow="Fluxo de retorno"
            title="URLs de navegacao do pagamento"
            description="Separe claramente para onde o cliente vai quando conclui ou cancela o checkout."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Success URL
                </label>
                <div className="relative mt-3">
                  <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={draft.stripeSuccessUrl}
                    onChange={(event) => updateDraft('stripeSuccessUrl', event.target.value)}
                    placeholder="/checkout/success?session_id={CHECKOUT_SESSION_ID}"
                    className={`${inputClass} pl-11`}
                  />
                </div>
                <p className={helperTextClass}>
                  Pode ser URL completa ou rota relativa. O checkout resolve isso contra o dominio oficial da loja.
                </p>
              </div>

              <div className="rounded-2xl border border-neutral-200/60 bg-white p-5 shadow-sm">
                <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
                  Cancel URL
                </label>
                <div className="relative mt-3">
                  <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="text"
                    value={draft.stripeCancelUrl}
                    onChange={(event) => updateDraft('stripeCancelUrl', event.target.value)}
                    placeholder="/cart"
                    className={`${inputClass} pl-11`}
                  />
                </div>
                <p className={helperTextClass}>
                  Ideal para devolver o cliente ao carrinho com contexto caso ele desista antes da confirmacao.
                </p>
              </div>
            </div>
          </SectionPanel>

          <SectionPanel
            eyebrow="Experiencia do cliente"
            title="Metodos liberados no checkout"
            description="Defina o que a loja pretende exibir assim que a session Stripe estiver em producao."
          >
            <div className="grid gap-4 md:grid-cols-3">
              <MethodCard
                title="Cartao"
                description="Metodo base do Stripe Checkout e o minimo recomendado para seguir."
                checked={draft.stripeAllowCard}
                onToggle={() => updateDraft('stripeAllowCard', !draft.stripeAllowCard)}
              />
              <MethodCard
                title="Apple Pay"
                description="Depende de dominio validado e elegibilidade do dispositivo do cliente."
                checked={draft.stripeAllowApplePay}
                onToggle={() => updateDraft('stripeAllowApplePay', !draft.stripeAllowApplePay)}
              />
              <MethodCard
                title="Google Pay"
                description="Tambem depende do ambiente Stripe, navegador e disponibilidade por dispositivo."
                checked={draft.stripeAllowGooglePay}
                onToggle={() => updateDraft('stripeAllowGooglePay', !draft.stripeAllowGooglePay)}
              />
            </div>
          </SectionPanel>

          <section className="rounded-2xl border border-neutral-200/50 bg-neutral-50/80 p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-[0_8px_18px_rgba(17,24,39,0.12)]">
                <PlugZap className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <p className="text-[13px] font-semibold text-neutral-900">Leitura operacional da etapa</p>
                <p className="text-[12px] leading-relaxed text-neutral-500">
                  O painel agora salva gateway, modo, moeda, metodos visuais e credenciais privadas, alem de validar a conta real da Stripe.
                  O proximo passo natural passa a ser o webhook para confirmar eventos de pagamento sem depender do retorno do navegador.
                </p>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 self-start">
          <section className="rounded-2xl border border-neutral-200/50 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <h4 className="text-xl font-serif font-bold text-neutral-900">Status tecnico</h4>
                <p className="text-[12px] leading-relaxed text-neutral-500">
                  Esta leitura nao expoe segredos. Ela mostra o que esta salvo no storage privado, o que ainda depende de env var e qual fonte o checkout vai usar agora.
                </p>
              </div>

              <button
                type="button"
                onClick={loadStripeStatus}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-[12px] font-semibold text-neutral-700 transition-all hover:border-neutral-300 hover:text-neutral-900"
              >
                <RefreshCw className={`h-4 w-4 ${statusLoading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <StatusRow
                label="Publishable key"
                value={currentModeState?.stored.publishableKeyMasked || 'Aguardando configuracao'}
                active={Boolean(currentModeState?.effective.publishableKey)}
              />
              <StatusRow
                label="Secret key"
                value={currentModeState?.stored.secretKeyMasked || 'Aguardando configuracao'}
                active={Boolean(currentModeState?.effective.secretKey)}
              />
              <StatusRow
                label="Webhook secret"
                value={currentModeState?.stored.webhookSecretMasked || 'Aguardando configuracao'}
                active={Boolean(currentModeState?.effective.webhookSecret)}
              />
            </div>

            {currentModeState?.effective.source === 'environment' && (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-[12px] leading-relaxed text-sky-700">
                O checkout ainda esta usando fallback por variaveis de ambiente neste modo.
                Assim que o trio completo for salvo no banco, a prioridade passa a ser o storage privado.
              </div>
            )}

            {storageAlert && (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[12px] leading-relaxed text-rose-700">
                {storageAlert}
              </div>
            )}

            {!storageAlert && (
              <div className="mt-4 rounded-2xl border border-neutral-200/60 bg-neutral-50/70 px-4 py-3">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neutral-700" />
                  <div className="space-y-1 text-[12px] leading-relaxed text-neutral-500">
                    <p>
                      Backend atual: <span className="font-semibold text-neutral-800">{backendLabel}</span>.
                      Fonte efetiva deste modo: <span className="font-semibold text-neutral-800">{currentModeState?.effective.source || 'missing'}</span>.
                    </p>
                    <p>
                      Chave mestra de criptografia: <span className="font-semibold text-neutral-800">{stripeStatus?.encryptionReady ? 'configurada' : 'pendente'}</span>.
                      Sem ela, o painel nao consegue persistir as novas credenciais privadas no banco.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200/50 bg-neutral-950 p-6 text-white shadow-[0_12px_34px_rgba(15,23,42,0.18)]">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                <LockKeyhole className="h-3.5 w-3.5" />
                Diretriz tecnica
              </span>
              <h4 className="text-xl font-serif font-bold">Segredos fora do painel</h4>
            </div>

            <div className="mt-5 space-y-4 text-[13px] leading-relaxed text-white/75">
              <p>
                Agora o painel separa claramente configuracao operacional e credenciais privadas. O frontend nunca recebe o valor inteiro depois do salvamento.
              </p>
              <p>
                Isso deixa a administracao mais segura hoje e reduz retrabalho quando a loja rodar em Vercel, VPS com MariaDB ou outro backend proprio.
              </p>
            </div>
          </section>
        </aside>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200/50 bg-neutral-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[13px] font-semibold text-neutral-900">Configuracao publica e storage privado agora estao separados</p>
          <p className="text-[12px] leading-relaxed text-neutral-500">
            O gateway continua com toggles e URLs no painel, enquanto as chaves passam a morar em um storage seguro com leitura mascarada.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!hasChanges}
          className={`inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] transition-all ${
            hasChanges
              ? 'bg-neutral-950 text-white shadow-[0_10px_24px_rgba(17,24,39,0.14)] hover:bg-neutral-800'
              : 'cursor-not-allowed bg-neutral-200 text-neutral-500'
          }`}
        >
          <Save className="h-4 w-4" />
          Salvar configuracao
        </button>
      </div>
    </div>
  );
}

function CredentialSummaryCard({
  title,
  status,
  helper,
  tone,
}: {
  helper: string;
  status: string;
  title: string;
  tone: 'neutral' | 'success' | 'warning';
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : 'border-neutral-200 bg-neutral-50 text-neutral-700';

  return (
    <div className={`rounded-2xl border px-4 py-4 shadow-sm ${toneClass}`}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em]">{title}</p>
      <p className="mt-2 text-[15px] font-semibold text-neutral-900">{status}</p>
      <p className="mt-2 break-all text-[11px] leading-relaxed text-neutral-500">{helper}</p>
    </div>
  );
}

function CredentialField({
  label,
  value,
  placeholder,
  helper,
  onChange,
}: {
  helper: string;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${inputClass} mt-3`}
        autoComplete="off"
        spellCheck={false}
      />
      <p className={helperTextClass}>{helper}</p>
    </div>
  );
}

function ConnectionDetail({
  label,
  value,
  mono = false,
}: {
  label: string;
  mono?: boolean;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200/70 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
      <p className={`mt-1 text-[13px] font-semibold text-neutral-900 ${mono ? 'break-all font-mono text-[12px]' : ''}`}>
        {value}
      </p>
    </div>
  );
}

function SectionPanel({
  eyebrow,
  title,
  description,
  children,
}: {
  children: React.ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-neutral-200/50 bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{eyebrow}</p>
        <h4 className="text-xl font-serif font-bold text-neutral-900">{title}</h4>
        <p className="max-w-3xl text-[12px] leading-relaxed text-neutral-500">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
}) {
  return (
    <div className="flex h-full min-h-[164px] flex-col justify-between rounded-2xl border border-neutral-200/50 bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">{title}</p>
          <p className="text-2xl font-serif font-bold text-neutral-900">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-950 text-white shadow-[0_8px_18px_rgba(17,24,39,0.12)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-neutral-500">{description}</p>
    </div>
  );
}

function ToggleCard({
  title,
  description,
  checked,
  onToggle,
}: {
  checked: boolean;
  description: string;
  onToggle: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`h-full min-h-[198px] rounded-2xl border p-5 text-left transition-all ${
        checked ? 'border-emerald-200 bg-emerald-50/80 shadow-[0_8px_24px_rgba(16,185,129,0.08)]' : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div className="space-y-2.5">
          <p className="text-[13px] font-semibold text-neutral-900">{title}</p>
          <p className="max-w-[34ch] text-[12px] leading-relaxed text-neutral-500">{description}</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
              checked ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {checked ? 'Ativo' : 'Desativado'}
          </span>

          <span
            className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors ${
              checked ? 'bg-emerald-500' : 'bg-neutral-300'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                checked ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </span>
        </div>
      </div>
    </button>
  );
}

function MethodCard({
  title,
  description,
  checked,
  onToggle,
}: {
  checked: boolean;
  description: string;
  onToggle: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={`h-full min-h-[188px] rounded-2xl border p-5 text-left transition-all ${
        checked
          ? 'border-neutral-900 bg-neutral-900 text-white shadow-[0_8px_18px_rgba(17,24,39,0.12)]'
          : 'border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300'
      }`}
    >
      <div className="flex h-full flex-col justify-between gap-6">
        <div>
          <p className="text-[13px] font-semibold">{title}</p>
          <p className={`mt-2 max-w-[34ch] text-[12px] leading-relaxed ${checked ? 'text-white/70' : 'text-neutral-500'}`}>{description}</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${
              checked ? 'bg-white/12 text-white' : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {checked ? 'Exibido' : 'Oculto'}
          </span>

          <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${checked ? 'border-white bg-white text-neutral-900' : 'border-neutral-300 text-transparent'}`}>
            <CheckCircle2 className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}

function StatusRow({
  label,
  value,
  active,
}: {
  active: boolean;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-neutral-200/60 bg-neutral-50/70 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <p className="text-[12px] font-semibold text-neutral-900">{label}</p>
        <p className="break-all text-[11px] text-neutral-500">{value}</p>
      </div>

      <span
        className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1 text-[11px] font-semibold sm:self-center ${
          active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-200 text-neutral-600'
        }`}
      >
        {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
        {active ? 'Detectada' : 'Pendente'}
      </span>
    </div>
  );
}

function PlaceholderTab({ tab }: { tab: IntegrationTab }) {
  const Icon = tab.icon;

  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 p-10 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-neutral-900 shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="mt-5 text-xl font-serif font-bold text-neutral-900">{tab.label}</h4>
      <p className="mx-auto mt-2 max-w-xl text-[13px] leading-relaxed text-neutral-500">{tab.description}</p>
      <div className="mx-auto mt-5 flex max-w-xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-[12px] leading-relaxed text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Esta aba ja esta preparada no menu e entra nas proximas etapas sem misturar a configuracao de pagamentos com outros modulos.</span>
      </div>
    </div>
  );
}
