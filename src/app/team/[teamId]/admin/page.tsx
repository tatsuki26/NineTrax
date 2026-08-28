'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Player } from '@/lib/types';
import { useTeamContext } from '@/lib/team-context';
import {
  usePlayers,
  useGames,
  createPlayer,
  updatePlayer,
  archivePlayer,
  unarchivePlayer,
  updateTeamName,
  reissueTeamId,
  deleteGame,
} from '@/lib/db';
import { Button } from '@/components/Button';
import { Field, TextInput } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { PageHeader } from '@/components/PageHeader';

export default function TeamAdminPage() {
  const team = useTeamContext();
  const router = useRouter();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        eyebrow="チーム設定"
        title="チーム管理"
        description="チーム名・選手・試合・共有URLをまとめて管理します。"
      />
      <TeamNameSection teamId={team.id} currentName={team.name} />
      <PlayersSection teamId={team.id} />
      <GamesSection teamId={team.id} />
      <ShareUrlSection
        teamId={team.id}
        onReissued={(newId) => router.replace(`/team/${newId}/admin`)}
      />
      <div>
        <Link
          href={`/team/${team.id}/stats`}
          className="text-sm font-semibold text-field hover:underline"
        >
          成績データを確認する →
        </Link>
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-card sm:p-5">
      <h2 className="eyebrow mb-3">{title}</h2>
      {children}
    </section>
  );
}

function TeamNameSection({
  teamId,
  currentName,
}: {
  teamId: string;
  currentName: string;
}) {
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name.trim() === currentName) return;
    setBusy(true);
    try {
      await updateTeamName(teamId, name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="チーム基本情報">
      <form onSubmit={onSave} className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="チーム名">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
        </div>
        <Button type="submit" disabled={busy}>
          {busy ? '保存中…' : saved ? '保存しました' : '保存'}
        </Button>
      </form>
    </Card>
  );
}

function PlayersSection({ teamId }: { teamId: string }) {
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
    <Card title="選手管理">
      <form onSubmit={onAdd} className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <Field label="名前">
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
        </div>
        <div className="w-24">
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

      {loading ? (
        <Spinner />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {active.map((p) => (
              <PlayerRow key={p.id} teamId={teamId} player={p} />
            ))}
            {active.length === 0 && (
              <li className="py-4 text-center text-sm text-ink-faint">
                選手が登録されていません。
              </li>
            )}
          </ul>

          {archived.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-ink-faint">
                削除済みの選手（{archived.length}）
              </summary>
              <ul className="mt-2 divide-y divide-line">
                {archived.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2 text-sm text-ink-faint"
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
    </Card>
  );
}

function PlayerRow({ teamId, player }: { teamId: string; player: Player }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [number, setNumber] = useState(
    player.number != null ? String(player.number) : '',
  );
  const [confirmArchive, setConfirmArchive] = useState(false);

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
          className="w-20"
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
      <span className="text-ink">
        {player.number != null && (
          <span className="mr-2 tabular-nums text-ink-faint">
            #{player.number}
          </span>
        )}
        {player.name}
      </span>
      <span className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          編集
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmArchive(true)}
        >
          削除
        </Button>
      </span>

      <Modal
        open={confirmArchive}
        onClose={() => setConfirmArchive(false)}
        title="選手を削除しますか？"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmArchive(false)}
            >
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await archivePlayer(teamId, player.id);
                setConfirmArchive(false);
              }}
            >
              削除する
            </Button>
          </>
        }
      >
        <p className="text-sm">
          「{player.name}」を一覧から削除します。過去の試合の打席記録と成績は残ります。
        </p>
      </Modal>
    </li>
  );
}

function GamesSection({ teamId }: { teamId: string }) {
  const { games, loading } = useGames(teamId);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  return (
    <Card title="試合一覧">
      {loading ? (
        <Spinner />
      ) : games.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-faint">
          試合がありません。
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {games.map((g) => (
            <li key={g.id} className="flex items-center justify-between py-2">
              <Link
                href={`/team/${teamId}/game/${g.id}`}
                className="min-w-0 flex-1 truncate text-ink hover:text-field"
              >
                <span className="tabular-nums text-ink-faint">{g.date}</span>{' '}
                vs {g.opponent || '未設定'}
                {g.status === 'finished' && (
                  <span className="ml-2 rounded bg-chalk px-1.5 py-0.5 text-xs text-ink-faint">
                    終了
                  </span>
                )}
              </Link>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setDeleteTarget({
                    id: g.id,
                    label: `${g.date} vs ${g.opponent || '未設定'}`,
                  })
                }
              >
                削除
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="試合を削除しますか？"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (deleteTarget) await deleteGame(teamId, deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              削除する
            </Button>
          </>
        }
      >
        <p className="text-sm">
          「{deleteTarget?.label}」の打席記録も含めて削除されます。取り消せません。
        </p>
      </Modal>
    </Card>
  );
}

function ShareUrlSection({
  teamId,
  onReissued,
}: {
  teamId: string;
  onReissued: (newId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const url =
    typeof window !== 'undefined'
      ? `${window.location.origin}/team/${teamId}`
      : `/team/${teamId}`;

  async function onReissue() {
    setBusy(true);
    try {
      const newId = await reissueTeamId(teamId);
      setConfirming(false);
      onReissued(newId);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="共有URL（チームID）">
      <p className="mb-2 break-all rounded-lg bg-chalk p-3 text-sm text-ink-muted">
        {url}
      </p>
      <p className="mb-3 text-xs text-ink-faint">
        このURLを知っている人は誰でもチームの記録を閲覧・入力できます。
        漏れた場合は再発行してください（古いURLは使えなくなります）。
      </p>
      <Button variant="secondary" onClick={() => setConfirming(true)}>
        チームIDを再発行
      </Button>

      <Modal
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title="チームIDを再発行しますか？"
        footer={
          <>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              キャンセル
            </Button>
            <Button variant="danger" disabled={busy} onClick={onReissue}>
              {busy ? '再発行中…' : '再発行する'}
            </Button>
          </>
        }
      >
        <p className="text-sm">
          新しい共有URLが発行され、<strong>今のURLは即座に使えなくなります</strong>。
          チームメンバーへ新しいURLを配り直す必要があります。
          選手・試合・打席記録は引き継がれます。
        </p>
      </Modal>
    </Card>
  );
}
