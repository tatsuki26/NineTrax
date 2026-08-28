'use client';

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

const inputBase =
  'h-12 w-full rounded-xl border border-line bg-white px-3.5 text-ink placeholder:text-ink-faint ' +
  'transition-colors focus:border-field focus:outline-none focus:ring-4 focus:ring-field/15';

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink-muted">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-xs text-ink-faint">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs font-medium text-stitch-dark">
          {error}
        </span>
      )}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input className={`${inputBase} ${className}`} {...rest} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', ...rest } = props;
  return (
    <select
      className={`${inputBase} appearance-none bg-[length:20px] bg-[right_0.75rem_center] bg-no-repeat pr-10 ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20' fill='none' stroke='%238B877B' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
      }}
      {...rest}
    />
  );
}
