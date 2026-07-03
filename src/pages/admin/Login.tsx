import React, { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, KeyRound, LockKeyhole, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { useAdminSession, isAdminApiErrorWithCode } from '../../context/AdminSessionContext';
import { resetAdminPassword } from '../../lib/adminAuthApi';

type Mode = 'login' | 'reset';

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
        setError('Digite o codigo de autenticacao de 6 digitos para concluir o acesso.');
      } else {
        setError(caughtError instanceof Error ? caughtError.message : 'Nao foi possivel entrar no painel.');
      }
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
      setFeedback('Senha redefinida com sucesso. Agora voce ja pode entrar no painel.');
      setMode('login');
      setResetPasswordValue('');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Nao foi possivel redefinir a senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white flex items-center justify-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[540px] rounded-[28px] bg-white p-8 text-neutral-900 shadow-[0_30px_80px_rgba(0,0,0,0.3)]"
      >
        {mode === 'login' ? (
          <div className="rounded-2xl bg-neutral-100 p-1 text-[12px] font-semibold uppercase tracking-[0.16em]">
            <div className="rounded-xl bg-neutral-900 px-4 py-3 text-center text-white">
              Login
            </div>
          </div>
        ) : null}

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
                <Field label="Codigo MFA" icon={KeyRound}>
                  <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" pattern="[0-9]*" maxLength={6} required className={inputClass} placeholder="000000" />
                </Field>
              ) : null}
              <button disabled={submitting} className="w-full rounded-2xl bg-neutral-900 px-5 py-4 text-[12px] font-bold uppercase tracking-[0.22em] text-white transition hover:bg-neutral-800 disabled:cursor-wait disabled:opacity-70">
                {submitting ? 'Entrando...' : 'Entrar no painel'}
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

