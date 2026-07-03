import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Shield,
  Smartphone,
} from 'lucide-react';
import { useAdminSession } from '../../context/AdminSessionContext';
import {
  changeAdminPassword,
  disableAdminMfa,
  enableAdminMfa,
  getAdminAuditLogs,
  setupAdminMfa,
  type AdminAuditLogRecord,
  type AdminMfaSetupPayload,
} from '../../lib/adminAuthApi';
import { showToast } from '../../lib/adminUtils';

export function Security() {
  const { refresh, user } = useAdminSession();
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditError, setAuditError] = useState('');
  const [mfaSetup, setMfaSetup] = useState<AdminMfaSetupPayload | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState<'idle' | 'setup' | 'enable' | 'disable'>('idle');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    confirmPassword: '',
    currentPassword: '',
    newPassword: '',
  });

  const securityMetrics = useMemo(() => {
    const failedCount = auditLogs.filter((entry) => entry.action.includes('failed')).length;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = auditLogs.filter((entry) => entry.createdAt.slice(0, 10) === today).length;

    return {
      failedCount,
      todayCount,
      totalCount: auditLogs.length,
    };
  }, [auditLogs]);

  const loadAuditLogs = useCallback(async () => {
    setAuditLoading(true);
    setAuditError('');

    try {
      const payload = await getAdminAuditLogs(80);
      setAuditLogs(payload.items);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : 'Nao foi possivel carregar a auditoria.');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showToast('Preencha todos os campos para trocar a senha.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showToast('A confirmacao da nova senha nao confere.');
      return;
    }

    setPasswordBusy(true);
    try {
      await changeAdminPassword(passwordForm.currentPassword, passwordForm.newPassword);
      await refresh();
      await loadAuditLogs();
      setPasswordForm({
        confirmPassword: '',
        currentPassword: '',
        newPassword: '',
      });
      showToast('Senha atualizada com sucesso. As outras sessoes foram encerradas.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel trocar a senha.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleStartMfaSetup = async () => {
    setMfaBusy('setup');
    try {
      const payload = await setupAdminMfa();
      setMfaSetup(payload);
      setMfaCode('');
      showToast('Segredo MFA gerado. Configure no app autenticador e confirme o codigo.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel iniciar a configuracao MFA.');
    } finally {
      setMfaBusy('idle');
    }
  };

  const handleEnableMfa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!mfaCode.trim()) {
      showToast('Informe o codigo do autenticador para ativar o MFA.');
      return;
    }

    setMfaBusy('enable');
    try {
      await enableAdminMfa(mfaCode.trim());
      await refresh();
      await loadAuditLogs();
      setMfaSetup(null);
      setMfaCode('');
      showToast('MFA ativado com sucesso.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel ativar o MFA.');
    } finally {
      setMfaBusy('idle');
    }
  };

  const handleDisableMfa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!disablePassword || !disableCode) {
      showToast('Informe sua senha atual e o codigo MFA para desativar.');
      return;
    }

    setMfaBusy('disable');
    try {
      await disableAdminMfa(disablePassword, disableCode);
      await refresh();
      await loadAuditLogs();
      setDisablePassword('');
      setDisableCode('');
      setMfaSetup(null);
      showToast('MFA desativado com sucesso.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Nao foi possivel desativar o MFA.');
    } finally {
      setMfaBusy('idle');
    }
  };

  const copyToClipboard = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      showToast(successMessage);
    } catch {
      showToast('Nao foi possivel copiar automaticamente.');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-700">
          <Shield className="h-3.5 w-3.5" />
          Seguranca Administrativa
        </div>
        <h2 className="text-3xl font-serif tracking-tight text-neutral-900">Gestao de acesso</h2>
        <p className="max-w-3xl text-[13px] leading-relaxed text-neutral-500">
          Aqui a gente controla autenticacao em duas etapas, rotacao de senha e a leitura visual dos eventos
          mais sensiveis do painel.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="MFA"
          value={user?.mfaEnabled ? 'Ativo' : 'Desligado'}
          tone={user?.mfaEnabled ? 'success' : 'warning'}
          helper={user?.mfaEnabled ? 'Conta protegida com segundo fator.' : 'Ative para endurecer o acesso ao painel.'}
        />
        <MetricCard
          label="Eventos hoje"
          value={String(securityMetrics.todayCount)}
          tone="neutral"
          helper="Quantidade de entradas recentes na trilha de auditoria."
        />
        <MetricCard
          label="Falhas registradas"
          value={String(securityMetrics.failedCount)}
          tone={securityMetrics.failedCount > 0 ? 'warning' : 'success'}
          helper="Tentativas invalidadas de login, MFA ou troca de senha."
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-neutral-200/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] md:p-8">
          <div className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-5">
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-neutral-900">Autenticacao em duas etapas</h3>
              <p className="text-[13px] leading-relaxed text-neutral-500">
                Use um app autenticador para exigir o codigo TOTP no login administrativo.
              </p>
            </div>
            <StatusPill active={Boolean(user?.mfaEnabled)} />
          </div>

          {!user?.mfaEnabled ? (
            <div className="space-y-5 pt-6">
              <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70 p-5">
                <div className="flex items-start gap-3">
                  <Smartphone className="mt-0.5 h-5 w-5 text-neutral-700" />
                  <div className="space-y-1">
                    <p className="text-[13px] font-semibold text-neutral-900">Configurar novo dispositivo</p>
                    <p className="text-[12px] leading-relaxed text-neutral-500">
                      Gere o segredo, cadastre no Google Authenticator, 1Password, Authy ou similar e confirme
                      o codigo de 6 digitos abaixo.
                    </p>
                  </div>
                </div>
              </div>

              {!mfaSetup ? (
                <button
                  type="button"
                  onClick={() => { void handleStartMfaSetup(); }}
                  disabled={mfaBusy !== 'idle'}
                  className="inline-flex items-center gap-3 rounded-2xl bg-neutral-900 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {mfaBusy === 'setup' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                  Gerar segredo MFA
                </button>
              ) : (
                <div className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <SecretPanel
                      label="Chave manual"
                      value={mfaSetup.secret}
                      onCopy={() => { void copyToClipboard(mfaSetup.secret, 'Chave MFA copiada.'); }}
                    />
                    <SecretPanel
                      label="Provisioning URI"
                      value={mfaSetup.provisioningUri}
                      onCopy={() => { void copyToClipboard(mfaSetup.provisioningUri, 'URI de provisionamento copiada.'); }}
                    />
                  </div>

                  <form className="space-y-4" onSubmit={(event) => { void handleEnableMfa(event); }}>
                    <div>
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        Codigo do autenticador
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={mfaCode}
                        onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[13px] font-medium text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
                      />
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={mfaBusy !== 'idle'}
                        className="inline-flex items-center gap-3 rounded-2xl bg-neutral-900 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {mfaBusy === 'enable' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Confirmar ativacao
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMfaSetup(null);
                          setMfaCode('');
                        }}
                        className="rounded-2xl border border-neutral-200 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5 pt-6">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-700" />
                  <div className="space-y-1">
                    <p className="text-[13px] font-semibold text-emerald-900">MFA ativo nesta conta</p>
                    <p className="text-[12px] leading-relaxed text-emerald-800/80">
                      O login administrativo ja exige o codigo do autenticador para concluir a sessao.
                    </p>
                  </div>
                </div>
              </div>

              <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => { void handleDisableMfa(event); }}>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                    Senha atual
                  </label>
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(event) => setDisablePassword(event.target.value)}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[13px] text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                    Codigo MFA
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={disableCode}
                    onChange={(event) => setDisableCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[13px] font-medium text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={mfaBusy !== 'idle'}
                    className="inline-flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {mfaBusy === 'disable' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                    Desativar MFA
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        <section className="rounded-[28px] border border-neutral-200/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] md:p-8">
          <div className="space-y-1 border-b border-neutral-100 pb-5">
            <h3 className="text-xl font-semibold text-neutral-900">Troca de senha</h3>
            <p className="text-[13px] leading-relaxed text-neutral-500">
              Ao salvar a nova senha, as outras sessoes administrativas sao encerradas automaticamente.
            </p>
          </div>

          <form className="space-y-4 pt-6" onSubmit={(event) => { void handlePasswordChange(event); }}>
            <PasswordField
              label="Senha atual"
              value={passwordForm.currentPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
            />
            <PasswordField
              label="Nova senha"
              value={passwordForm.newPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
            />
            <PasswordField
              label="Confirmar nova senha"
              value={passwordForm.confirmPassword}
              onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
            />

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-[12px] leading-relaxed text-amber-900">
              Use uma senha forte, exclusiva do painel e com pelo menos 8 caracteres.
            </div>

            <button
              type="submit"
              disabled={passwordBusy}
              className="inline-flex items-center gap-3 rounded-2xl bg-neutral-900 px-5 py-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Atualizar senha
            </button>
          </form>
        </section>
      </div>

      <section className="rounded-[28px] border border-neutral-200/70 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] md:p-8">
        <div className="flex flex-col gap-4 border-b border-neutral-100 pb-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h3 className="text-xl font-semibold text-neutral-900">Trilha de auditoria</h3>
            <p className="max-w-2xl text-[13px] leading-relaxed text-neutral-500">
              Eventos de login, logout, MFA, troca de senha e falhas relevantes para o painel administrativo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => { void loadAuditLogs(); }}
            className="rounded-2xl border border-neutral-200 px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50"
          >
            Atualizar logs
          </button>
        </div>

        {auditError ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <div className="text-[13px]">{auditError}</div>
          </div>
        ) : null}

        {auditLoading ? (
          <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70">
            <div className="flex items-center gap-3 text-[13px] text-neutral-500">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Carregando eventos de seguranca...
            </div>
          </div>
        ) : auditLogs.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70 p-6 text-[13px] text-neutral-500">
            Ainda nao existem eventos registrados nesta trilha.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200">
            <div className="hidden grid-cols-[1.2fr_0.95fr_0.85fr_0.85fr_0.9fr] gap-4 bg-neutral-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500 lg:grid">
              <span>Acao</span>
              <span>Responsavel</span>
              <span>Origem</span>
              <span>Data</span>
              <span>Detalhes</span>
            </div>

            <div className="divide-y divide-neutral-100">
              {auditLogs.map((entry) => (
                <div key={entry.id} className="grid gap-3 px-5 py-4 lg:grid-cols-[1.2fr_0.95fr_0.85fr_0.85fr_0.9fr] lg:items-start">
                  <div>
                    <p className="text-[13px] font-semibold text-neutral-900">{formatAuditAction(entry.action)}</p>
                    <p className="mt-1 text-[12px] text-neutral-500">
                      {entry.entityType}: {entry.entityId}
                    </p>
                  </div>
                  <div className="text-[12px] text-neutral-700">
                    <p className="font-medium text-neutral-900">{entry.actorEmail || 'Sistema'}</p>
                    <p className="mt-1 text-neutral-500">{entry.actorType}</p>
                  </div>
                  <div className="text-[12px] text-neutral-700">
                    <p>{entry.ipAddress || '-'}</p>
                    <p className="mt-1 break-all text-neutral-500">{entry.userAgent || '-'}</p>
                  </div>
                  <div className="text-[12px] text-neutral-700">
                    {formatAuditDate(entry.createdAt)}
                  </div>
                  <div className="text-[12px] text-neutral-500">
                    {entry.diffJson ? (
                      <pre className="overflow-x-auto rounded-xl bg-neutral-50 p-3 font-mono text-[11px] leading-relaxed text-neutral-600">
                        {JSON.stringify(entry.diffJson, null, 2)}
                      </pre>
                    ) : (
                      <span>Sem diff adicional.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  helper,
  label,
  tone,
  value,
}: {
  helper: string;
  label: string;
  tone: 'neutral' | 'success' | 'warning';
  value: string;
}) {
  const toneClasses = {
    neutral: 'border-neutral-200 bg-white text-neutral-900',
    success: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50/70 text-amber-900',
  } as const;

  return (
    <div className={`rounded-[24px] border p-5 shadow-[0_10px_30px_rgba(15,23,42,0.04)] ${toneClasses[tone]}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-70">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-[12px] leading-relaxed opacity-80">{helper}</p>
    </div>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] ${
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {active ? 'MFA ativo' : 'MFA pendente'}
    </div>
  );
}

function SecretPanel({
  label,
  onCopy,
  value,
}: {
  label: string;
  onCopy: () => void;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">{label}</p>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-700 transition hover:border-neutral-300"
        >
          <Clipboard className="h-3.5 w-3.5" />
          Copiar
        </button>
      </div>
      <div className="break-all rounded-xl bg-white p-3 font-mono text-[11px] leading-relaxed text-neutral-700">
        {value}
      </div>
    </div>
  );
}

function PasswordField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
        {label}
      </label>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-[13px] text-neutral-900 outline-none transition focus:border-neutral-900 focus:bg-white"
      />
    </div>
  );
}

function formatAuditAction(action: string) {
  return action
    .split('.')
    .map((chunk) => chunk.replace(/_/g, ' '))
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(' / ');
}

function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}
