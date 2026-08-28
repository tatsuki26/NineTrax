'use client';

import type { ReactNode } from 'react';

// 横スクロール可能なテーブル。成績表など列が多いものを想定。
// 先頭列（選手名）は sticky で固定する。
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full border-collapse text-sm [&_tr:last-child_td]:border-b-0">
        {children}
      </table>
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
      className={`whitespace-nowrap border-b border-line bg-chalk px-2.5 py-2.5 text-right text-xs font-bold text-ink-faint first:sticky first:left-0 first:z-10 first:bg-chalk first:text-left ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = '',
  strong = false,
}: {
  children?: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  return (
    <td
      className={`tnum whitespace-nowrap border-b border-line/70 px-2.5 py-2.5 text-right first:sticky first:left-0 first:z-10 first:bg-white first:text-left first:font-medium ${
        strong ? 'font-bold text-ink' : 'text-ink-muted'
      } ${className}`}
    >
      {children}
    </td>
  );
}
