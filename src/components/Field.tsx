'use client';

import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';

const inputBase =
  'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-900 ' +
  'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

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
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
      {hint && !error && (
        <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
      {error && (
        <span className="mt-1 block text-xs text-red-600">{error}</span>
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
  return <select className={`${inputBase} ${className}`} {...rest} />;
}
