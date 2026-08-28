'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { useGames, usePlayers } from '@/lib/db/hooks';

export default function TeamHome() {
  const { teamId } = useParams<{ teamId: string }>();
  const { players, loading: playersLoading } = usePlayers(teamId);
  const { games, loading: gamesLoading } = useGames(teamId);
  const base = `/team/${teamId}`;

  return (
    <div className="space-y-6">
      {/* 選手一覧 */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">選手（{players.length}人）</h2>
          <Link href={`${base}/players`} className="text-sm text-brand underline">
            管理
          </Link>
        </div>
        <div className="mt-2 rounded-lg border border-slate-200 bg-white">
          {playersLoading ? (
            <p className="p-3 text-sm text-slate-500">読み込み中…</p>
          ) : players.length === 0 ? (
            <p className="p-3 text-sm text-slate-500">
              選手が未登録です。「管理」から追加してください。
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {players.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {p.number ?? '-'}
                  </span>
                  <span className="text-sm">{p.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 試合一覧 */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">試合</h2>
          <Link href={`${base}/games/new`}>
            <Button size="sm">＋ 試合を作成</Button>
          </Link>
        </div>
        <div className="mt-2 space-y-2">
          {gamesLoading ? (
            <p className="text-sm text-slate-500">読み込み中…</p>
          ) : games.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
              まだ試合がありません。
            </p>
          ) : (
            games.map((g) => (
              <Link
                key={g.id}
                href={`${base}/game/${g.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">vs {g.opponent || '未設定'}</span>
                  <span
                    className={
                      'rounded px-1.5 py-0.5 text-xs ' +
                      (g.status === 'finished'
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-green-100 text-green-700')
                    }
                  >
                    {g.status === 'finished' ? '終了' : '進行中'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {g.date} ／ {g.ground || '球場未設定'} ／ {g.season}年
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {sum(g.homeScores)} - {sum(g.awayScores)}
                </p>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + (b || 0), 0);
}
