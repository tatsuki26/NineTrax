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
      <h1 className="text-xl font-bold tracking-tight text-ink">選手管理</h1>

      <form
        onSubmit={onAdd}
        className="flex items-end gap-2 rounded-2xl border border-line bg-white p-4 shadow-card"
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

      <div className="rounded-2xl border border-line bg-white p-2 shadow-card">
        {loading ? (
          <Spinner />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {active.map((p) => (
                <PlayerRow key={p.id} teamId={teamId} player={p} />
              ))}
              {active.length === 0 && (
                <li className="py-8 text-center text-sm text-ink-faint">
                  選手がいません。
                </li>
              )}
            </ul>

            {archived.length > 0 && (
              <details className="mt-1 px-2 pb-1">
                <summary className="cursor-pointer py-2 text-sm text-ink-faint">
                  削除済み（{archived.length}）
                </summary>
                <ul className="divide-y divide-line">
                  {archived.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between py-2 text-sm text-ink-faint"
                    >
                      <span>
                        {p.number != null && (
                          <span className="tnum mr-2">#{p.number}</span>
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
      <li className="flex items-center gap-2 px-2 py-2">
        <TextInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 flex-1"
        />
        <TextInput
          type="number"
          inputMode="numeric"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          className="h-10 w-16"
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
    <li className="flex items-center justify-between px-2 py-2.5">
      <span className="text-ink">
        {player.number != null && (
          <span className="tnum mr-2 font-bold text-field">
            {player.number}
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
