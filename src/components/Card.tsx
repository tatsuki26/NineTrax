import type { ReactNode } from 'react';

// 標準サーフェス。白カード + 温かみのある境界 + やわらかい影。
export function Card({
  children,
  className = '',
  as: As = 'section',
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  as?: 'section' | 'div' | 'article';
  /** PC でホバー時に浮き上がらせる（リンクカード向け） */
  hover?: boolean;
}) {
  return (
    <As
      className={`rounded-2xl border border-line bg-white shadow-card ${
        hover ? 'card-hover' : ''
      } ${className}`}
    >
      {children}
    </As>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-ink-faint">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-ink-faint/80">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
}
