'use client';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'accent' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-field text-white shadow-sm hover:bg-field-dark active:bg-field-dark disabled:bg-ink-faint/40 disabled:shadow-none',
  accent:
    'bg-clay text-white shadow-sm hover:bg-clay-dark active:bg-clay-dark disabled:bg-ink-faint/40 disabled:shadow-none',
  secondary:
    'bg-white text-ink border border-line hover:bg-chalk active:bg-chalk disabled:text-ink-faint',
  danger:
    'bg-stitch text-white shadow-sm hover:bg-stitch-dark active:bg-stitch-dark disabled:bg-ink-faint/40',
  ghost: 'bg-transparent text-field hover:bg-field/10 active:bg-field/15',
};

const SIZE: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg',
  md: 'h-11 px-4 text-[15px] rounded-xl',
  lg: 'h-14 px-6 text-base rounded-2xl',
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
        'inline-flex select-none items-center justify-center gap-1.5 font-semibold',
        'transition-[background-color,transform] duration-100 active:scale-[0.98]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-field',
        'disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANT[variant],
        SIZE[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    />
  );
}
