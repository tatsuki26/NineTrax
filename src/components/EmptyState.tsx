import type { ReactNode } from 'react';

// 空状態。アイコン（絵文字可）＋ 見出し ＋ 補足 ＋ 任意のアクション。
export function EmptyState({
  icon = '⚾️',
  title,
  hint,
  action,
  className = '',
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 px-6 py-12 text-center ${className}`}
    >
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-field-tint text-2xl">
        {icon}
      </div>
      <p className="text-sm font-bold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-xs text-ink-faint">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
