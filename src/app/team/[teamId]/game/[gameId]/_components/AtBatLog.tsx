'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { ConfirmDialog } from '@/components/Modal';
import { deleteAtBat } from '@/lib/db/atbats';
import { AT_BAT_RESULT_LABELS } from '@/lib/types';
import type { AtBat, Player } from '@/lib/types';
import { EditAtBatModal } from './EditAtBatModal';

export function AtBatLog({
  teamId,
  gameId,
  atbats,
  players,
}: {
  teamId: string;
  gameId: string;
  atbats: AtBat[];
  players: Player[];
}) {
  // createdAt 昇順で渡ってくる → 新しい順に表示
  const reversed = [...atbats].reverse();
  const latest = reversed[0];

  const [editing, setEditing] = useState<AtBat | null>(null);
  const [toDelete, setToDelete] = useState<AtBat | null>(null);

  const nameOf = (id: string) =>
    players.find((p) => p.id === id)?.name ?? '不明な選手';

  if (atbats.length === 0) {
    return (
      <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
        まだ打席記録がありません。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* 直前の記録 */}
      {latest && (
        <div className="rounded-lg border-2 border-brand bg-brand/5 p-3">
          <p className="text-xs font-bold text-brand">直前の記録</p>
          <div className="mt-1 flex items-center justify-between">
            <div className="text-sm">
              <span className="font-semibold">{nameOf(latest.playerId)}</span>
              <span className="ml-2">{AT_BAT_RESULT_LABELS[latest.result]}</span>
              <span className="ml-2 text-xs text-slate-500">
                {latest.inning}回 ／ {latest.order}番 ／ 打点{latest.rbi}
              </span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(latest)}>
                編集
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setToDelete(latest)}>
                <span className="text-red-600">削除</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 全ログ */}
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {reversed.map((ab, i) => (
          <li key={ab.id} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="w-10 shrink-0 text-xs text-slate-400">
              {reversed.length - i}
            </span>
            <span className="flex-1">
              <span className="font-medium">{nameOf(ab.playerId)}</span>
              <span className="ml-2">{AT_BAT_RESULT_LABELS[ab.result]}</span>
            </span>
            <span className="shrink-0 text-xs text-slate-400">
              {ab.inning}回・{ab.order}番・点{ab.rbi}
            </span>
            <Button variant="ghost" size="sm" onClick={() => setEditing(ab)}>
              編集
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setToDelete(ab)}>
              <span className="text-red-600">削除</span>
            </Button>
          </li>
        ))}
      </ul>

      {editing && (
        <EditAtBatModal
          teamId={teamId}
          gameId={gameId}
          atbat={editing}
          players={players}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) deleteAtBat(teamId, gameId, toDelete.id);
        }}
        title="打席記録を削除"
        message="この打席記録を削除します。よろしいですか？（打順は1つ戻ります）"
      />
    </div>
  );
}
