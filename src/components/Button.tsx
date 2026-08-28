'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-dark disabled:bg-slate-300',
  secondary:
    'bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
  ghost: 'bg-transparent text-brand hover:bg-brand/10',
};

const SIZE: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-14 px-5 text-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed',
        VARIANT[variant],
        SIZE[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
