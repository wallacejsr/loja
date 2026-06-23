import React from 'react';

interface StorefrontErrorNoticeProps {
  message: string;
  detail?: string | null;
  actionLabel?: string;
  onRetry?: () => void | Promise<void>;
  compact?: boolean;
}

export function StorefrontErrorNotice({
  message,
  detail,
  actionLabel,
  onRetry,
  compact = false,
}: StorefrontErrorNoticeProps) {
  return (
    <div className={`border border-red-200 bg-red-50/70 text-secondary ${compact ? 'rounded-2xl p-4' : 'rounded-3xl p-8 text-center'}`}>
      <p className={`font-medium ${compact ? 'text-sm' : 'text-base'}`}>{message}</p>
      {detail && (
        <p className={`text-red-700/80 mt-2 ${compact ? 'text-xs' : 'text-sm'}`}>{detail}</p>
      )}
      {onRetry && actionLabel && (
        <button
          type="button"
          onClick={() => {
            void onRetry();
          }}
          className={`mt-4 inline-flex items-center justify-center rounded-full border border-red-200 bg-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-secondary transition-colors hover:bg-red-100 ${compact ? 'w-full sm:w-auto' : ''}`}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
