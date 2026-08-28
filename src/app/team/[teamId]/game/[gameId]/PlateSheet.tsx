'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  AtBatDetail,
  AtBatInput,
  BaseState,
  BallDepth,
  EndBase,
  FieldPos,
  HitZone,
  RunnerEvent,
} from '@/lib/types';
import { AT_BAT_RESULT_LABELS } from '@/lib/types';
import {
  applyPlateResult,
  categoryTrajectory,
  deriveResult,
  FIELD_POS_LABELS,
  HIT_ZONE_LABELS,
  looksLikeBrokenDoublePlay,
  suggestRbi,
  TRAJECTORY_LABELS,
  type PlateCategory,
} from '@/lib/plate';
import { Button } from '@/components/Button';
import { FanField } from '@/components/FanField';

type Step = 'category' | 'ball' | 'fielding' | 'runners' | 'review';

const CATEGORY_GROUPS: { label: string; items: PlateCategory[] }[] = [
  { label: 'ヒット', items: ['single', 'double', 'triple', 'homerun'] },
  {
    label: '打ち取られ',
    items: ['grounder', 'liner', 'flyball', 'popup', 'bunt'],
  },
  { label: '出塁・その他', items: ['walk', 'hitByPitch', 'strikeout'] },
];

const CATEGORY_LABELS: Record<PlateCategory, string> = {
  single: '単打',
  double: '二塁打',
  triple: '三塁打',
  homerun: '本塁打',
  walk: '四球',
  hitByPitch: '死球',
  strikeout: '三振',
  grounder: 'ゴロ',
  liner: 'ライナー',
  flyball: 'フライ',
  popup: '小フライ',
  bunt: 'バント',
};

const DEPTHS: { v: BallDepth; label: string }[] = [
  { v: 'infield', label: '内野' },
  { v: 'shallow', label: '浅い' },
  { v: 'medium', label: '中間' },
  { v: 'deep', label: '深い' },
];

const HIT_END_BASE: Partial<Record<PlateCategory, EndBase>> = {
  single: 1,
  double: 2,
  triple: 3,
  homerun: 4,
};

const POS_LAYOUT: { pos: FieldPos; col: number }[] = [
  { pos: 7, col: 0 },
  { pos: 8, col: 1 },
  { pos: 9, col: 2 },
  { pos: 5, col: 0 },
  { pos: 6, col: 1 },
  { pos: 4, col: 2 },
  { pos: 3, col: 1 },
  { pos: 1, col: 0 },
  { pos: 2, col: 2 },
];

export interface PlateSheetResult {
  input: AtBatInput;
  nextBaseState: BaseState;
  nextOuts: number;
  runsScored: number;
}

