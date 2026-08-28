'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { AtBat, AtBatResult, Game, Player } from '@/lib/types';
import { AT_BAT_RESULTS, AT_BAT_RESULT_LABELS } from '@/lib/types';
import { useAtBats, addAtBat, updateAtBat, deleteAtBat } from '@/lib/db';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';

// 打席結果のカテゴリ（配色・ログのドット色に使う）
type Cat = 'hit' | 'onbase' | 'out' | 'sac' | 'error';
const RESULT_CAT: Record<AtBatResult, Cat> = {
  single: 'hit',
  double: 'hit',
  triple: 'hit',
  homerun: 'hit',
  walk: 'onbase',
  hitByPitch: 'onbase',
  sacBunt: 'sac',
  sacFly: 'sac',
  reachedOnError: 'error',
  out: 'out',
  strikeout: 'out',
};
const CAT_BTN: Record<Cat, string> = {
  hit: 'bg-field text-white border-field-dark/30',
  onbase: 'bg-night-700 text-white border-night/40',
  out: 'bg-white text-ink-muted border-line',
  sac: 'bg-clay/10 text-clay-dark border-clay/25',
  error: 'bg-clay text-white border-clay-dark/30',
};
const CAT_DOT: Record<Cat, string> = {
  hit: 'bg-field',
  onbase: 'bg-night-700',
  out: 'bg-ink-faint',
  sac: 'bg-clay/60',
  error: 'bg-clay',
};

function RbiStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-ink-faint">打点</span>
      <div className="flex items-center gap-1 rounded-xl border border-line bg-white p-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          aria-label="打点を減らす"
          className="grid h-9 w-9 place-items-center rounded-lg text-xl text-ink-muted active:bg-chalk disabled:opacity-30"
        >
          −
        </button>
        <span className="tnum w-7 text-center text-xl font-bold text-ink">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(4, value + 1))}
          disabled={value >= 4}
          aria-label="打点を増やす"
          className="grid h-9 w-9 place-items-center rounded-lg text-xl text-ink-muted active:bg-chalk disabled:opacity-30"
        >
          ＋
        </button>
      </div>
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

  const battingIndex = lineup.length ? atbats.length % lineup.length : 0;
  const autoPlayerId = lineup[battingIndex] ?? '';
  const order = battingIndex + 1;

  const lastInning = atbats.length ? atbats[atbats.length - 1].inning : 1;
  const [inningOverride, setInningOverride] = useState<number | null>(null);
  const inning = inningOverride ?? lastInning;

  const [manualPlayerId, setManualPlayerId] = useState<string | null>(null);
  const effectivePlayerId = manualPlayerId ?? autoPlayerId;
  const currentPlayer = playerById.get(effectivePlayerId);

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
      <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-card">
        <div className="mb-2 text-3xl">📋</div>
        <p className="text-sm text-ink-muted">スタメンが設定されていません。</p>
        <Link
          href={`/team/${teamId}/admin`}
          className="mt-3 inline-block text-sm font-bold text-field"
        >
          チーム管理から設定する →
        </Link>
      </div>
    );
  }

  const reversed = [...atbats].reverse();
  const last = reversed[0];

  return (
    <div className="flex flex-col gap-4">
      {/* 現在の打者 */}
      <div className="rounded-2xl border border-line bg-white shadow-card">
        {/* イニング操作 */}
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="text-xs font-bold text-ink-faint">イニング</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setInningOverride(Math.max(1, inning - 1))}
              disabled={inning <= 1}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-lg text-ink-muted active:bg-chalk disabled:opacity-30"
              aria-label="前のイニング"
            >
              −
            </button>
            <span className="tnum w-14 text-center text-lg font-bold text-ink">
              {inning}
              <span className="ml-0.5 text-xs font-semibold text-ink-faint">回</span>
            </span>
            <button
              type="button"
              onClick={() => setInningOverride(inning + 1)}
              className="grid h-8 w-8 place-items-center rounded-lg border border-line text-lg text-ink-muted active:bg-chalk"
              aria-label="次のイニング"
            >
              ＋
            </button>
          </div>
        </div>

        <div className="p-4">
          <p className="mb-2 text-xs font-bold text-ink-faint">
            {order}番 打者
          </p>
          <div className="mb-3 flex items-center gap-3">
            <span className="tnum grid h-11 w-11 shrink-0 place-items-center rounded-full bg-field text-lg font-bold text-white">
              {order}
            </span>
            <select
              value={effectivePlayerId}
              onChange={(e) => setManualPlayerId(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-base font-bold text-ink"
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
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink">
              {currentPlayer?.name ?? ''}
            </span>
            <RbiStepper value={rbi} onChange={setRbi} />
          </div>
        </div>
      </div>

      {/* 結果ボタン */}
      <div>
        <div className="grid grid-cols-3 gap-2">
          {AT_BAT_RESULTS.map((r) => (
            <button
              key={r}
              type="button"
              disabled={busy}
              onClick={() => record(r)}
              className={`h-[68px] rounded-2xl border text-[15px] font-bold shadow-sm transition-transform active:scale-[0.96] disabled:opacity-50 ${CAT_BTN[RESULT_CAT[r]]}`}
            >
              {AT_BAT_RESULT_LABELS[r]}
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[11px] text-ink-faint">
          <Legend dot="bg-field" label="安打" />
          <Legend dot="bg-night-700" label="出塁" />
          <Legend dot="bg-clay" label="失策" />
          <Legend dot="bg-clay/60" label="犠打飛" />
          <Legend dot="bg-ink-faint" label="アウト" />
        </div>
      </div>

      {/* 直前の記録 */}
      {last && (
        <div className="animate-pop rounded-2xl border border-field/30 bg-field-tint p-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-field px-1.5 py-0.5 text-[10px] font-bold text-white">
              直前
            </span>
            <span className="tnum text-xs font-semibold text-ink-muted">
              {last.inning}回
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
              {last.order}番 {playerById.get(last.playerId)?.name ?? '(不明)'}
            </span>
            <span className="text-sm font-bold text-field-dark">
              {AT_BAT_RESULT_LABELS[last.result]}
              {last.rbi > 0 && (
                <span className="ml-1 text-xs">{last.rbi}打点</span>
              )}
            </span>
          </div>
          <div className="mt-2 flex justify-end gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(last)}>
              修正
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDeleting(last)}>
              取り消し
            </Button>
          </div>
        </div>
      )}

      {/* 打席ログ */}
      <div className="rounded-2xl border border-line bg-white shadow-card">
        <h3 className="border-b border-line px-4 py-3 text-sm font-bold text-ink-muted">
          打席ログ <span className="text-ink-faint">{atbats.length}</span>
        </h3>
        {loading ? (
          <Spinner />
        ) : reversed.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-faint">
            まだ記録がありません。
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {reversed.map((a) => {
              const p = playerById.get(a.playerId);
              const cat = RESULT_CAT[a.result];
              return (
                <li key={a.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${CAT_DOT[cat]}`}
                    aria-hidden
                  />
                  <span className="tnum w-9 shrink-0 text-xs font-semibold text-ink-faint">
                    {a.inning}回
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    <span className="tnum text-ink-faint">{a.order}</span>{' '}
                    {p?.name ?? '(不明)'}
                  </span>
                  <span className="shrink-0 text-sm font-bold text-ink">
                    {AT_BAT_RESULT_LABELS[a.result]}
                    {a.rbi > 0 && (
                      <span className="ml-1 text-xs font-semibold text-clay-dark">
                        {a.rbi}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditing(a)}
                      className="px-2 text-xs font-semibold text-field"
                    >
                      修正
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(a)}
                      className="px-2 text-xs font-semibold text-ink-faint"
                    >
                      削除
                    </button>
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
        <p>削除すると打順が1つ戻ります。誤入力の訂正にお使いください。</p>
      </Modal>
    </div>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
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
          <span className="mb-1.5 block text-sm font-semibold text-ink-muted">
            結果
          </span>
          <select
            value={result}
            onChange={(e) => setResult(e.target.value as AtBatResult)}
            className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink"
          >
            {AT_BAT_RESULTS.map((r) => (
              <option key={r} value={r}>
                {AT_BAT_RESULT_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink-muted">
            イニング
          </span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={inning}
            onChange={(e) => setInning(Math.max(1, Number(e.target.value) || 1))}
            className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink"
          />
        </label>
        <RbiStepper value={rbi} onChange={setRbi} />
      </div>
    </Modal>
  );
}
