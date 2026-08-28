'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Field, TextInput } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { createTeam } from '@/lib/db';
import type { Team } from '@/lib/types';

type Phase = 'form' | 'done';

const MAX_NAME_LENGTH = 40;
const SHARE_INPUT_ID = 'new-team-share-url';

export function NewTeamButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [team, setTeam] = useState<Team | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    team && typeof window !== 'undefined'
      ? `${window.location.origin}/team/${team.id}`
      : '';

  function reset() {
    setPhase('form');
    setName('');
    setSubmitting(false);
    setError('');
    setTeam(null);
    setCopied(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('チーム名を入力してください');
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`チーム名は${MAX_NAME_LENGTH}文字以内で入力してください`);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const created = await createTeam(trimmed);
      setTeam(created);
      setPhase('done');
    } catch (e) {
      console.error(e);
      setError(
        'チームの作成に失敗しました。通信環境を確認してもう一度お試しください。',
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function copyUrl() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const el = document.getElementById(SHARE_INPUT_ID);
      if (el instanceof HTMLInputElement) el.select();
    }
  }

  return (
    <>
      <Button fullWidth size="lg" onClick={() => setOpen(true)}>
        新規チームを作成
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={phase === 'form' ? '新規チームを作成' : 'チームを作成しました'}
        footer={
          phase === 'form' ? (
            <>
              <Button variant="secondary" onClick={close} disabled={submitting}>
                キャンセル
              </Button>
              <Button onClick={submit} disabled={submitting}>
                {submitting ? '作成中…' : '作成'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={close}>
                閉じる
              </Button>
              <Button onClick={() => team && router.push(`/team/${team.id}`)}>
                チーム画面を開く
              </Button>
            </>
          )
        }
      >
        {phase === 'form' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
            className="space-y-3"
          >
            <Field
              label="チーム名"
              hint="あとからチーム管理画面で変更できます"
              error={error || undefined}
            >
              <TextInput
                autoFocus
                value={name}
                maxLength={MAX_NAME_LENGTH + 1}
                placeholder="例：多摩川ベースボールクラブ"
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
              />
            </Field>
            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              <span className="font-medium text-slate-900">{team?.name}</span> を作成しました。
            </p>
            <Field
              label="共有URL"
              hint="このURLを知っている人だけがチームにアクセスできます。メンバーに共有してください。"
            >
              <div className="flex gap-2">
                <TextInput
                  id={SHARE_INPUT_ID}
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  variant="secondary"
                  onClick={copyUrl}
                  className="shrink-0"
                >
                  {copied ? 'コピー済' : 'コピー'}
                </Button>
              </div>
            </Field>
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              パスワードはありません。URLを紛失するとチームに入れなくなります（チーム管理画面から再発行は可能です）。
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
