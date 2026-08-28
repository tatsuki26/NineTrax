'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePlayers, useGames } from '@/lib/db';
import { Button } from '@/components/Button';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Spinner } from '@/components/Spinner';

export default function TeamHomePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { players, loading: playersLoading } = usePlayers(teamId);
  const { games, loading: gamesLoading } = useGames(teamId);

  const inProgress = games.find((g) => g.status === 'in_progress');

  return (
    <div className="flex flex-col gap-5">
      {/* 進行中の試合を大きく表示 */}
      {inProgress && (
        <Link href={`/team/${teamId}/game/${inProgress.id}`}>
          <div className="panel-night animate-pop rounded-2xl p-4 shadow-panel">
            <div className="mb-1 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-stitch/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-stitch" />
              </span>
              <span className="text-xs font-bold tracking-wide text-white/70">
                進行中の試合
              </span>
            </div>
            <p className="text-lg font-bold text-white">
              vs {inProgress.opponent || '未設定'}
            </p>
            <div className="mt-2 flex items-baseline gap-3 text-white/80">
              <span className="tnum text-3xl font-bold text-white">
                {inProgress.homeScores.reduce((a, b) => a + b, 0)}
                <span className="mx-1.5 text-lg text-white/40">-</span>
                {inProgress.awayScores.reduce((a, b) => a + b, 0)}
              </span>
              <span className="tnum text-xs">{inProgress.date}</span>
            </div>
            <p className="mt-2 text-sm font-semibold text-clay">
              タップして打席入力へ →
            </p>
          </div>
        </Link>
      )}

      <Card>
        <CardHeader
          title="試合"
          action={
            <Link href={`/team/${teamId}/games/new`}>
              <Button size="sm">＋ 作成</Button>
            </Link>
          }
        />
        <CardBody className="p-0">
          {gamesLoading ? (
            <Spinner />
          ) : games.length === 0 ? (
            <EmptyRow>まだ試合がありません</EmptyRow>
          ) : (
            <ul className="divide-y divide-line">
              {games.map((g) => {
                const h = g.homeScores.reduce((a, b) => a + b, 0);
                const a = g.awayScores.reduce((x, y) => x + y, 0);
                return (
                  <li key={g.id}>
                    <Link
                      href={`/team/${teamId}/game/${g.id}`}
                      className="flex items-center gap-3 px-4 py-3 active:bg-chalk"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink">
                          vs {g.opponent || '未設定'}
                        </p>
                        <p className="tnum mt-0.5 text-xs text-ink-faint">
                          {g.date}
                          {g.ground ? ` ・ ${g.ground}` : ''}
                        </p>
                      </div>
                      <span className="tnum shrink-0 text-sm font-bold text-ink-muted">
                        {h}-{a}
                      </span>
                      {g.status === 'finished' ? (
                        <Badge tone="neutral">終了</Badge>
                      ) : (
                        <Badge tone="clay" dot>
                          進行中
                        </Badge>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`選手 ${players.length}`}
          action={
            <Link href={`/team/${teamId}/players`}>
              <Button size="sm" variant="secondary">
                管理
              </Button>
            </Link>
          }
        />
        <CardBody>
          {playersLoading ? (
            <Spinner />
          ) : players.length === 0 ? (
            <EmptyRow>選手が登録されていません</EmptyRow>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="rounded-full border border-line bg-chalk px-2.5 py-1 text-sm text-ink-muted"
                >
                  {p.number != null && (
                    <span className="tnum mr-1 font-bold text-field">
                      {p.number}
                    </span>
                  )}
                  {p.name}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-8 text-center text-sm text-ink-faint">{children}</p>
  );
}
