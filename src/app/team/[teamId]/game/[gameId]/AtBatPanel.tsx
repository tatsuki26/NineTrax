'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AtBat, AtBatResult, Game, Player } from '@/lib/types';
import { AT_BAT_RESULTS, AT_BAT_RESULT_LABELS } from '@/lib/types';
import { useAtBats, addAtBat, updateAtBat, deleteAtBat } from '@/lib/db';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';

// 打点ステッパー（0〜4）
function RbiStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-slate-600">打点</span>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="h-9 w-9 rounded-lg border border-slate-300 text-lg text-slate-700 disabled:opacity-40"
        disabled={value <= 0}
        aria-label="打点を減らす"
      >
        −
      </button>
      <span className="w-6 text-center text-lg font-bold tabular-nums text-slate-900">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(4, value + 1))}
        className="h-9 w-9 rounded-lg border border-slate-300 text-lg text-slate-700 disabled:opacity-40"
        disabled={value >= 4}
        aria-label="打点を増やす"
      >
        ＋
      </button>
    </div>
  );
}

export function AtBatPanel({
  teamId,
  gameId,
  game,
  players,
}: {
  teamId: string;
  gameId: string;
  game: Game;
  players: Player[];
}) {
  const { atbats, loading } = useAtBats(teamId, gameId);

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );
  const lineup = game.lineup;

  // 現在の打者・打順: 状態を持たず atbats 件数から算出（仕様書 §11.1 / docs/実装分担.md §0）
  const battingIndex = lineup.length ? atbats.length % lineup.length : 0;
  const autoPlayerId = lineup[battingIndex] ?? '';
  const order = battingIndex + 1;

  // イニング: ローカルの手動送りのみ。既定は直前の打席のイニング。
  const lastInning = atbats.length ? atbats[atbats.length - 1].inning : 1;
  const [inningOverride, setInningOverride] = useState<number | null>(null);
  const inning = inningOverride ?? lastInning;

  const [manualPlayerId, setManualPlayerId] = useState<string | null>(null);
  const effectivePlayerId = manualPlayerId ?? autoPlayerId;

  const [rbi, setRbi] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AtBat | null>(null);
  const [deleting, setDeleting] = useState<AtBat | null>(null);

  async function record(result: AtBatResult) {
    if (!effectivePlayerId || busy) return;
    setBusy(true);
    try {
      await addAtBat(teamId, gameId, {
        playerId: effectivePlayerId,
        order,
        inning,
        result,
        rbi,
      });
      setRbi(0);
      setManualPlayerId(null);
      setInningOverride(null);
    } finally {
      setBusy(false);
    }
  }

  if (lineup.length === 0) {
    return (
      <div className="rounded-xl bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-slate-600">
          スタメンが設定されていません。
        </p>
        <Link
          href={`/team/${teamId}/admin`}
          className="mt-2 inline-block text-sm font-medium text-brand hover:underline"
        >
          チーム管理から設定する
        </Link>
      </div>
    );
  }

  const reversed = [...atbats].reverse();

  return (
    <div className="flex flex-col gap-4">
      {/* 現在の打者 */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500">
            {inning}回 ・ {order}番
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setInningOverride(Math.max(1, inning - 1))}
              disabled={inning <= 1}
            >
              回−
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setInningOverride(inning + 1)}
            >
              イニング送り
            </Button>
          </div>
        </div>

        <select
          value={effectivePlayerId}
          onChange={(e) => setManualPlayerId(e.target.value)}
          className="mb-3 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-bold text-slate-900"
        >
          {lineup.map((id, i) => {
            const p = playerById.get(id);
            return (
              <option key={id} value={id}>
                {i + 1}番 {p?.number != null ? `#${p.number} ` : ''}
                {p?.name ?? '(不明)'}
              </option>
            );
          })}
        </select>

        <RbiStepper value={rbi} onChange={setRbi} />
      </div>

      {/* 結果ボタン */}
      <div className="grid grid-cols-3 gap-2">
        {AT_BAT_RESULTS.map((r) => (
          <button
            key={r}
            type="button"
            disabled={busy}
            onClick={() => record(r)}
            className="h-16 rounded-xl bg-white text-base font-bold text-slate-800 shadow-sm active:scale-95 active:bg-brand/10 disabled:opacity-50"
          >
            {AT_BAT_RESULT_LABELS[r]}
          </button>
        ))}
      </div>

      {/* 打席ログ */}
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">
          打席ログ（{atbats.length}）
        </h3>
        {loading ? (
          <Spinner />
        ) : reversed.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            まだ記録がありません。
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reversed.map((a, idx) => {
              const p = playerById.get(a.playerId);
              return (
                <li
                  key={a.id}
                  className={`flex items-center gap-2 py-2 ${
                    idx === 0 ? '-mx-2 rounded-lg bg-brand/5 px-2' : ''
                  }`}
                >
                  <span className="w-12 shrink-0 text-xs tabular-nums text-slate-500">
                    {a.inning}回
                  </span>
                  <span className="min-w-0 flex-1 truncate text-slate-800">
                    {a.order}番 {p?.name ?? '(不明)'}
                    {idx === 0 && (
                      <span className="ml-2 rounded bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                        直前
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 font-medium text-slate-900">
                    {AT_BAT_RESULT_LABELS[a.result]}
                    {a.rbi > 0 && (
                      <span className="ml-1 text-xs text-slate-500">
                        {a.rbi}打点
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing(a)}
                    >
                      編集
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleting(a)}
                    >
                      削除
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <EditAtBatModal
        teamId={teamId}
        gameId={gameId}
        atbat={editing}
        onClose={() => setEditing(null)}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="この打席を削除しますか？"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              キャンセル
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (deleting) await deleteAtBat(teamId, gameId, deleting.id);
                setDeleting(null);
              }}
            >
              削除する
            </Button>
          </>
        }
      >
        <p className="text-sm">
          削除すると打順が1つ戻ります。誤入力の訂正にお使いください。
        </p>
      </Modal>
    </div>
  );
}

function EditAtBatModal({
  teamId,
  gameId,
  atbat,
  onClose,
}: {
  teamId: string;
  gameId: string;
  atbat: AtBat | null;
  onClose: () => void;
}) {
  const [result, setResult] = useState<AtBatResult>('single');
  const [rbi, setRbi] = useState(0);
  const [inning, setInning] = useState(1);
  const [busy, setBusy] = useState(false);

  // atbat が変わったら初期値を同期
  useEffect(() => {
    if (atbat) {
      setResult(atbat.result);
      setRbi(atbat.rbi);
      setInning(atbat.inning);
    }
  }, [atbat]);

  async function onSave() {
    if (!atbat) return;
    setBusy(true);
    try {
      await updateAtBat(teamId, gameId, atbat.id, { result, rbi, inning });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={atbat !== null}
      onClose={onClose}
      title="打席を修正"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            キャンセル
          </Button>
          <Button onClick={onSave} disabled={busy}>
            {busy ? '保存中…' : '保存'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            結果
          </span>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value as AtBatResult)}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
          >
            {AT_BAT_RESULTS.map((r) => (
              <option key={r} value={r}>
                {AT_BAT_RESULT_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            イニング
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={inning}
            onChange={(e) => setInning(Math.max(1, Number(e.target.value) || 1))}
            className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base"
          />
        </label>
        <RbiStepper value={rbi} onChange={setRbi} />
      </div>
    </Modal>
  );
}
