'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { Field, TextInput } from '@/components/Field';
import { ConfirmDialog, Modal } from '@/components/Modal';
import { usePlayers } from '@/lib/db/hooks';
import { archivePlayer, createPlayer, updatePlayer } from '@/lib/db/players';
import type { Player } from '@/lib/types';

export default function PlayersPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { players, loading } = usePlayers(teamId);

  const [editing, setEditing] = useState<Player | 'new' | null>(null);
  const [toArchive, setToArchive] = useState<Player | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold">選手管理</h2>
        <Button size="sm" onClick={() => setEditing('new')}>
          ＋ 追加
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">読み込み中…</p>
      ) : players.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
          選手がいません。「追加」から登録してください。
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {players.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                {p.number ?? '-'}
              </span>
              <span className="flex-1 text-sm">{p.name}</span>
              <Button variant="ghost" size="sm" onClick={() => setEditing(p)}>
                編集
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setToArchive(p)}>
                <span className="text-red-600">削除</span>
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-slate-400">
        削除は論理削除です。過去試合の打席記録と成績は保持されます。
      </p>

      {editing && (
        <PlayerFormModal
          teamId={teamId}
          player={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={toArchive !== null}
        onClose={() => setToArchive(null)}
        onConfirm={() => {
          if (toArchive) archivePlayer(teamId, toArchive.id);
        }}
        title="選手を削除"
        message={`${toArchive?.name ?? ''} を一覧から削除します（論理削除）。よろしいですか？`}
      />
    </div>
  );
}

function PlayerFormModal({
  teamId,
  player,
  onClose,
}: {
  teamId: string;
  player: Player | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(player?.name ?? '');
  const [number, setNumber] = useState(player?.number != null ? String(player.number) : '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('名前を入力してください');
      return;
    }
    const num = number.trim() === '' ? null : Number(number);
    if (num !== null && (!Number.isInteger(num) || num < 0)) {
      setError('背番号は0以上の整数で入力してください');
      return;
    }
    setSaving(true);
    if (player) {
      await updatePlayer(teamId, player.id, { name: trimmed, number: num });
    } else {
      await createPlayer(teamId, { name: trimmed, number: num });
    }
    setSaving(false);
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={player ? '選手を編集' : '選手を追加'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={submit} disabled={saving}>
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="名前" error={error && !name.trim() ? error : undefined}>
          <TextInput
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田"
            autoFocus
          />
        </Field>
        <Field label="背番号（任意）" error={error && name.trim() ? error : undefined}>
          <TextInput
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            inputMode="numeric"
            placeholder="7"
          />
        </Field>
      </div>
    </Modal>
  );
}
