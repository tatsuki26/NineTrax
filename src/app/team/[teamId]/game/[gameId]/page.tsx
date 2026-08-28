'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useGame, usePlayers, updateGame } from '@/lib/db';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { AtBatPanel } from './AtBatPanel';
import { Scoreboard } from './Scoreboard';

type Tab = 'atbat' | 'score';

export default function GamePage() {
  const { teamId, gameId } = useParams<{ teamId: string; gameId: string }>();
  const { game, loading } = useGame(teamId, gameId);
  const { players } = usePlayers(teamId, { includeArchived: true });
  const [tab, setTab] = useState<Tab>('atbat');

  if (loading) return <Spinner label="試合を読み込み中…" />;
  if (!game) {
    return (
      <EmptyState
        title="試合が見つかりません"
        hint="削除されたか、URLが正しくない可能性があります。"
        action={
          <Link href={`/team/${teamId}`}>
            <Button size="sm" variant="secondary">
              チームホームへ
            </Button>
          </Link>
        }
      />
    );
  }

  const home = game.homeScores.reduce((a, b) => a + b, 0);
  const away = game.awayScores.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* スコアヘッダー */}
      <div className="panel-night rounded-2xl px-5 py-4 shadow-panel">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">
              vs {game.opponent || '未設定'}
            </p>
            <p className="tnum mt-0.5 text-xs text-white/50">
              {game.date}
              {game.ground ? ` ・ ${game.ground}` : ''}
            </p>
          </div>
          {game.status === 'finished' ? (
            <Badge tone="neutral" className="bg-white/15 text-white/80">
              終了
            </Badge>
          ) : (
            <Badge tone="clay" dot className="bg-clay/20 text-clay-light">
              進行中
            </Badge>
          )}
        </div>
        <div className="mt-3 flex items-end gap-4">
          <ScoreCol label="自チーム" value={home} lead={home > away} />
          <span className="pb-1 text-lg font-bold text-white/30">-</span>
          <ScoreCol label="相手" value={away} lead={away > home} />
        </div>
      </div>

      {/* スマホ: セグメントコントロールで切り替え */}
      <div className="flex gap-1 rounded-xl border border-line bg-white p-1 lg:hidden">
        {(
          [
            ['atbat', '打席入力'],
            ['score', 'スコアボード'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`h-10 flex-1 rounded-lg text-sm font-bold transition-colors ${
              tab === key
                ? 'bg-field text-white shadow-sm'
                : 'text-ink-faint active:bg-chalk'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* スマホ: 選択中パネル / PC: 左右2カラム */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-6">
        <div className={tab === 'atbat' ? '' : 'hidden lg:block'}>
          <AtBatPanel
            teamId={teamId}
            gameId={gameId}
            game={game}
            players={players}
          />
        </div>
        <div className={tab === 'score' ? '' : 'hidden lg:block'}>
          <div className="lg:sticky lg:top-6">
            <Scoreboard teamId={teamId} gameId={gameId} game={game} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Link
          href={`/team/${teamId}/stats`}
          className="text-sm font-semibold text-field hover:underline"
        >
          成績を見る →
        </Link>
        {game.status === 'in_progress' ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateGame(teamId, gameId, { status: 'finished' })}
          >
            試合を終了
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateGame(teamId, gameId, { status: 'in_progress' })}
          >
            試合を再開
          </Button>
        )}
      </div>
    </div>
  );
}

function ScoreCol({
  label,
  value,
  lead,
}: {
  label: string;
  value: number;
  lead: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-white/50">{label}</p>
      <p
        className={`tnum text-4xl font-bold leading-none ${
          lead ? 'text-white' : 'text-white/60'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
