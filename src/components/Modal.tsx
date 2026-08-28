'use client';

import { useEffect, type ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

// alert/confirm は使わず、このモーダルで確認を取る（ブラウザのモーダルダイアログは使用禁止）。
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h2 className="mb-3 text-lg font-bold text-slate-900">{title}</h2>
        )}
        <div className="text-slate-700">{children}</div>
        {footer && (
          <div className="mt-5 flex justify-end gap-2">{footer}</div>
        )}
      </div>
    </div>
  );
}
