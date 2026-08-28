'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Team } from '@/lib/types';
import { getTeam } from '@/lib/db';
import { isValidTeamId } from '@/lib/ids';
import { TeamProvider } from '@/lib/team-context';
import { Spinner } from '@/components/Spinner';
import { BottomNav } from '@/components/BottomNav';
import { SideNav } from '@/components/SideNav';
import { TeamAvatar } from '@/components/TeamAvatar';
import { NineTraxMark } from '@/components/Logo';

type State =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'ready'; team: Team };

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ teamId: string }>();
  const teamId = params.teamId;
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    if (!isValidTeamId(teamId)) {
      setState({ kind: 'not-found' });
      return;
    }
    setState({ kind: 'loading' });
    getTeam(teamId)
      .then((team) => {
        if (cancelled) return;
        setState(team ? { kind: 'ready', team } : { kind: 'not-found' });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'not-found' });
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (state.kind === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-chalk">
        <Spinner label="チーム情報を読み込み中…" />
      </div>
    );
  }

  if (state.kind === 'not-found') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 bg-chalk p-6 text-center">
        <NineTraxMark size={44} />
        <h1 className="text-xl font-bold text-ink">チームが見つかりません</h1>
        <p className="text-sm text-ink-muted">
          共有URLが正しいかご確認ください。IDが変更された可能性もあります。
        </p>
        <Link href="/" className="mt-1 text-sm font-semibold text-field hover:underline">
          トップへ戻る
        </Link>
      </main>
    );
  }

  const { team } = state;

  return (
    <TeamProvider team={team}>
      <div className="min-h-dvh bg-chalk lg:flex">
        <SideNav team={team} />

        <div className="flex min-h-dvh flex-1 flex-col">
          {/* スマホ用ヘッダー（PC は SideNav が担う） */}
          <header className="panel-night sticky top-0 z-20 flex items-center justify-between gap-2 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
            <Link
              href={`/team/${teamId}`}
              className="flex min-w-0 items-center gap-2"
            >
              <TeamAvatar
                name={team.name}
                color={team.color}
                logoUrl={team.logoUrl}
                size={28}
              />
              <span className="truncate text-[15px] font-bold tracking-tight text-white">
                {team.name}
              </span>
            </Link>
            <Link href="/" aria-label="NineTrax トップ" className="shrink-0">
              <NineTraxMark size={22} />
            </Link>
          </header>

          <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 lg:max-w-5xl lg:px-10 lg:py-10">
            {children}
          </main>

          <BottomNav teamId={teamId} />
        </div>
      </div>
    </TeamProvider>
  );
}
