'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Team } from '@/lib/types';
import { useAdminAuth, signOutAdmin } from '@/lib/auth';
import { createTeam } from '@/lib/db';
import {
  listAllTeams,
  countAllGames,
  countActiveTeams,
  deleteTeam,
} from '@/lib/db/admin';
import { Button } from '@/components/Button';
import { Field, TextInput } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { TeamAvatar } from '@/components/TeamAvatar';
import { NineTraxLogo } from '@/components/Logo';

function shareUrl(teamId: string): string {
  if (typeof window === 'undefined') return `/team/${teamId}`;
  return `${window.location.origin}/team/${teamId}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const auth = useAdminAuth();

  const [teams, setTeams] = useState<Team[]>([]);
  const [gameCount, setGameCount] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Team | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, g, a] = await Promise.all([
        listAllTeams(),
        countAllGames().catch(() => null),
        countActiveTeams().catch(() => null),
      ]);
      setTeams(t);
      setGameCount(g);
      setActiveCount(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth.status === 'admin') void refresh();
  }, [auth.status, refresh]);

  if (auth.status === 'loading') {
    return <Spinner label="認証を確認中…" />;
  }

  if (auth.status === 'signed-out') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-ink-muted">ログインが必要です。</p>
        <Link href="/admin/login" className="font-medium text-field hover:underline">
          ログインページへ
        </Link>
      </main>
    );
  }

  if (auth.status === 'not-admin') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-ink-muted">
          このアカウントには管理者権限がありません。
        </p>
        <Button
          variant="secondary"
          onClick={async () => {
            await signOutAdmin();
            router.replace('/admin/login');
          }}
        >
          ログアウト
        </Button>
      </main>
    );
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      await createTeam(name);
      setNewName('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チーム作成に失敗しました');
    } finally {
      setCreating(false);
    }
  }

  async function onConfirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setError(null);
    try {
      await deleteTeam(target.id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'チーム削除に失敗しました');
    }
  }

  return (
    <main className="mx-auto max-w-4xl p-6 lg:p-10">
      <div className="mb-6">
        <NineTraxLogo variant="dark" size={24} wordmarkClassName="text-[15px]" />
      </div>
      <PageHeader
        eyebrow="運営"
        title="アプリ管理"
        description="全チームの状況確認と、チームの作成・削除。"
        action={
          <Button
            variant="secondary"
            size="sm"
            onClick={async () => {
              await signOutAdmin();
              router.replace('/admin/login');
            }}
          >
            ログアウト
          </Button>
        }
      />

      {error && (
        <p className="mt-6 rounded-xl border border-stitch/20 bg-stitch/8 p-3 text-sm font-medium text-stitch-dark">
          {error}
        </p>
      )}

      <section className="mt-6 grid grid-cols-3 gap-3">
        <Stat label="チーム数" value={teams.length} />
        <Stat label="アクティブ（60日）" value={activeCount} />
        <Stat label="総試合数" value={gameCount} />
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="eyebrow mb-3">チームを作成</h2>
        <form onSubmit={onCreate} className="flex items-end gap-2">
          <div className="flex-1">
            <Field label="チーム名">
              <TextInput
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="◯◯ベースボールクラブ"
                required
              />
            </Field>
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? '作成中…' : '作成'}
          </Button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-line bg-white p-5 shadow-card">
        <h2 className="eyebrow mb-3">チーム一覧</h2>
        {loading ? (
          <Spinner />
        ) : teams.length === 0 ? (
          <EmptyState title="まだチームがありません" />
        ) : (
          <ul className="divide-y divide-line">
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-field-tint"
              >
                <TeamAvatar
                  name={team.name}
                  color={team.color}
                  logoUrl={team.logoUrl}
                  size={36}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{team.name}</p>
                  <p className="mt-0.5 truncate text-xs text-ink-faint">
                    <Link
                      href={`/team/${team.id}`}
                      className="hover:text-field hover:underline"
                    >
                      {shareUrl(team.id)}
                    </Link>
                  </p>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setDeleteTarget(team)}
                >
                  削除
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="チームを削除しますか？"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              キャンセル
            </Button>
            <Button variant="danger" onClick={onConfirmDelete}>
              削除する
            </Button>
          </>
        }
      >
        <p className="text-sm">
          「{deleteTarget?.name}」の選手・試合・打席記録がすべて削除されます。
          この操作は取り消せません。
        </p>
      </Modal>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 text-center shadow-card sm:p-5">
      <p className="tnum text-3xl font-bold text-field">{value ?? '—'}</p>
      <p className="mt-1 text-xs font-medium text-ink-faint">{label}</p>
    </div>
  );
}
