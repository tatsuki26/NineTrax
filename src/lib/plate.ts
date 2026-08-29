// 統一入力（結果 → 方向 → 打点）で使う選択肢と、公式結果（AtBatResult）への変換。
// 成績集計（lib/stats.ts）は AtBat.result のみを見るので、ここでの導出が集計の入り口。

import type {
  AtBat,
  AtBatDetail,
  AtBatResult,
  Direction,
  HitZone,
  Trajectory,
} from './types';

export const HIT_ZONE_LABELS: Record<HitZone, string> = {
  p: '投手',
  c: '捕手',
  '1b': '一塁',
  '2b': '二塁',
  '3b': '三塁',
  ss: '遊撃',
  lf: 'レフト',
  cf: 'センター',
  rf: 'ライト',
  gap_13: '一二塁間',
  gap_56: '三遊間',
  gap_lc: '左中間',
  gap_rc: '右中間',
  line_l: '三塁線',
  line_r: '一塁線',
};

// 図中の丸ボタン用の短縮ラベル（1〜2文字）
export const HIT_ZONE_SHORT: Record<HitZone, string> = {
  p: '投',
  c: '捕',
  '1b': '一',
  '2b': '二',
  '3b': '三',
  ss: '遊',
  lf: '左',
  cf: '中',
  rf: '右',
  gap_13: '一二',
  gap_56: '三遊',
  gap_lc: '左中',
  gap_rc: '右中',
  line_l: '三線',
  line_r: '一線',
};

export function directionLabel(d: Direction): string {
  return d === 'unknown' ? '不明' : HIT_ZONE_LABELS[d];
}

// 打球方向図（viewBox 0 0 320 290）での各ゾーンの座標。FanField / SprayChart 共通。
export const ZONE_XY: Record<HitZone, { x: number; y: number }> = {
  lf: { x: 70, y: 92 },
  gap_lc: { x: 114, y: 62 },
  cf: { x: 160, y: 50 },
  gap_rc: { x: 206, y: 62 },
  rf: { x: 250, y: 92 },
  line_l: { x: 60, y: 166 },
  line_r: { x: 260, y: 166 },
  '3b': { x: 92, y: 192 },
  gap_56: { x: 118, y: 168 },
  ss: { x: 138, y: 150 },
  '2b': { x: 182, y: 150 },
  gap_13: { x: 202, y: 168 },
  '1b': { x: 228, y: 192 },
  p: { x: 160, y: 202 },
  c: { x: 160, y: 244 },
};

export type FieldSide = 'left' | 'center' | 'right';
const ZONE_SIDE: Record<HitZone, FieldSide> = {
  lf: 'left',
  gap_lc: 'left',
  line_l: 'left',
  '3b': 'left',
  gap_56: 'left',
  ss: 'left',
  cf: 'center',
  p: 'center',
  c: 'center',
  '2b': 'center',
  gap_rc: 'right',
  rf: 'right',
  line_r: 'right',
  '1b': 'right',
  gap_13: 'right',
};
export function zoneSide(z: HitZone): FieldSide {
  return ZONE_SIDE[z];
}

export const TRAJECTORY_LABELS: Record<Trajectory, string> = {
  grounder: 'ゴロ',
  liner: 'ライナー',
  flyball: 'フライ',
  popup: '小フライ',
  bunt: 'バント',
};

// 統一入力の結果選択肢。
export type ResultChoice =
  | 'single'
  | 'double'
  | 'triple'
  | 'homerun'
  | 'grounder'
  | 'flyball'
  | 'liner'
  | 'gidp'
  | 'strikeout'
  | 'walk'
  | 'hitByPitch'
  | 'sacBunt'
  | 'sacFly'
  | 'reachedOnError'
  | 'unknown';

interface ChoiceMeta {
  choice: ResultChoice;
  label: string;
  /** 公式結果 */
  result: AtBatResult;
  /** 打球性質（付加） */
  kind?: Trajectory;
  gidp?: boolean;
  /** 方向の選択ステップを出すか */
  needsDirection: boolean;
  /** 表示上のグループ */
  group: 'hit' | 'out' | 'other';
  /** 打点の初期値 */
  defaultRbi?: number;
}

