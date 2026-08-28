import type { ReactNode } from 'react';

// チーム画面の共通ナビ定義。SideNav（PC）と BottomNav（スマホ）で共有する。

export interface TeamNavItem {
  key: string;
  label: string;
  /** `/team/{id}` からの相対パス（ホームは ''） */
  suffix: string;
  icon: ReactNode;
}

function svg(children: ReactNode) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const TEAM_NAV: TeamNavItem[] = [
  {
    key: 'home',
    label: 'ホーム',
    suffix: '',
    icon: svg(
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
      </>,
    ),
  },
  {
    key: 'players',
    label: '選手',
    suffix: '/players',
    icon: svg(
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 20c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
        <path d="M16 5.5a3 3 0 0 1 0 5.8M18.5 20c0-2.4-1.3-4.2-3.2-4.8" />
      </>,
    ),
  },
  {
    key: 'stats',
    label: '成績',
    suffix: '/stats',
    icon: svg(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  },
  {
    key: 'admin',
    label: '管理',
    suffix: '/admin',
    icon: svg(<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />),
  },
];

/** 現在パスがそのナビ項目のものか判定する。 */
export function isNavActive(pathname: string, base: string, suffix: string): boolean {
  const href = `${base}${suffix}`;
  return suffix === '' ? pathname === base : pathname.startsWith(href);
}
