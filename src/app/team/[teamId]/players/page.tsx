'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import type { Player } from '@/lib/types';
import {
  usePlayers,
  createPlayer,
  updatePlayer,
  archivePlayer,
  unarchivePlayer,
} from '@/lib/db';
import { Button } from '@/components/Button';
import { Field, TextInput } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';

export default function PlayersPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { players, loading } = usePlayers(teamId, { includeArchived: true });

  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [busy, setBusy] = useState(false);

  const active = players.filter((p) => !p.archived);
  const archived = players.filter((p) => p.archived);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createPlayer(teamId, {
        name: name.trim(),
        number: number.trim() === '' ? null : Number(number),
      });
      setName('');
      setNumber('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-lg font-bold text-slate-900">選手管理</h1>

      <form
        onSubmit={onAdd}
        className="flex items-end gap-2 rounded-xl bg-white p-4 shadow-sm"
      >
        <div className="flex-1">
          <Field label="名前">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="山田 太郎"
            />
          </Field>
        </div>
        <div className="w-20">
          <Field label="背番号">
            <TextInput
              type="number"
              inputMode="numeric"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </Field>
        </div>
        <Button type="submit" disabled={busy}>
          追加
        </Button>
      </form>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <ul className="divide-y divide-slate-100">
              {active.map((p) => (
                <PlayerRow key={p.id} teamId={teamId} player={p} />
              ))}
              {active.length === 0 && (
                <li className="py-4 text-center text-sm text-slate-500">
                  選手がいません。
                </li>
              )}
            </ul>

            {archived.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-slate-500">
                  削除済み（{archived.length}）
                </summary>
                <ul className="mt-2 divide-y divide-slate-100">
                  {archived.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between py-2 text-sm text-slate-500"
                    >
                      <span>
                        {p.number != null && (
                          <span className="mr-2 tabular-nums">#{p.number}</span>
                        )}
                        {p.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => unarchivePlayer(teamId, p.id)}
                      >
                        復元
                      </Button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PlayerRow({ teamId, player }: { teamId: string; player: Player }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [number, setNumber] = useState(
    player.number != null ? String(player.number) : '',
  );
  const [confirm, setConfirm] = useState(false);

  async function onSave() {
    await updatePlayer(teamId, player.id, {
      name: name.trim() || player.name,
      number: number.trim() === '' ? null : Number(number),
    });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 py-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <TextInput
          type="number"
          inputMode="numeric"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="w-16"
        />
        <Button size="sm" onClick={onSave}>
          保存
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
          取消
        </Button>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between py-2">
      <span className="text-slate-800">
        {player.number != null && (
          <span className="mr-2 tabular-nums text-slate-500">
            #{player.number}
          </span>
        )}
        {player.name}
      </span>
      <span className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          編集
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(true)}>
          削除
        </Button>
      </span>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="選手を削除しますか？"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirm(false)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await archivePlayer(teamId, player.id);
                setConfirm(false);
              }}
            >
              削除する
            </Button>
          </>
        }
      >
        <p className="text-sm">
          「{player.name}」を一覧から外します。過去の打席記録・成績は残ります。
        </p>
      </Modal>
    </li>
  );
}
