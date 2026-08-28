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
import { TeamAvatar } from '@/components/TeamAvatar';

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
        <div className="text-4xl">⚾️</div>
        <h1 className="text-xl font-bold text-ink">チームが見つかりません</h1>
        <p className="text-sm text-ink-muted">
          共有URLが正しいかご確認ください。IDが変更された可能性もあります。
        </p>
      </main>
    );
  }

  return (
    <TeamProvider team={state.team}>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-chalk">
        <header className="panel-night sticky top-0 z-20 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link href={`/team/${teamId}`} className="flex items-center gap-2">
            <TeamAvatar
              name={state.team.name}
              color={state.team.color}
              logoUrl={state.team.logoUrl}
              size={28}
            />
            <span className="truncate text-[15px] font-bold tracking-tight text-white">
              {state.team.name}
            </span>
          </Link>
        </header>

        <div className="flex-1 px-4 py-4">{children}</div>

        <BottomNav teamId={teamId} />
      </div>
    </TeamProvider>
  );
}
