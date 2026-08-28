'use client';

// docs/実装分担.md のフォルダ構成では [担当B]、§2-11 では担当A に記載あり（ドキュメント内の齟齬）。
// ここでは担当B のスマホ画面フローの一部として実装している。担当A と要調整。

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useTeam } from '@/lib/db/hooks';

const NAV = [
  { key: 'home', label: 'ホーム', path: '' },
  { key: 'players', label: '選手', path: '/players' },
  { key: 'stats', label: '成績', path: '/stats' },
];

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;
  const pathname = usePathname();
  const { team, loading } = useTeam(teamId);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-slate-500">
        読み込み中…
      </div>
    );
  }

  if (!team) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-bold">チームが見つかりません</p>
        <p className="text-sm text-slate-600">
          共有URLが正しいか確認してください。チームID: <code>{teamId}</code>
        </p>
        <Link href="/" className="text-sm text-brand underline">
          トップへ
        </Link>
      </div>
    );
  }

  const base = `/team/${teamId}`;

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <Link href={base} className="block">
          <p className="text-xs text-slate-500">草野球スコア記録</p>
          <h1 className="truncate text-lg font-bold">{team.name}</h1>
        </Link>
      </header>

      <nav className="flex border-b border-slate-200 bg-white">
        {NAV.map((item) => {
          const href = `${base}${item.path}`;
          const active =
            item.path === ''
              ? pathname === base || pathname === `${base}/`
              : pathname.startsWith(href);
          return (
            <Link
              key={item.key}
              href={href}
              className={
                'flex-1 py-2.5 text-center text-sm font-medium ' +
                (active
                  ? 'border-b-2 border-brand text-brand'
                  : 'text-slate-500')
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <main className="flex-1 px-4 py-4">{children}</main>
    </div>
  );
}
