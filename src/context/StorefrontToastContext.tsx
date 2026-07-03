import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

type StorefrontToastTone = 'error' | 'info' | 'success';

type StorefrontToast = {
  durationMs?: number;
  id: number;
  message: string;
  title?: string;
  tone: StorefrontToastTone;
};

type ShowStorefrontToastInput = {
  durationMs?: number;
  message: string;
  title?: string;
  tone?: StorefrontToastTone;
};

type StorefrontToastContextData = {
  hideToast: () => void;
  showToast: (input: ShowStorefrontToastInput) => void;
};

const StorefrontToastContext = createContext<StorefrontToastContextData>({} as StorefrontToastContextData);

const toneStyles: Record<StorefrontToastTone, { icon: ReactNode; panel: string; iconWrap: string; title: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    panel: 'border-emerald-200 bg-white/95',
    iconWrap: 'bg-emerald-100 text-emerald-600',
    title: 'text-secondary',
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    panel: 'border-sky-200 bg-white/95',
    iconWrap: 'bg-sky-100 text-sky-600',
    title: 'text-secondary',
  },
  error: {
    icon: <AlertCircle className="h-5 w-5" />,
    panel: 'border-red-200 bg-white/95',
    iconWrap: 'bg-red-100 text-red-600',
    title: 'text-secondary',
  },
};

export function StorefrontToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<StorefrontToast | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setToast(null);
  }, []);

  const showToast = useCallback((input: ShowStorefrontToastInput) => {
    setToast({
      durationMs: input.durationMs ?? 4000,
      id: Date.now(),
      message: input.message,
      title: input.title,
      tone: input.tone || 'info',
    });
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, toast.durationMs ?? 4000);

    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [toast]);

  const value = useMemo(() => ({
    hideToast,
    showToast,
  }), [hideToast, showToast]);

  const tone = toast ? toneStyles[toast.tone] : null;

  return (
    <StorefrontToastContext.Provider value={value}>
      {children}
      {toast && tone ? (
        <div className="pointer-events-none fixed right-4 top-24 z-[80] w-[calc(100vw-2rem)] max-w-sm sm:right-6 sm:top-28">
          <div className={`pointer-events-auto rounded-2xl border p-4 shadow-[0_18px_50px_rgba(16,24,40,0.14)] backdrop-blur-sm transition-all ${tone.panel}`}>
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone.iconWrap}`}>
                {tone.icon}
              </div>
              <div className="min-w-0 flex-1">
                {toast.title ? (
                  <p className={`text-sm font-semibold ${tone.title}`}>{toast.title}</p>
                ) : null}
                <p className={`text-sm leading-6 text-secondary/75 ${toast.title ? 'mt-1' : ''}`}>{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={hideToast}
                className="rounded-full p-1 text-secondary/40 transition-colors hover:bg-neutral-100 hover:text-secondary"
                aria-label="Close notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StorefrontToastContext.Provider>
  );
}

export function useStorefrontToast() {
  return useContext(StorefrontToastContext);
}
