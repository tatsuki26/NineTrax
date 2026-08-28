'use client';

import type { ReactNode } from 'react';

// 横スクロール可能なテーブル。成績表など列が多いものを想定。
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  className = '',
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`whitespace-nowrap border-b border-slate-200 bg-slate-50 px-2 py-2 text-right font-semibold text-slate-600 first:text-left ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = '',
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap border-b border-slate-100 px-2 py-2 text-right tabular-nums text-slate-800 first:text-left ${className}`}
    >
      {children}
    </td>
  );
}
