'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TEAM_NAV, isNavActive } from '@/lib/team-nav';

// スマホ（lg 未満）専用の下タブ。PC では SideNav を使う。
export function BottomNav({ teamId }: { teamId: string }) {
  const pathname = usePathname();
  const base = `/team/${teamId}`;

  return (
    <nav className="sticky bottom-0 z-20 border-t border-line bg-cream/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md">
        {TEAM_NAV.map((item) => {
          const active = isNavActive(pathname, base, item.suffix);
          return (
            <Link
              key={item.key}
              href={`${base}${item.suffix}`}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${
                active ? 'text-field' : 'text-ink-faint'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
