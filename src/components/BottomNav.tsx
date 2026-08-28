'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

function Icon({ name }: { name: 'home' | 'players' | 'stats' | 'admin' }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
        </svg>
      );
    case 'players':
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
          <path d="M16 5.5a3 3 0 0 1 0 5.8M18.5 20c0-2.4-1.3-4.2-3.2-4.8" />
        </svg>
      );
    case 'stats':
      return (
        <svg {...common}>
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      );
    case 'admin':
      return (
        <svg {...common}>
          <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
        </svg>
      );
  }
}

function Tab({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${
        active ? 'text-field' : 'text-ink-faint'
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export function BottomNav({ teamId }: { teamId: string }) {
  const pathname = usePathname();
  const base = `/team/${teamId}`;
  const is = (p: string) =>
    p === base ? pathname === base : pathname.startsWith(p);

  return (
    <nav className="sticky bottom-0 z-20 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-md">
        <Tab href={base} active={is(base)} icon={<Icon name="home" />} label="ホーム" />
        <Tab
          href={`${base}/players`}
          active={is(`${base}/players`)}
          icon={<Icon name="players" />}
          label="選手"
        />
        <Tab
          href={`${base}/stats`}
          active={is(`${base}/stats`)}
          icon={<Icon name="stats" />}
          label="成績"
        />
        <Tab
          href={`${base}/admin`}
          active={is(`${base}/admin`)}
          icon={<Icon name="admin" />}
          label="管理"
        />
      </div>
    </nav>
  );
}