export function PlateSheet({
  open,
  onClose,
  batterId,
  batterName,
  order,
  inning,
  baseState,
  currentOuts,
  playerName,
  onCommit,
}: {
  open: boolean;
  onClose: () => void;
  batterId: string;
  batterName: string;
  order: number;
  inning: number;
  baseState: BaseState;
  currentOuts: number;
  playerName: (id: string) => string;
  onCommit: (r: PlateSheetResult) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<PlateCategory | null>(null);
  const [zone, setZone] = useState<HitZone | null>(null);
  const [depth, setDepth] = useState<BallDepth | null>(null);
  const [hard, setHard] = useState(false);
  const [hitTrajectory, setHitTrajectory] = useState<
    'grounder' | 'liner' | 'flyball'
  >('liner');
  const [sequence, setSequence] = useState<FieldPos[]>([]);
  const [errorPos, setErrorPos] = useState<FieldPos | null>(null);
  const [errorKind, setErrorKind] = useState<'field' | 'throw'>('field');
  const [fieldersChoice, setFieldersChoice] = useState(false);
  const [batterEndBase, setBatterEndBase] = useState<EndBase>(0);
  const [runnerTo, setRunnerTo] = useState<Record<1 | 2 | 3, EndBase>>({
    1: 1,
    2: 2,
    3: 3,
  });
  const [dp, setDp] = useState(false);
  const [brokenDp, setBrokenDp] = useState(false);
  const [rbiOverride, setRbiOverride] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  // 開くたびに初期化
  useEffect(() => {
    if (!open) return;
    setStep('category');
    setCategory(null);
    setZone(null);
    setDepth(null);
    setHard(false);
    setHitTrajectory('liner');
    setSequence([]);
    setErrorPos(null);
    setErrorKind('field');
    setFieldersChoice(false);
    setBatterEndBase(0);
    setRunnerTo({ 1: 1, 2: 2, 3: 3 });
    setDp(false);
    setBrokenDp(false);
    setRbiOverride(null);
  }, [open]);

  const onBaseRunners = useMemo(() => {
    const list: { from: 1 | 2 | 3; playerId: string }[] = [];
    if (baseState.first) list.push({ from: 1, playerId: baseState.first });
    if (baseState.second) list.push({ from: 2, playerId: baseState.second });
    if (baseState.third) list.push({ from: 3, playerId: baseState.third });
    return list;
  }, [baseState]);

  const isHit = category != null && category in HIT_END_BASE;
  const isBattedOut =
    category != null &&
    ['grounder', 'liner', 'flyball', 'popup', 'bunt'].includes(category);
  const isPlainResult =
    category === 'walk' ||
    category === 'hitByPitch' ||
    category === 'strikeout';

  function pickCategory(c: PlateCategory) {
    setCategory(c);
    if (c in HIT_END_BASE) {
      setBatterEndBase(HIT_END_BASE[c]!);
      setStep('ball');
    } else if (['grounder', 'liner', 'flyball', 'popup', 'bunt'].includes(c)) {
      setBatterEndBase(0);
      setStep('ball');
    } else {
      // walk / hitByPitch: 打者は一塁、押し出しの走者は force
      if (c === 'walk' || c === 'hitByPitch') {
        setBatterEndBase(1);
        setRunnerTo(forcedAdvance(baseState));
      } else {
        setBatterEndBase(0);
      }
      setStep('runners');
    }
  }

  function toggleSeq(pos: FieldPos) {
    setSequence((cur) =>
      cur.length && cur[cur.length - 1] === pos
        ? cur.slice(0, -1)
        : [...cur, pos],
    );
  }

  const detail: AtBatDetail = useMemo(() => {
    const d: AtBatDetail = {};
    if (isHit || isBattedOut) {
      const traj = isBattedOut
        ? categoryTrajectory(category!)!
        : hitTrajectory;
      d.battedBall = {
        trajectory: traj,
        zone: zone ?? 'cf',
        depth: depth ?? undefined,
        hard: hard || undefined,
      };
    }
    if (isBattedOut) {
      const f: NonNullable<AtBatDetail['fielding']> = { sequence };
      if (errorPos != null) f.error = { pos: errorPos, kind: errorKind };
      if (fieldersChoice) f.fieldersChoice = true;
      d.fielding = f;
    }
    d.batterEndBase = batterEndBase;
    const runners: RunnerEvent[] = onBaseRunners.map((r) => ({
      playerId: r.playerId,
      from: r.from,
      to: runnerTo[r.from],
    }));
    if (runners.length) d.runners = runners;
    if (dp) d.doublePlay = true;
    if (brokenDp) d.brokenDoublePlay = true;
    return d;
  }, [
    isHit,
    isBattedOut,
    category,
    hitTrajectory,
    zone,
    depth,
    hard,
    sequence,
    errorPos,
    errorKind,
    fieldersChoice,
    batterEndBase,
    onBaseRunners,
    runnerTo,
    dp,
    brokenDp,
  ]);

  const transition = useMemo(
    () => applyPlateResult(baseState, batterId, detail),
    [baseState, batterId, detail],
  );
  const derivedResult = useMemo(
    () => (category ? deriveResult(category, detail) : 'out'),
    [category, detail],
  );
  const suggestedRbi = useMemo(
    () => suggestRbi(detail, transition),
    [detail, transition],
  );
  const rbi = rbiOverride ?? suggestedRbi;
  const nextOuts = Math.min(3, currentOuts + transition.outsAdded);

  // 併殺崩れの自動サジェスト
  useEffect(() => {
    if (looksLikeBrokenDoublePlay(detail) && !brokenDp) setBrokenDp(true);
  }, [detail, brokenDp]);

  async function save() {
    if (!category) return;
    setBusy(true);
    try {
      await onCommit({
        input: {
          playerId: batterId,
          order,
          inning,
          result: derivedResult,
          rbi,
          detail: hasDetail(detail) ? detail : undefined,
        },
        nextBaseState: transition.next,
        nextOuts,
        runsScored: transition.runsScored,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const stepOrder: Step[] = isPlainResult
    ? ['category', 'runners', 'review']
    : isHit
      ? ['category', 'ball', 'runners', 'review']
      : ['category', 'ball', 'fielding', 'runners', 'review'];
  const stepIdx = stepOrder.indexOf(step);
  const goNext = () => setStep(stepOrder[Math.min(stepOrder.length - 1, stepIdx + 1)]);
  const goPrev = () =>
    stepIdx <= 0 ? onClose() : setStep(stepOrder[stepIdx - 1]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-cream">
      {/* ヘッダー */}
      <div className="panel-night flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={goPrev}
          className="text-sm font-semibold text-white/80"
        >
          {stepIdx <= 0 ? '閉じる' : '戻る'}
        </button>
        <div className="text-center">
          <p className="text-[11px] text-white/50">
            {inning}回 ・ {order}番 ・ {currentOuts}アウト
          </p>
          <p className="text-sm font-bold text-white">{batterName}</p>
        </div>
        <span className="text-xs tabular-nums text-white/50">
          {stepIdx + 1}/{stepOrder.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {step === 'category' && (
          <div className="flex flex-col gap-5">
            {CATEGORY_GROUPS.map((g) => (
              <div key={g.label}>
                <p className="mb-2 text-xs font-bold text-ink-faint">
                  {g.label}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {g.items.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => pickCategory(c)}
                      className={`h-14 rounded-2xl border text-[15px] font-bold shadow-sm active:scale-[0.96] ${
                        category === c
                          ? 'border-field-dark bg-field text-white'
                          : 'border-line bg-white text-ink'
                      }`}
                    >
                      {CATEGORY_LABELS[c]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 'ball' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-white p-3">
              <FanField value={zone} onChange={setZone} />
              <p className="mt-1 text-center text-xs text-ink-faint">
                {zone ? HIT_ZONE_LABELS[zone] : '打球方向をタップ'}
              </p>
            </div>

            {isHit && (
              <Segmented
                label="打球"
                value={hitTrajectory}
                options={[
                  { v: 'grounder', label: 'ゴロ' },
                  { v: 'liner', label: 'ライナー' },
                  { v: 'flyball', label: 'フライ' },
                ]}
                onChange={(v) => v && setHitTrajectory(v)}
              />
            )}
            {isBattedOut && (
              <p className="text-sm text-ink-muted">
                打球性質：
                <span className="font-bold text-ink">
                  {TRAJECTORY_LABELS[categoryTrajectory(category!)!]}
                </span>
              </p>
            )}

            <Segmented
              label="深さ（任意）"
              value={depth}
              options={DEPTHS.map((d) => ({ v: d.v, label: d.label }))}
              onChange={setDepth}
              nullable
            />
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input
                type="checkbox"
                checked={hard}
                onChange={(e) => setHard(e.target.checked)}
                className="h-4 w-4 accent-field"
              />
              強い打球
            </label>

            <Button fullWidth size="lg" onClick={goNext} disabled={!zone}>
              次へ
            </Button>
          </div>
        )}

        {step === 'fielding' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-xs font-bold text-ink-faint">
                打球処理（捕球 → 送球の順にタップ）
              </p>
              <div className="mx-auto grid max-w-[260px] grid-cols-3 gap-2">
                {POS_LAYOUT.map(({ pos }) => {
                  const idx = sequence.indexOf(pos);
                  const inSeq = idx >= 0;
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => toggleSeq(pos)}
                      className={`relative h-16 rounded-2xl border text-base font-bold active:scale-[0.96] ${
                        inSeq
                          ? 'border-field-dark bg-field text-white'
                          : 'border-line bg-white text-ink'
                      }`}
                    >
                      {FIELD_POS_LABELS[pos]}
                      {inSeq && (
                        <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-white text-[10px] font-bold text-field">
                          {idx + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {sequence.length > 0 && (
                <p className="mt-2 text-center text-sm font-bold tabular-nums text-ink">
                  {sequence.map((p) => FIELD_POS_LABELS[p]).join(' → ')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-line bg-white p-3">
              <Segmented
                label="打者"
                value={batterEndBase === 0 ? 'out' : 'safe'}
                options={[
                  { v: 'out', label: 'アウト' },
                  { v: 'safe', label: 'セーフ（出塁）' },
                ]}
                onChange={(v) => setBatterEndBase(v === 'out' ? 0 : 1)}
              />
              <label className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
                <input
                  type="checkbox"
                  checked={fieldersChoice}
                  onChange={(e) => setFieldersChoice(e.target.checked)}
                  className="h-4 w-4 accent-field"
                />
                野選（打者は生きたが他の走者を刺した）
              </label>
              <div className="mt-3">
                <p className="mb-1 text-xs font-bold text-ink-faint">失策</p>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setErrorPos(null)}
                    className={chip(errorPos == null)}
                  >
                    なし
                  </button>
                  {sequence.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setErrorPos(p)}
                      className={chip(errorPos === p)}
                    >
                      {FIELD_POS_LABELS[p]}
                    </button>
                  ))}
                </div>
                {errorPos != null && (
                  <div className="mt-2">
                    <Segmented
                      label="種類"
                      value={errorKind}
                      options={[
                        { v: 'field', label: '捕球' },
                        { v: 'throw', label: '送球' },
                      ]}
                      onChange={(v) => v && setErrorKind(v)}
                    />
                  </div>
                )}
              </div>
            </div>

            <Button fullWidth size="lg" onClick={goNext}>
              次へ
            </Button>
          </div>
        )}

        {step === 'runners' && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-xs font-bold text-ink-faint">
                打者走者の到達
              </p>
              <BaseButtons
                value={batterEndBase}
                allowed={[0, 1, 2, 3, 4]}
                onChange={setBatterEndBase}
              />
            </div>

            {onBaseRunners.map((r) => (
              <div key={r.from}>
                <p className="mb-2 text-xs font-bold text-ink-faint">
                  {r.from}塁走者：{playerName(r.playerId)}
                </p>
                <BaseButtons
                  value={runnerTo[r.from]}
                  allowed={
                    r.from === 1
                      ? [0, 1, 2, 3, 4]
                      : r.from === 2
                        ? [0, 2, 3, 4]
                        : [0, 3, 4]
                  }
                  onChange={(v) =>
                    setRunnerTo((cur) => ({ ...cur, [r.from]: v }))
                  }
                />
              </div>
            ))}

            {(isBattedOut || isPlainResult) && (
              <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-white p-3 text-sm">
                <label className="flex items-center gap-2 text-ink-muted">
                  <input
                    type="checkbox"
                    checked={dp}
                    onChange={(e) => {
                      setDp(e.target.checked);
                      if (e.target.checked) setBrokenDp(false);
                    }}
                    className="h-4 w-4 accent-field"
                  />
                  併殺
                </label>
                <label className="flex items-center gap-2 text-ink-muted">
                  <input
                    type="checkbox"
                    checked={brokenDp}
                    onChange={(e) => {
                      setBrokenDp(e.target.checked);
                      if (e.target.checked) setDp(false);
                    }}
                    className="h-4 w-4 accent-field"
                  />
                  併殺崩れ（打者セーフ）
                </label>
              </div>
            )}

            <Button fullWidth size="lg" onClick={goNext}>
              確認へ
            </Button>
          </div>
        )}

        {step === 'review' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-white p-4">
              <Row label="記録">
                <span className="text-lg font-bold text-field-dark">
                  {AT_BAT_RESULT_LABELS[derivedResult]}
                </span>
              </Row>
              {detail.battedBall && (
                <Row label="打球">
                  {TRAJECTORY_LABELS[detail.battedBall.trajectory]}・
                  {HIT_ZONE_LABELS[detail.battedBall.zone]}
                  {detail.battedBall.depth
                    ? `・${DEPTHS.find((d) => d.v === detail.battedBall!.depth)?.label}`
                    : ''}
                </Row>
              )}
              {detail.fielding && detail.fielding.sequence.length > 0 && (
                <Row label="守備">
                  {detail.fielding.sequence
                    .map((p) => FIELD_POS_LABELS[p])
                    .join('-')}
                  {detail.fielding.error
                    ? `（${FIELD_POS_LABELS[detail.fielding.error.pos]}失策）`
                    : ''}
                  {detail.fielding.fieldersChoice ? '（野選）' : ''}
                </Row>
              )}
              <Row label="この打席のアウト">
                +{transition.outsAdded}（→ {nextOuts}アウト）
              </Row>
              <Row label="得点">{transition.runsScored}</Row>
              <Row label="次の塁状況">
                {describeBases(transition.next, playerName)}
              </Row>
            </div>

            <div className="rounded-2xl border border-line bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-ink-muted">打点</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRbiOverride(Math.max(0, rbi - 1))}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-line text-lg"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-xl font-bold tabular-nums">
                    {rbi}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRbiOverride(Math.min(4, rbi + 1))}
                    className="grid h-9 w-9 place-items-center rounded-lg border border-line text-lg"
                  >
                    ＋
                  </button>
                </div>
              </div>
              {rbiOverride == null && (
                <p className="mt-1 text-xs text-ink-faint">
                  自動候補：{suggestedRbi}（失策・併殺絡みの得点は含めない目安）
                </p>
              )}
            </div>

            <Button fullWidth size="lg" onClick={save} disabled={busy}>
              {busy ? '保存中…' : 'この内容で記録'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function hasDetail(d: AtBatDetail): boolean {
  return Boolean(
    d.battedBall || d.fielding || d.runners || d.doublePlay || d.brokenDoublePlay,
  );
}

function forcedAdvance(bs: BaseState): Record<1 | 2 | 3, EndBase> {
  // 押し出し：詰まっている走者だけ1つ進める
  const r: Record<1 | 2 | 3, EndBase> = { 1: 1, 2: 2, 3: 3 };
  if (bs.first) {
    r[1] = 2;
    if (bs.second) {
      r[2] = 3;
      if (bs.third) r[3] = 4;
    }
  }
  return r;
}

function describeBases(
  bs: BaseState,
  name: (id: string) => string,
): string {
  const parts: string[] = [];
  if (bs.first) parts.push(`一：${name(bs.first)}`);
  if (bs.second) parts.push(`二：${name(bs.second)}`);
  if (bs.third) parts.push(`三：${name(bs.third)}`);
  return parts.length ? parts.join(' / ') : '走者なし';
}

function chip(active: boolean): string {
  return `rounded-full border px-3 py-1.5 text-sm font-medium ${
    active
      ? 'border-field bg-field-tint text-field'
      : 'border-line bg-white text-ink-muted'
  }`;
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-line py-2 last:border-0">
      <span className="shrink-0 text-xs font-bold text-ink-faint">{label}</span>
      <span className="text-right text-sm text-ink">{children}</span>
    </div>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  nullable = false,
}: {
  label: string;
  value: T | null;
  options: { v: T; label: string }[];
  onChange: (v: T | null) => void;
  nullable?: boolean;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-ink-faint">{label}</p>
      <div className="flex gap-1 rounded-xl border border-line bg-white p-1">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(nullable && value === o.v ? null : o.v)}
            className={`h-9 flex-1 rounded-lg text-sm font-bold ${
              value === o.v ? 'bg-field text-white' : 'text-ink-faint'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BaseButtons({
  value,
  allowed,
  onChange,
}: {
  value: EndBase;
  allowed: EndBase[];
  onChange: (v: EndBase) => void;
}) {
  const LABEL: Record<EndBase, string> = {
    0: 'アウト',
    1: '一塁',
    2: '二塁',
    3: '三塁',
    4: '生還',
  };
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {([0, 1, 2, 3, 4] as EndBase[]).map((b) => {
        const on = allowed.includes(b);
        return (
          <button
            key={b}
            type="button"
            disabled={!on}
            onClick={() => onChange(b)}
            className={`h-11 rounded-xl border text-sm font-bold ${
              value === b
                ? b === 0
                  ? 'border-stitch bg-stitch text-white'
                  : 'border-field-dark bg-field text-white'
                : on
                  ? 'border-line bg-white text-ink'
                  : 'border-line/50 bg-chalk text-ink-faint/40'
            }`}
          >
            {LABEL[b]}
          </button>
        );
      })}
    </div>
  );
}
