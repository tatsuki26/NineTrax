import type { ReactNode } from 'react';

type Tone = 'field' | 'clay' | 'night' | 'neutral' | 'stitch';

const TONE: Record<Tone, string> = {
  field: 'bg-field-light text-field-dark',
  clay: 'bg-clay-light text-clay-dark',
  night: 'bg-night/10 text-night',
  neutral: 'bg-chalk text-ink-muted',
  stitch: 'bg-stitch/12 text-stitch-dark',
};

export function Badge({
  children,
  tone = 'neutral',
  dot = false,
  className = '',
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[tone]} ${className}`}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      )}
      {children}
    </span>
  );
}