export const RESULT_CHOICES: ChoiceMeta[] = [
  { choice: 'single', label: '単打', result: 'single', needsDirection: true, group: 'hit' },
  { choice: 'double', label: '二塁打', result: 'double', needsDirection: true, group: 'hit' },
  { choice: 'triple', label: '三塁打', result: 'triple', needsDirection: true, group: 'hit' },
  { choice: 'homerun', label: '本塁打', result: 'homerun', needsDirection: true, group: 'hit', defaultRbi: 1 },
  { choice: 'grounder', label: 'ゴロ', result: 'out', kind: 'grounder', needsDirection: true, group: 'out' },
  { choice: 'flyball', label: 'フライ', result: 'out', kind: 'flyball', needsDirection: true, group: 'out' },
  { choice: 'liner', label: 'ライナー', result: 'out', kind: 'liner', needsDirection: true, group: 'out' },
  { choice: 'gidp', label: '併殺打', result: 'out', kind: 'grounder', gidp: true, needsDirection: true, group: 'out' },
  { choice: 'strikeout', label: '三振', result: 'strikeout', needsDirection: false, group: 'out' },
  { choice: 'walk', label: '四球', result: 'walk', needsDirection: false, group: 'other' },
  { choice: 'hitByPitch', label: '死球', result: 'hitByPitch', needsDirection: false, group: 'other' },
  { choice: 'sacBunt', label: '犠打', result: 'sacBunt', kind: 'bunt', needsDirection: true, group: 'other' },
  { choice: 'sacFly', label: '犠飛', result: 'sacFly', kind: 'flyball', needsDirection: true, group: 'other' },
  { choice: 'reachedOnError', label: '失策出塁', result: 'reachedOnError', needsDirection: true, group: 'other' },
  { choice: 'unknown', label: '不明', result: 'out', needsDirection: false, group: 'other' },
];

const BY_CHOICE: Record<ResultChoice, ChoiceMeta> = Object.fromEntries(
  RESULT_CHOICES.map((c) => [c.choice, c]),
) as Record<ResultChoice, ChoiceMeta>;

export function choiceMeta(choice: ResultChoice): ChoiceMeta {
  return BY_CHOICE[choice];
}

/** 選んだ結果 + 方向 から AtBat 用の { result, detail } を組み立てる。 */
export function buildAtBat(
  choice: ResultChoice,
  zone: Direction | null,
): { result: AtBatResult; detail?: AtBatDetail } {
  const meta = BY_CHOICE[choice];
  const detail: AtBatDetail = {};
  if (meta.kind) detail.kind = meta.kind;
  if (meta.gidp) detail.gidp = true;
  if (meta.needsDirection && zone) detail.zone = zone;
  const hasDetail =
    detail.kind !== undefined ||
    detail.zone !== undefined ||
    detail.gidp !== undefined;
  return { result: meta.result, detail: hasDetail ? detail : undefined };
}

/** この打席で自チームに記録されるアウト数。併殺打は 2、通常のアウト系は 1。 */
export function outsFor(ab: Pick<AtBat, 'result' | 'detail'>): number {
  if (ab.detail?.gidp) return 2;
  return ab.result === 'out' ||
    ab.result === 'strikeout' ||
    ab.result === 'sacBunt' ||
    ab.result === 'sacFly'
    ? 1
    : 0;
}

/** 指定イニングの自チームのアウト合計。 */
export function outsInInning(
  atbats: Pick<AtBat, 'inning' | 'result' | 'detail'>[],
  inning: number,
): number {
  return atbats
    .filter((a) => a.inning === inning)
    .reduce((n, a) => n + outsFor(a), 0);
}

/** ログ表示用の1行サマリ（例: 「二塁・ゴロ」「左中間」）。 */
export function describeDetail(
  result: AtBatResult,
  detail: AtBatDetail | undefined,
): string {
  if (!detail) return '';
  const parts: string[] = [];
  if (detail.zone && detail.zone !== 'unknown') {
    parts.push(HIT_ZONE_LABELS[detail.zone]);
  } else if (detail.zone === 'unknown') {
    parts.push('方向不明');
  }
  if (detail.gidp) parts.push('併殺');
  else if (detail.kind && result === 'out') {
    parts.push(TRAJECTORY_LABELS[detail.kind]);
  }
  return parts.join('・');
}
