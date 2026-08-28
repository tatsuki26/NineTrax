'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTeamContext } from '@/lib/team-context';
import { usePlayers, useGames } from '@/lib/db';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';

export default function TeamHomePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const team = useTeamContext();
  const { players, loading: playersLoading } = usePlayers(teamId);
  const { games, loading: gamesLoading } = useGames(teamId);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">試合</h2>
          <Link href={`/team/${teamId}/games/new`}>
            <Button size="sm">試合を作成</Button>
          </Link>
        </div>
        {gamesLoading ? (
          <Spinner />
        ) : games.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            まだ試合がありません。
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {games.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/team/${teamId}/game/${g.id}`}
                  className="flex items-center justify-between py-3"
                >
                  <span className="min-w-0 truncate text-slate-800">
                    <span className="tabular-nums text-slate-500">{g.date}</span>{' '}
                    vs {g.opponent || '未設定'}
                  </span>
                  {g.status === 'finished' ? (
                    <span className="ml-2 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      終了
                    </span>
                  ) : (
                    <span className="ml-2 shrink-0 rounded bg-brand/10 px-1.5 py-0.5 text-xs text-brand">
                      進行中
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">
            選手（{players.length}）
          </h2>
          <Link href={`/team/${teamId}/players`}>
            <Button size="sm" variant="secondary">
              選手を管理
            </Button>
          </Link>
        </div>
        {playersLoading ? (
          <Spinner />
        ) : players.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            選手が登録されていません。
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {players.map((p) => (
              <li
                key={p.id}
                className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
              >
                {p.number != null && (
                  <span className="mr-1 tabular-nums text-slate-500">
                    #{p.number}
                  </span>
                )}
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex justify-between text-sm">
        <Link
          href={`/team/${teamId}/stats`}
          className="font-medium text-brand hover:underline"
        >
          個人成績を見る →
        </Link>
        <Link
          href={`/team/${teamId}/admin`}
          className="text-slate-500 hover:underline"
        >
          チーム管理
        </Link>
      </div>

      <p className="text-center text-xs text-slate-400">{team.name}</p>
    </div>
  );
}
