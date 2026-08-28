'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Field, TextInput } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { TeamAvatar } from '@/components/TeamAvatar';
import { createTeam } from '@/lib/db';
import { DEFAULT_TEAM_COLOR, TEAM_COLORS } from '@/lib/team-colors';
import { fileToSquareDataUrl } from '@/lib/image';
import type { Team } from '@/lib/types';

type Phase = 'form' | 'done';

const MAX_NAME_LENGTH = 40;
const SHARE_INPUT_ID = 'new-team-share-url';

export function NewTeamButton() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_TEAM_COLOR);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
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
    setColor(DEFAULT_TEAM_COLOR);
    setLogoUrl(null);
    setLogoBusy(false);
    setSubmitting(false);
    setError('');
    setTeam(null);
    setCopied(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  async function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // 同じファイルを再選択できるようにクリア
    if (!file) return;
    setError('');
    setLogoBusy(true);
    try {
      const { dataUrl } = await fileToSquareDataUrl(file);
      setLogoUrl(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ロゴの読み込みに失敗しました');
    } finally {
      setLogoBusy(false);
    }
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
      const created = await createTeam(trimmed, { color, logoUrl });
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
              <Button onClick={submit} disabled={submitting || logoBusy}>
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
            className="space-y-4"
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

            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                ロゴ / チームカラー
              </span>
              <div className="flex items-start gap-3">
                <TeamAvatar
                  name={name || '⚾'}
                  color={color}
                  logoUrl={logoUrl}
                  size={56}
                />
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={submitting || logoBusy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {logoBusy
                        ? '処理中…'
                        : logoUrl
                          ? 'ロゴを変更'
                          : 'ロゴ画像を選択'}
                    </Button>
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={submitting}
                        onClick={() => setLogoUrl(null)}
                      >
                        ロゴを削除
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    ロゴ未設定の場合は、下のチームカラー＋頭文字を表示します。
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onPickLogo}
              />

              <div className="mt-3 flex flex-wrap gap-2">
                {TEAM_COLORS.map((c) => {
                  const selected = c.value === color && !logoUrl;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      title={c.label}
                      aria-label={`チームカラー: ${c.label}`}
                      aria-pressed={selected}
                      onClick={() => setColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={
                        'h-8 w-8 rounded-full transition-transform ' +
                        (selected
                          ? 'ring-2 ring-slate-900 ring-offset-2'
                          : 'hover:scale-110')
                      }
                    />
                  );
                })}
              </div>
              {logoUrl && (
                <p className="mt-2 text-xs text-slate-400">
                  ※ 現在はロゴを表示中。カラーはロゴ削除時の予備として保存されます。
                </p>
              )}
            </div>

            <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {team && (
                <TeamAvatar
                  name={team.name}
                  color={team.color}
                  logoUrl={team.logoUrl}
                  size={44}
                />
              )}
              <p className="text-sm">
                <span className="font-medium text-slate-900">{team?.name}</span>{' '}
                を作成しました。
              </p>
            </div>
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
