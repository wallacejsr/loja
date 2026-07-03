import React, { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { useAdminSession, isAdminApiErrorWithCode } from '../../context/AdminSessionContext';
import { requestAdminPasswordReset, resetAdminPassword } from '../../lib/adminAuthApi';

type Mode = 'forgot' | 'login' | 'reset';

export function AdminLogin() {
  const { authenticated, loading, login } = useAdminSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectTo = useMemo(() => {
    const rawRedirect = searchParams.get('redirect');
    return rawRedirect?.startsWith('/admin') ? rawRedirect : '/admin';
  }, [searchParams]);
  const resetToken = searchParams.get('token') || '';
  const [mode, setMode] = useState<Mode>(resetToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && authenticated) {
    return <Navigate to={redirectTo} replace state={location.state} />;
  }

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');

    try {
      await login(email, password, requiresOtp ? otp : undefined);
      navigate(redirectTo, { replace: true });
    } catch (caughtError) {
      if (isAdminApiErrorWithCode(caughtError, 'MFA_REQUIRED')) {
        setRequiresOtp(true);
        setError('Digite o código de autenticação de 6 dígitos para concluir o acesso.');
      } else {
        setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível entrar no painel.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');

    try {
      const payload = await requestAdminPasswordReset(email);
      setFeedback(payload.resetUrl
        ? `Fluxo criado. Link de redefinição: ${payload.resetUrl}`
        : payload.message);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível iniciar a recuperação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setFeedback('');

    try {
      await resetAdminPassword(resetToken, resetPasswordValue);
      setFeedback('Senha redefinida com sucesso. Agora você já pode entrar no painel.');
      setMode('login');
      setResetPasswordValue('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Não foi possível redefinir a senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[1100px] grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] border border-white/10 bg-white/[0.03] p-8 lg:p-10 shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-200">
            <ShieldCheck className="h-4 w-4" />
            Admin Security
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight">Acesso protegido ao painel</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
            O painel administrativo agora exige autenticação real em sessão segura, renovação por inatividade,
            trilha de auditoria e suporte a MFA para operações sensíveis.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[
              'Cookies HttpOnly, Secure e SameSite no servidor',
              'Permissões por perfil: administrador, financeiro e suporte',
              'Rate limit, bloqueio temporário e auditoria de falhas',
              'Base pronta para MFA/TOTP e recuperação por token temporário',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/75">
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[28px] bg-white p-8 text-neutral-900 shadow-[0_30px_80px_rgba(0,0,0,0.3)]"
        >
          <div className="flex gap-2 rounded-2xl bg-neutral-100 p-1 text-[12px] font-semibold uppercase tracking-[0.16em]">
            <button type="button" onClick={() => { setMode('login'); setError(''); setFeedback(''); }} className={`flex-1 rounded-xl px-4 py-3 ${mode === 'login' ? 'bg-neutral-900 text-white' : 'text-neutral-500'}`}>
              Login
            </button>
            <button type="button" onClick={() => { setMode('forgot'); setError(''); setFeedback(''); }} className={`flex-1 rounded-xl px-4 py-3 ${mode === 'forgot' ? 'bg-neutral-900 text-white' : 'text-neutral-500'}`}>
              Recuperar
            </button>
          </div>

          <div className="mt-8">
            {mode === 'login' ? (
              <form className="space-y-5" onSubmit={(event) => { void handleLoginSubmit(event); }}>
                <Field label="E-mail" icon={Mail}>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className={inputClass} placeholder="admin@seudominio.com" />
                </Field>
                <Field label="Senha" icon={LockKeyhole}>
                  <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required className={inputClass} placeholder="Digite sua senha" />
                </Field>
                {requiresOtp ? (
                  <Field label="Código MFA" icon={KeyRound}>
                    <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" pattern="[0-9]*" maxLength={6} required className={inputClass} placeholder="000000" />
                  </Field>
                ) : null}
                <button disabled={submitting} className="w-full rounded-2xl bg-neutral-900 px-5 py-4 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-70">
                  {submitting ? 'Entrando...' : 'Entrar no painel'}
                </button>
              </form>
            ) : mode === 'forgot' ? (
              <form className="space-y-5" onSubmit={(event) => { void handleForgotSubmit(event); }}>
                <Field label="E-mail do administrador" icon={Mail}>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required className={inputClass} placeholder="admin@seudominio.com" />
                </Field>
                <button disabled={submitting} className="w-full rounded-2xl bg-neutral-900 px-5 py-4 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-70">
                  {submitting ? 'Enviando...' : 'Gerar recuperação segura'}
                </button>
              </form>
            ) : (
              <form className="space-y-5" onSubmit={(event) => { void handleResetSubmit(event); }}>
                <Field label="Nova senha" icon={LockKeyhole}>
                  <input value={resetPasswordValue} onChange={(event) => setResetPasswordValue(event.target.value)} type="password" required className={inputClass} placeholder="Digite a nova senha" />
                </Field>
                <button disabled={submitting} className="w-full rounded-2xl bg-neutral-900 px-5 py-4 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-70">
                  {submitting ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </form>
            )}

            {error ? (
              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}

            {feedback ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {feedback}
              </div>
            ) : null}
          </div>

          <div className="mt-8 text-center text-xs text-neutral-500">
            Voltar para a <Link to="/" className="font-semibold text-neutral-900 hover:underline">loja</Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  children,
  icon: Icon,
  label,
}: {
  children: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass = 'w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 text-sm text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900';

