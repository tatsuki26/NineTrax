'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useGame, usePlayers, updateGame } from '@/lib/db';
import { Button } from '@/components/Button';
import { Spinner } from '@/components/Spinner';
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
      <p className="py-10 text-center text-sm text-slate-500">
        試合が見つかりません。
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold text-slate-900">
          <span className="tabular-nums text-slate-500">{game.date}</span> vs{' '}
          {game.opponent || '未設定'}
        </h1>
        {game.ground && (
          <p className="text-xs text-slate-500">{game.ground}</p>
        )}
      </div>

      <div className="flex gap-1 rounded-lg bg-slate-200 p-1">
        <button
          type="button"
          onClick={() => setTab('atbat')}
          className={`h-9 flex-1 rounded-md text-sm font-medium ${
            tab === 'atbat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          打席入力
        </button>
        <button
          type="button"
          onClick={() => setTab('score')}
          className={`h-9 flex-1 rounded-md text-sm font-medium ${
            tab === 'score' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
          }`}
        >
          スコアボード
        </button>
      </div>

      {tab === 'atbat' ? (
        <AtBatPanel
          teamId={teamId}
          gameId={gameId}
          game={game}
          players={players}
        />
      ) : (
        <Scoreboard teamId={teamId} gameId={gameId} game={game} />
      )}

      <div className="mt-2 flex justify-center">
        {game.status === 'in_progress' ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => updateGame(teamId, gameId, { status: 'finished' })}
          >
            試合を終了にする
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateGame(teamId, gameId, { status: 'in_progress' })}
          >
            試合を再開する
          </Button>
        )}
      </div>
    </div>
  );
}
