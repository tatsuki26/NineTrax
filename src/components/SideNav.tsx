'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Team } from '@/lib/types';
import { TEAM_NAV, isNavActive } from '@/lib/team-nav';
import { TeamAvatar } from '@/components/TeamAvatar';
import { NineTraxLogo } from '@/components/Logo';
import { Button } from '@/components/Button';

// PC（lg 以上）専用のサイドバー。スマホでは BottomNav を使う。
export function SideNav({ team }: { team: Team }) {
  const pathname = usePathname();
  const base = `/team/${team.id}`;

  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-white/10 panel-night lg:flex">
      <Link
        href="/"
        className="flex items-center px-5 pt-6 transition-opacity hover:opacity-90"
      >
        <NineTraxLogo size={24} wordmarkClassName="text-[15px]" />
      </Link>

      <Link
        href={base}
        className="mx-3 mb-2 mt-4 flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2.5 transition-colors hover:bg-white/[0.07]"
      >
        <TeamAvatar
          name={team.name}
          color={team.color}
          logoUrl={team.logoUrl}
          size={36}
          className="ring-1 ring-white/15"
        />
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/40">
            チーム
          </span>
          <span className="block truncate text-[15px] font-bold text-white">
            {team.name}
          </span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {TEAM_NAV.map((item) => {
          const active = isNavActive(pathname, base, item.suffix);
          return (
            <Link
              key={item.key}
              href={`${base}${item.suffix}`}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-white/12 text-white'
                  : 'text-white/55 hover:bg-white/6 hover:text-white/90'
              }`}
            >
              <span className={active ? 'text-clay-light' : ''}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-6 pt-2">
        <Link href={`${base}/games/new`} className="block">
          <Button variant="accent" fullWidth>
            ＋ 試合を作成
          </Button>
        </Link>
      </div>
    </aside>
  );
}
