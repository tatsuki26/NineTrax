'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Team } from '@/lib/types';
import { getTeam } from '@/lib/db';
import { isValidTeamId } from '@/lib/ids';
import { TeamProvider } from '@/lib/team-context';
import { Spinner } from '@/components/Spinner';

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
      <div className="min-h-dvh">
        <Spinner label="チーム情報を読み込み中…" />
      </div>
    );
  }

  if (state.kind === 'not-found') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-xl font-bold text-slate-900">チームが見つかりません</h1>
        <p className="text-sm text-slate-600">
          共有URLが正しいかご確認ください。IDが変更された可能性もあります。
        </p>
      </main>
    );
  }

  return (
    <TeamProvider team={state.team}>
      <div className="mx-auto min-h-dvh max-w-md bg-slate-50">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <Link
            href={`/team/${teamId}`}
            className="truncate text-base font-bold text-slate-900"
          >
            {state.team.name}
          </Link>
          <nav className="flex shrink-0 gap-3 text-sm">
            <Link href={`/team/${teamId}`} className="text-slate-600 hover:text-brand">
              ホーム
            </Link>
            <Link
              href={`/team/${teamId}/stats`}
              className="text-slate-600 hover:text-brand"
            >
              成績
            </Link>
          </nav>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </TeamProvider>
  );
}
