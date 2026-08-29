'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type {
  AtBat,
  AtBatDetail,
  AtBatResult,
  Direction,
  FieldPosition,
  Game,
  Player,
} from '@/lib/types';
import {
  AT_BAT_RESULTS,
  AT_BAT_RESULT_LABELS,
  FIELD_POSITIONS,
  FIELD_POSITION_LABELS,
} from '@/lib/types';
import { useAtBats, addAtBat, updateAtBat, deleteAtBat, updateGame } from '@/lib/db';
import {
  buildAtBat,
  choiceMeta,
  describeDetail,
  outsFor,
  outsInInning,
  RESULT_CHOICES,
  type ResultChoice,
} from '@/lib/plate';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { Spinner } from '@/components/Spinner';
import { FanField } from '@/components/FanField';
import { Scoreboard } from './Scoreboard';

const GROUP_STYLE: Record<'hit' | 'out' | 'other', string> = {
  hit: 'bg-field text-white border-field-dark/30',
  out: 'bg-white text-ink-muted border-line',
  other: 'bg-night-700 text-white border-night/40',
};

// 公式結果 → ログのドット色
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
const CAT_DOT: Record<Cat, string> = {
  hit: 'bg-field',
  onbase: 'bg-night-700',
  out: 'bg-ink-faint',
  sac: 'bg-clay/60',
  error: 'bg-clay',
};

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
  const nameOf = (id: string) => playerById.get(id)?.name ?? '(不明)';
  const lineupIndex = (pid: string) =>
    lineup.findIndex((s) => s.playerId === pid);

  // イニング：手動送りのみ。既定は直前の打席のイニング。
  const lastInning = atbats.length ? atbats[atbats.length - 1].inning : 1;
  const [inningOverride, setInningOverride] = useState<number | null>(null);
  const inning = inningOverride ?? lastInning;
  const outs = outsInInning(atbats, inning);

  // 統一入力の状態：選手 → 結果 → 方向 → 打点
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [choice, setChoice] = useState<ResultChoice | null>(null);
  const [zone, setZone] = useState<Direction | null>(null);
  const [rbi, setRbi] = useState(0);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<AtBat | null>(null);
  const [deleting, setDeleting] = useState<AtBat | null>(null);
  const [showBench, setShowBench] = useState(false);
  const [subSlot, setSubSlot] = useState<number | null>(null);

  // 3アウトたまったら自動で次の回へ（自然な進行時のみ）。
  useEffect(() => {
    if (inningOverride == null && outs >= 3) {
      setInningOverride(inning + 1);
    }
  }, [inningOverride, outs, inning]);

  const meta = choice ? choiceMeta(choice) : null;
  const needsDirection = meta?.needsDirection ?? false;
  const canSave = Boolean(playerId && choice);

  function pickChoice(c: ResultChoice | null) {
    setChoice(c);
    setZone(null);
    setRbi(c ? (choiceMeta(c).defaultRbi ?? 0) : 0);
  }

  function resetInput() {
    setPlayerId(null);
    setChoice(null);
    setZone(null);
    setRbi(0);
  }

  async function record() {
    if (!playerId || !choice || busy) return;
    setBusy(true);
    try {
      const { result, detail } = buildAtBat(choice, zone);
      const idx = lineupIndex(playerId);
      await addAtBat(teamId, gameId, {
        playerId,
        order: idx >= 0 ? idx + 1 : 0,
        inning,
        result,
        rbi,
        detail,
      });
      // 3アウト目なら即・次の回へ（スナップショット反映を待たない）
      if (outs + outsFor({ result, detail }) >= 3) {
        setInningOverride(inning + 1);
      }
      resetInput();
    } finally {
      setBusy(false);
    }
  }

  async function applySubstitution(
    order: number,
    inPlayerId: string,
    position: FieldPosition,
  ) {
    const slot = lineup[order - 1];
    if (!slot) return;
    const nextLineup = lineup.map((s, i) =>
      i === order - 1 ? { playerId: inPlayerId, position } : s,
    );
    await updateGame(teamId, gameId, {
      lineup: nextLineup,
      substitutions: [
        ...game.substitutions,
        {
          inning,
          order,
          outPlayerId: slot.playerId,
          inPlayerId,
          position,
          createdAt: Date.now(),
        },
      ],
    });
    setSubSlot(null);
  }

  // 相手の得点カウンター（awayScores を回ごとに増減）
  const [oppInning, setOppInning] = useState<number | null>(null);
  const oppTargetInning = oppInning ?? inning;
  const oppRaw = game.awayScores[oppTargetInning - 1];
  const oppRuns = oppRaw ?? 0;
  const oppConfirmed = oppRaw != null;
  async function setOppRuns(v: number) {
    const next = [...game.awayScores];
    next[oppTargetInning - 1] = Math.max(0, Math.min(99, v));
    await updateGame(teamId, gameId, { awayScores: next });
  }
  async function confirmOppInningAndNext() {
    if (oppRaw == null) await setOppRuns(0); // 0点でも明示的に記録
    setOppInning(oppTargetInning + 1);
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

  const benchIds = new Set(lineup.map((s) => s.playerId));
  const bench = players.filter((p) => !p.archived && !benchIds.has(p.id));
  const last = atbats.length ? atbats[atbats.length - 1] : undefined;
  // 打席ログは回ごと（昇順）→ 回内は入力順。
  const logRows = [...atbats].sort(
    (a, b) => a.inning - b.inning || a.createdAt - b.createdAt,
  );
  // 次の打者（打順の目安。強制はしない）
  const lastOrdered = [...atbats].reverse().find((a) => a.order >= 1);
  const nextOrder =
    lineup.length > 0
      ? lastOrdered
        ? (lastOrdered.order % lineup.length) + 1
        : 1
      : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* スコアボード（最上部） */}
      <Scoreboard teamId={teamId} gameId={gameId} game={game} />

      {/* 相手の得点カウンター */}
      <div className="rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ink-muted">相手の得点</span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setOppInning(Math.max(1, oppTargetInning - 1))}
              disabled={oppTargetInning <= 1}
              className="grid h-6 w-6 place-items-center rounded border border-line text-sm text-ink-muted disabled:opacity-30"
              aria-label="対象の回を戻す"
            >
              −
            </button>
            <span className="tnum text-xs font-bold text-ink-faint">
              {oppTargetInning}回
              {oppConfirmed && (
                <span className="ml-1 text-field">確定</span>
              )}
            </span>
            <button
              type="button"
              onClick={() => setOppInning(oppTargetInning + 1)}
              className="grid h-6 w-6 place-items-center rounded border border-line text-sm text-ink-muted"
              aria-label="対象の回を進める"
            >
              ＋
            </button>
          </span>
        </div>

        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setOppRuns(oppRuns - 1)}
            disabled={oppRuns <= 0}
            className="grid h-11 w-11 place-items-center rounded-xl border border-line text-2xl text-ink-muted active:bg-chalk disabled:opacity-30"
            aria-label="相手の得点を減らす"
          >
            −
          </button>
          <span className="tnum w-10 text-center text-3xl font-bold text-ink">
            {oppRuns}
          </span>
          <button
            type="button"
            onClick={() => setOppRuns(oppRuns + 1)}
            className="grid h-11 w-16 place-items-center rounded-xl bg-clay text-2xl font-bold text-white shadow-sm active:scale-[0.97]"
            aria-label="相手の得点を1点追加"
          >
            ＋
          </button>
        </div>

        <button
          type="button"
          onClick={confirmOppInningAndNext}
          className="mt-3 h-10 w-full rounded-xl border border-field bg-field-tint text-sm font-bold text-field-dark active:bg-field/10"
        >
          {oppRuns === 0
            ? `この回は0点で確定して次へ`
            : `この回を確定して次へ（${oppRuns}点）`}
        </button>
      </div>

      <div className="rounded-2xl border border-line bg-white shadow-card">
        {/* イニング（大きく表示）＋アウト */}
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-baseline gap-2.5">
            <span className="tnum text-3xl font-bold leading-none text-ink">
              {inning}
              <span className="ml-1 text-base font-bold text-ink-faint">回</span>
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                outs >= 2
                  ? 'bg-stitch/12 text-stitch-dark'
                  : 'bg-chalk text-ink-muted'
              }`}
            >
              {Math.min(outs, 3)}アウト
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setInningOverride(Math.max(1, inning - 1))}
              disabled={inning <= 1}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line text-xl text-ink-muted active:bg-chalk disabled:opacity-30"
              aria-label="前のイニング"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => setInningOverride(inning + 1)}
              className="rounded-lg border border-line px-3 text-sm font-bold text-ink-muted active:bg-chalk"
              style={{ height: 36 }}
            >
              次の回 ＋
            </button>
          </div>
        </div>

        <div className="p-4">
          {!playerId ? (
            <>
              {/* 1. 選手（打順・守備位置つき） */}
              <p className="mb-2 text-xs font-bold text-ink-faint">
                打席が終わった選手を選ぶ
              </p>
              <ul className="flex flex-col gap-1.5">
                {lineup.map((slot, i) => {
                  const p = playerById.get(slot.playerId);
                  const isNext = i + 1 === nextOrder;
                  return (
                    <li key={`${i}-${slot.playerId}`} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPlayerId(slot.playerId)}
                        className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-left active:bg-chalk ${
                          isNext
                            ? 'border-field/50 bg-field-tint'
                            : 'border-line bg-white'
                        }`}
                      >
                        <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-field-tint text-sm font-bold text-field">
                          {i + 1}
                        </span>
                        <span className="grid h-6 w-7 shrink-0 place-items-center rounded-md bg-chalk text-xs font-bold text-ink-muted">
                          {FIELD_POSITION_LABELS[slot.position]}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                          {p?.name ?? '(不明)'}
                        </span>
                        {isNext && (
                          <span className="shrink-0 rounded-full bg-field px-1.5 py-0.5 text-[10px] font-bold text-white">
                            次
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubSlot(i + 1)}
                        className="shrink-0 rounded-lg border border-line px-2 py-2 text-xs font-bold text-ink-faint active:bg-chalk"
                      >
                        交代
                      </button>
                    </li>
                  );
                })}
              </ul>

              {bench.length > 0 && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowBench((v) => !v)}
                    className="text-xs font-bold text-field"
                  >
                    {showBench ? '▲ ベンチを隠す' : '▼ ベンチの選手で入力'}
                  </button>
                  {showBench && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {bench.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPlayerId(p.id)}
                          className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink-muted active:bg-chalk"
                        >
                          {p.number != null && (
                            <span className="tnum mr-1 font-bold text-field">
                              {p.number}
                            </span>
                          )}
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-bold text-ink">
                  {lineupIndex(playerId) >= 0 && (
                    <span className="tnum mr-1.5 text-field">
                      {lineupIndex(playerId) + 1}番
                    </span>
                  )}
                  {lineupIndex(playerId) >= 0 && (
                    <span className="mr-1.5 text-xs text-ink-muted">
                      {FIELD_POSITION_LABELS[lineup[lineupIndex(playerId)].position]}
                    </span>
                  )}
                  {nameOf(playerId)}
                </span>
                <button
                  type="button"
                  onClick={resetInput}
                  className="text-xs font-bold text-ink-faint"
                >
                  選手を変更
                </button>
              </div>

              {!choice ? (
                /* 2. 結果を選ぶ */
                <>
                  <p className="mb-2 text-xs font-bold text-ink-faint">結果</p>
                  <div className="grid grid-cols-3 gap-2">
                    {RESULT_CHOICES.map((c) => (
                      <button
                        key={c.choice}
                        type="button"
                        onClick={() => pickChoice(c.choice)}
                        className={`h-12 rounded-xl border text-sm font-bold active:scale-[0.97] ${GROUP_STYLE[c.group]}`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                /* 3. 選択中の結果 + 方向 + 打点（スクロール不要でまとめて） */
                <>
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm text-ink-muted">
                      結果：
                      <span className="ml-1 rounded-lg bg-field px-2 py-0.5 text-sm font-bold text-white">
                        {meta?.label}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => pickChoice(null)}
                      className="text-xs font-bold text-field"
                    >
                      ← 結果を選び直す
                    </button>
                  </div>

                  {needsDirection && (
                    <div className="mb-3">
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-xs font-bold text-ink-faint">
                          どこに打った？
                        </p>
                        <button
                          type="button"
                          onClick={() => setZone('unknown')}
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${
                            zone === 'unknown'
                              ? 'border-field bg-field text-white'
                              : 'border-line text-ink-muted'
                          }`}
                        >
                          不明
                        </button>
                      </div>
                      <div className="mx-auto max-w-[300px] rounded-2xl border border-line bg-white p-2">
                        <FanField
                          value={zone === 'unknown' ? null : zone}
                          onChange={(z) => setZone(z)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-faint">打点</span>
                    <div className="flex items-center gap-1 rounded-xl border border-line p-1">
                      <button
                        type="button"
                        onClick={() => setRbi(Math.max(0, rbi - 1))}
                        disabled={rbi <= 0}
                        className="grid h-9 w-9 place-items-center rounded-lg text-xl text-ink-muted active:bg-chalk disabled:opacity-30"
                      >
                        −
                      </button>
                      <span className="tnum w-7 text-center text-xl font-bold text-ink">
                        {rbi}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRbi(Math.min(4, rbi + 1))}
                        disabled={rbi >= 4}
                        className="grid h-9 w-9 place-items-center rounded-lg text-xl text-ink-muted active:bg-chalk disabled:opacity-30"
                      >
                        ＋
                      </button>
                    </div>
                  </div>

                  <Button
                    fullWidth
                    size="lg"
                    disabled={!canSave || busy}
                    onClick={record}
                  >
                    {busy ? '記録中…' : '記録する'}
                  </Button>
                </>
              )}
            </>
          )}
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
              {nameOf(last.playerId)}
            </span>
            <span className="text-sm font-bold text-field-dark">
              {AT_BAT_RESULT_LABELS[last.result]}
              {last.rbi > 0 && (
                <span className="ml-1 text-xs">{last.rbi}打点</span>
              )}
            </span>
          </div>
          {describeDetail(last.result, last.detail) && (
            <p className="mt-1 pl-1 text-xs text-ink-muted">
              {describeDetail(last.result, last.detail)}
            </p>
          )}
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
        ) : logRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-ink-faint">
            まだ記録がありません。
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {logRows.map((a, idx) => {
              const summary = describeDetail(a.result, a.detail);
              const showInningHead =
                idx === 0 || logRows[idx - 1].inning !== a.inning;
              return (
                <li key={a.id}>
                  {showInningHead && (
                    <p className="tnum bg-chalk px-4 py-1 text-[11px] font-bold text-ink-faint">
                      {a.inning}回
                    </p>
                  )}
                  <div className="flex items-center gap-2.5 px-4 py-2.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${CAT_DOT[RESULT_CAT[a.result]]}`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {nameOf(a.playerId)}
                      {summary && (
                        <span className="ml-1 text-xs text-ink-faint">
                          {summary}
                        </span>
                      )}
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
                  </div>
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
        <p>誤入力の訂正にお使いください。</p>
      </Modal>

      {subSlot != null && lineup[subSlot - 1] && (
        <SubstitutionModal
          order={subSlot}
          currentName={nameOf(lineup[subSlot - 1].playerId)}
          currentPosition={lineup[subSlot - 1].position}
          candidates={players.filter(
            (p) => !p.archived && !benchIds.has(p.id),
          )}
          onClose={() => setSubSlot(null)}
          onConfirm={(inId, pos) => applySubstitution(subSlot, inId, pos)}
        />
      )}

      {game.substitutions.length > 0 && (
        <div className="rounded-2xl border border-line bg-white shadow-card">
          <h3 className="border-b border-line px-4 py-3 text-sm font-bold text-ink-muted">
            交代 <span className="text-ink-faint">{game.substitutions.length}</span>
          </h3>
          <ul className="divide-y divide-line">
            {[...game.substitutions].reverse().map((s, i) => (
              <li
                key={i}
                className="flex items-center gap-2 px-4 py-2 text-xs text-ink-muted"
              >
                <span className="tnum shrink-0 font-semibold text-ink-faint">
                  {s.inning}回 {s.order}番
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {nameOf(s.outPlayerId)} → {nameOf(s.inPlayerId)}（
                  {FIELD_POSITION_LABELS[s.position]}）
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SubstitutionModal({
  order,
  currentName,
  currentPosition,
  candidates,
  onClose,
  onConfirm,
}: {
  order: number;
  currentName: string;
  currentPosition: FieldPosition;
  candidates: Player[];
  onClose: () => void;
  onConfirm: (inPlayerId: string, position: FieldPosition) => void | Promise<void>;
}) {
  const [inId, setInId] = useState('');
  const [pos, setPos] = useState<FieldPosition>(currentPosition);
  const [busy, setBusy] = useState(false);

  return (
    <Modal
      open
      onClose={onClose}
      title={`${order}番を交代`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            キャンセル
          </Button>
          <Button
            disabled={!inId || busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm(inId, pos);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? '交代中…' : '交代する'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm">
          <span className="font-bold text-ink">{currentName}</span> と交代する選手：
        </p>
        {candidates.length === 0 ? (
          <p className="text-sm text-ink-faint">
            交代できる選手がいません。先にチーム管理で選手を登録してください。
          </p>
        ) : (
          <select
            value={inId}
            onChange={(e) => setInId(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink"
          >
            <option value="">選手を選ぶ</option>
            {candidates.map((p) => (
              <option key={p.id} value={p.id}>
                {p.number != null ? `#${p.number} ` : ''}
                {p.name}
              </option>
            ))}
          </select>
        )}
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-ink-muted">
            守備位置
          </span>
          <select
            value={pos}
            onChange={(e) => setPos(e.target.value as FieldPosition)}
            className="h-12 w-full rounded-xl border border-line bg-white px-3.5 text-base text-ink"
          >
            {FIELD_POSITIONS.map((fp) => (
              <option key={fp} value={fp}>
                {FIELD_POSITION_LABELS[fp]}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Modal>
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
  const [zone, setZone] = useState<Direction | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (atbat) {
      setResult(atbat.result);
      setRbi(atbat.rbi);
      setInning(atbat.inning);
      setZone(atbat.detail?.zone ?? null);
    }
  }, [atbat]);

  async function onSave() {
    if (!atbat) return;
    setBusy(true);
    try {
      const detail: AtBatDetail = {};
      if (atbat.detail?.kind) detail.kind = atbat.detail.kind;
      if (atbat.detail?.gidp) detail.gidp = true;
      if (zone) detail.zone = zone;
      await updateAtBat(teamId, gameId, atbat.id, {
        result,
        rbi,
        inning,
        detail,
      });
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
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-muted">方向</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setZone('unknown')}
                className={`rounded-full border px-3 py-1 text-xs font-bold ${
                  zone === 'unknown'
                    ? 'border-field bg-field text-white'
                    : 'border-line text-ink-muted'
                }`}
              >
                不明
              </button>
              <button
                type="button"
                onClick={() => setZone(null)}
                className="rounded-full border border-line px-3 py-1 text-xs font-bold text-ink-muted"
              >
                なし
              </button>
            </div>
          </div>
          <div className="mx-auto max-w-[280px] rounded-2xl border border-line bg-white p-2">
            <FanField
              value={zone === 'unknown' ? null : zone}
              onChange={(z) => setZone(z)}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-ink-muted">打点</span>
          <div className="flex items-center gap-1 rounded-xl border border-line p-1">
            <button
              type="button"
              onClick={() => setRbi(Math.max(0, rbi - 1))}
              className="grid h-9 w-9 place-items-center rounded-lg text-xl text-ink-muted"
            >
              −
            </button>
            <span className="tnum w-7 text-center text-xl font-bold text-ink">
              {rbi}
            </span>
            <button
              type="button"
              onClick={() => setRbi(Math.min(4, rbi + 1))}
              className="grid h-9 w-9 place-items-center rounded-lg text-xl text-ink-muted"
            >
              ＋
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
