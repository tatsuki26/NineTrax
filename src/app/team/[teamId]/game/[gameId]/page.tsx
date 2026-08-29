'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useGame, usePlayers, updateGame } from '@/lib/db';
import { Button } from '@/components/Button';
import { Badge } from '@/components/Badge';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { AtBatPanel } from './AtBatPanel';

export default function GamePage() {
  const { teamId, gameId } = useParams<{ teamId: string; gameId: string }>();
  const { game, loading } = useGame(teamId, gameId);
  const { players } = usePlayers(teamId, { includeArchived: true });

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

  const sideLabel =
    game.ourSide === 'first' ? '先攻' : game.ourSide === 'second' ? '後攻' : null;
  const needsSide = game.ourSide == null && game.status === 'in_progress';

  return (
    <div className="flex flex-col gap-4">
      {/* 見出し */}
      <div className="panel-night rounded-2xl px-5 py-3.5 shadow-panel">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-white">
              vs {game.opponent || '未設定'}
            </p>
            <p className="tnum mt-0.5 text-xs text-white/50">
              {game.date}
              {game.ground ? ` ・ ${game.ground}` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {sideLabel && (
              <Badge tone="neutral" className="bg-white/15 text-white/80">
                {sideLabel}
              </Badge>
            )}
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
        </div>
      </div>

      {needsSide ? (
        <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-card">
          <p className="text-sm font-bold text-ink">
            自チームは先攻ですか？後攻ですか？
          </p>
          <p className="mt-1 text-xs text-ink-faint">
            打席を入力する前に選んでください（スコアボードの並び順に使います）。
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Button
              size="lg"
              onClick={() => updateGame(teamId, gameId, { ourSide: 'first' })}
            >
              先攻（表）
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => updateGame(teamId, gameId, { ourSide: 'second' })}
            >
              後攻（裏）
            </Button>
          </div>
        </div>
      ) : (
        <AtBatPanel
          teamId={teamId}
          gameId={gameId}
          game={game}
          players={players}
        />
      )}

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
