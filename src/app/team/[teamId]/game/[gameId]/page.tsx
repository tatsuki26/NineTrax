'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { useAtBats, useGame, usePlayers } from '@/lib/db/hooks';
import { addAtBat } from '@/lib/db/atbats';
import { updateGame } from '@/lib/db/games';
import { AT_BAT_RESULT_LABELS, AT_BAT_RESULT_ORDER } from '@/lib/types';
import { AtBatLog } from './_components/AtBatLog';
import { RbiStepper } from './_components/RbiStepper';
import { Scoreboard } from './_components/Scoreboard';

type Tab = 'atbat' | 'score';

export default function GamePage() {
  const { teamId, gameId } = useParams<{ teamId: string; gameId: string }>();
  const { game, loading: gameLoading } = useGame(teamId, gameId);
  const { atbats } = useAtBats(teamId, gameId);
  const { players } = usePlayers(teamId, { includeArchived: true });

  const [tab, setTab] = useState<Tab>('atbat');
  const [inning, setInning] = useState(1);
  const [rbi, setRbi] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // 他端末で先のイニングが記録されたら、現在イニングを引き上げる（下げはしない）
  useEffect(() => {
    if (atbats.length === 0) return;
    const maxInning = atbats.reduce((m, a) => Math.max(m, a.inning), 1);
    setInning((cur) => (maxInning > cur ? maxInning : cur));
  }, [atbats]);

  const lineup = game?.lineup ?? [];
  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );

  const batterIndex = lineup.length > 0 ? atbats.length % lineup.length : 0;
  const currentOrder = batterIndex + 1;
  const currentPlayerId = lineup[batterIndex];
  const currentPlayer = currentPlayerId ? playerMap.get(currentPlayerId) : undefined;

  const record = async (result: (typeof AT_BAT_RESULT_ORDER)[number]) => {
    if (!currentPlayerId || submitting) return;
    setSubmitting(true);
    try {
      await addAtBat(teamId, gameId, {
        playerId: currentPlayerId,
        order: currentOrder,
        inning,
        result,
        rbi,
      });
      setRbi(0);
    } finally {
      setSubmitting(false);
    }
  };

  if (gameLoading) {
    return <p className="text-sm text-slate-500">読み込み中…</p>;
  }
  if (!game) {
    return (
      <div className="space-y-2 text-center">
        <p className="text-sm font-bold">試合が見つかりません</p>
        <Link href={`/team/${teamId}`} className="text-sm text-brand underline">
          ホームへ
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">vs {game.opponent || '未設定'}</h2>
          <p className="text-xs text-slate-500">
            {game.date} ／ {game.ground || '球場未設定'} ／ {game.season}年
          </p>
        </div>
        <Button
          variant={game.status === 'finished' ? 'secondary' : 'primary'}
          size="sm"
          onClick={() =>
            updateGame(teamId, gameId, {
              status: game.status === 'finished' ? 'in_progress' : 'finished',
            })
          }
        >
          {game.status === 'finished' ? '再開' : '試合終了'}
        </Button>
      </div>

      {/* タブ */}
      <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm font-medium">
        <button
          className={
            'flex-1 rounded-md py-1.5 ' +
            (tab === 'atbat' ? 'bg-brand text-white' : 'text-slate-500')
          }
          onClick={() => setTab('atbat')}
        >
          打席入力
        </button>
        <button
          className={
            'flex-1 rounded-md py-1.5 ' +
            (tab === 'score' ? 'bg-brand text-white' : 'text-slate-500')
          }
          onClick={() => setTab('score')}
        >
          スコアボード
        </button>
      </div>

      {tab === 'score' ? (
        <Scoreboard teamId={teamId} game={game} />
      ) : (
        <>
          {lineup.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
              打順が設定されていません。
            </p>
          ) : (
            <>
              {/* 現在の打者・イニング */}
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
                <div>
                  <p className="text-xs text-slate-500">現在の打者</p>
                  <p className="text-lg font-bold">
                    <span className="mr-2 text-sm text-slate-400">{currentOrder}番</span>
                    {currentPlayer?.name ?? '（不明）'}
                    {currentPlayer?.number != null && (
                      <span className="ml-1 text-sm text-slate-400">
                        #{currentPlayer.number}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">イニング</p>
                    <p className="text-lg font-bold">{inning}回</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setInning((i) => i + 1)}>
                    イニング送り
                  </Button>
                </div>
              </div>

              {/* 打点 */}
              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <span className="text-sm font-medium text-slate-700">打点</span>
                <RbiStepper value={rbi} onChange={setRbi} />
              </div>

              {/* 結果ボタン */}
              <div className="grid grid-cols-3 gap-2">
                {AT_BAT_RESULT_ORDER.map((r) => (
                  <button
                    key={r}
                    disabled={submitting}
                    onClick={() => record(r)}
                    className="rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold active:bg-brand active:text-white disabled:opacity-50"
                  >
                    {AT_BAT_RESULT_LABELS[r]}
                  </button>
                ))}
              </div>

              <p className="text-xs text-slate-400">
                結果をタップすると記録し、打順が自動で次に進みます。打点は記録後に0へ戻ります。
              </p>

              {/* ログ */}
              <div>
                <h3 className="mb-2 text-sm font-bold">打席ログ（{atbats.length}）</h3>
                <AtBatLog
                  teamId={teamId}
                  gameId={gameId}
                  atbats={atbats}
                  players={players}
                />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
