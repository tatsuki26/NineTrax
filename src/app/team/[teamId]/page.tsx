'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePlayers, useGames } from '@/lib/db';
import { useTeamContext } from '@/lib/team-context';
import { Button } from '@/components/Button';
import { Card, CardHeader, CardBody } from '@/components/Card';
import { Badge } from '@/components/Badge';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';

export default function TeamHomePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const team = useTeamContext();
  const { players, loading: playersLoading } = usePlayers(teamId);
  const { games, loading: gamesLoading } = useGames(teamId);

  const inProgress = games.find((g) => g.status === 'in_progress');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="チームホーム"
        title={team.name}
        description="試合の記録とチームの成績をここから。"
        action={
          <Link href={`/team/${teamId}/games/new`}>
            <Button>＋ 試合を作成</Button>
          </Link>
        }
      />

      {/* 進行中の試合を大きく表示 */}
      {inProgress && (
        <Link href={`/team/${teamId}/game/${inProgress.id}`} className="block">
          <div className="card-hover panel-night animate-pop rounded-2xl p-5 shadow-panel">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-stitch/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-stitch" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/60">
                進行中の試合
              </span>
            </div>
            <p className="text-lg font-bold text-white">
              vs {inProgress.opponent || '未設定'}
            </p>
            <div className="mt-2 flex items-baseline gap-3 text-white/80">
              <span className="tnum text-4xl font-bold text-white">
                {inProgress.homeScores.reduce((a, b) => a + b, 0)}
                <span className="mx-2 text-xl text-white/40">-</span>
                {inProgress.awayScores.reduce((a, b) => a + b, 0)}
              </span>
              <span className="tnum text-xs">{inProgress.date}</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-clay-light">
              タップして打席入力へ →
            </p>
          </div>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 試合一覧 */}
        <Card className="lg:col-span-3">
          <CardHeader
            title="試合"
            subtitle={games.length ? `${games.length}件` : undefined}
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
              <EmptyState
                title="まだ試合がありません"
                hint="「作成」から日付と対戦相手を入れるだけで始められます。"
                action={
                  <Link href={`/team/${teamId}/games/new`}>
                    <Button size="sm">試合を作成</Button>
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-line">
                {games.map((g) => {
                  const h = g.homeScores.reduce((a, b) => a + b, 0);
                  const a = g.awayScores.reduce((x, y) => x + y, 0);
                  return (
                    <li key={g.id}>
                      <Link
                        href={`/team/${teamId}/game/${g.id}`}
                        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-field-tint sm:px-5"
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
                        <span className="tnum shrink-0 text-base font-bold text-ink-muted">
                          {h}
                          <span className="mx-1 text-ink-faint">-</span>
                          {a}
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

        {/* 選手 */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="選手"
            subtitle={players.length ? `${players.length}名` : undefined}
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
              <EmptyState
                icon="🧢"
                title="選手が未登録です"
                hint="打順やスコアの前に、まず選手を登録しましょう。"
                action={
                  <Link href={`/team/${teamId}/players`}>
                    <Button size="sm" variant="secondary">
                      選手を登録
                    </Button>
                  </Link>
                }
              />
            ) : (
              <ul className="flex flex-wrap gap-1.5">
                {players.map((p) => (
                  <li
                    key={p.id}
                    className="rounded-full border border-line bg-chalk px-3 py-1 text-sm text-ink-muted"
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
    </div>
  );
}
