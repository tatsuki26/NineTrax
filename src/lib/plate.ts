// 打席の詳細（打球・守備・走者）から、公式結果・塁状況の遷移・打点候補を導出する純関数群。
// 成績集計（lib/stats.ts）は AtBat.result のみを見るため、ここでの result 導出が集計の入り口になる。

import type {
  AtBatDetail,
  AtBatResult,
  BaseState,
  EndBase,
  FieldPos,
  HitZone,
  RunnerEvent,
  Trajectory,
} from './types';
import { EMPTY_BASES } from './types';

export const FIELD_POS_LABELS: Record<FieldPos, string> = {
  1: '投',
  2: '捕',
  3: '一',
  4: '二',
  5: '三',
  6: '遊',
  7: '左',
  8: '中',
  9: '右',
};

export const HIT_ZONE_LABELS: Record<HitZone, string> = {
  p: '投手',
  c: '捕手',
  '1b': '一塁',
  '2b': '二塁',
  '3b': '三塁',
  ss: '遊撃',
  lf: '左',
  cf: '中',
  rf: '右',
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

export const TRAJECTORY_LABELS: Record<Trajectory, string> = {
  grounder: 'ゴロ',
  liner: 'ライナー',
  flyball: 'フライ',
  popup: '小フライ',
  bunt: 'バント',
};

// 打席入力の一次カテゴリ。ヒット・出塁は result に直結、打球性質は詳細フローへ。
export type PlateCategory =
  | 'single'
  | 'double'
  | 'triple'
  | 'homerun'
  | 'walk'
  | 'hitByPitch'
  | 'strikeout'
  | 'grounder'
  | 'liner'
  | 'flyball'
  | 'popup'
  | 'bunt';

export const HIT_CATEGORIES: PlateCategory[] = [
  'single',
  'double',
  'triple',
  'homerun',
];
export const BATTED_OUT_CATEGORIES: PlateCategory[] = [
  'grounder',
  'liner',
  'flyball',
  'popup',
  'bunt',
];

const CATEGORY_TO_TRAJECTORY: Partial<Record<PlateCategory, Trajectory>> = {
  grounder: 'grounder',
  liner: 'liner',
  flyball: 'flyball',
  popup: 'popup',
  bunt: 'bunt',
};

export function categoryTrajectory(c: PlateCategory): Trajectory | undefined {
  return CATEGORY_TO_TRAJECTORY[c];
}

/**
 * 一次カテゴリ + 詳細から公式結果（AtBatResult）を導出する。
 *
 *  - ヒット/四球/死球/三振 → そのまま
 *  - 打球アウト系:
 *      失策で出塁      → reachedOnError
 *      打者アウト:
 *        バント + 走者進塁 → sacBunt
 *        フライ + 三塁走者生還 → sacFly
 *        それ以外            → out
 *      打者セーフ（失策なし）:
 *        野選              → out（打数につく・安打なし）
 *        それ以外          → single（内野安打・クリーンヒット）
 */
export function deriveResult(
  category: PlateCategory,
  detail: AtBatDetail,
): AtBatResult {
  switch (category) {
    case 'single':
    case 'double':
    case 'triple':
    case 'homerun':
    case 'walk':
    case 'hitByPitch':
    case 'strikeout':
      return category;
  }

  const endBase = detail.batterEndBase ?? 0;
  const runners = detail.runners ?? [];
  const anyRunnerAdvanced = runners.some((r) => r.to === 4 || r.to > r.from);
  const runnerScoredFromThird = runners.some((r) => r.from === 3 && r.to === 4);

  if (detail.fielding?.error && endBase >= 1) return 'reachedOnError';

  if (endBase === 0) {
    if (category === 'bunt' && anyRunnerAdvanced) return 'sacBunt';
    if (
      (category === 'flyball' || category === 'popup' || category === 'liner') &&
      runnerScoredFromThird
    ) {
      return 'sacFly';
    }
    return 'out';
  }

  // 打者はセーフ・失策なし
  if (detail.fielding?.fieldersChoice) return 'out';
  return 'single';
}

export interface PlateTransition {
  next: BaseState;
  outsAdded: number;
  runsScored: number;
  scorerIds: string[];
}

/**
 * 塁状況の遷移を計算する。走者イベント + 打者の到達塁から次の塁状況・得点・アウトを求める。
 * 塁の重複（同じ塁に2人）は後勝ちで上書きする。
 */
export function applyPlateResult(
  prev: BaseState,
  batterId: string,
  detail: AtBatDetail,
): PlateTransition {
  const next: BaseState = { ...EMPTY_BASES };
  let outsAdded = 0;
  let runsScored = 0;
  const scorerIds: string[] = [];

  const place = (base: EndBase, playerId: string) => {
    if (base === 0) {
      outsAdded += 1;
      return;
    }
    if (base === 4) {
      runsScored += 1;
      scorerIds.push(playerId);
      return;
    }
    if (base === 1) next.first = playerId;
    else if (base === 2) next.second = playerId;
    else if (base === 3) next.third = playerId;
  };

  const events: RunnerEvent[] = detail.runners ?? [];
  const movedFrom = new Set<number>();
  for (const ev of events) {
    movedFrom.add(ev.from);
    place(ev.to, ev.playerId);
  }

  // イベントの無い走者はその塁に留まる
  if (prev.first && !movedFrom.has(1)) next.first = prev.first;
  if (prev.second && !movedFrom.has(2)) next.second = prev.second;
  if (prev.third && !movedFrom.has(3)) next.third = prev.third;

  // 打者走者
  const endBase = detail.batterEndBase ?? 0;
  place(endBase, batterId);

  if (typeof detail.outsRecorded === 'number') {
    outsAdded = detail.outsRecorded;
  }

  return { next, outsAdded, runsScored, scorerIds };
}

/**
 * 打点の候補値。生還した走者数（本塁打の打者含む）。
 * 失策絡み・併殺での得点は打点に含めないのが公式ルールなので、その場合は目安として -1 する。
 * 最終的にはユーザーがステッパーで微調整できる前提の「候補」。
 */
export function suggestRbi(
  detail: AtBatDetail,
  transition: PlateTransition,
): number {
  let rbi = transition.runsScored;
  const suppressed =
    !!detail.fielding?.error ||
    (!!detail.doublePlay && !detail.brokenDoublePlay);
  if (suppressed) rbi = Math.max(0, rbi - 1);
  return Math.min(4, rbi);
}

/** 併殺崩れの自動判定（守備が併殺を試みたが打者はセーフ・走者1人はアウト） */
export function looksLikeBrokenDoublePlay(detail: AtBatDetail): boolean {
  const endBase = detail.batterEndBase ?? 0;
  const runnerOut = (detail.runners ?? []).some((r) => r.to === 0);
  return endBase >= 1 && runnerOut && !!detail.fielding?.fieldersChoice;
}

/**
 * クイック入力（11ボタン）用のざっくり詳細。塁状況を live に保つための概算で、
 * 正確な走者結果は詳細フローで入力する前提。
 *  - 四球/死球 → 押し出しの走者だけ1つ進む
 *  - 単打/二/三/本 → 全走者を打者と同じ塁数だけ進める（本塁打は全員生還）
 *  - 犠飛 → 三塁走者生還・他は据え置き / 犠打 → 全走者1つ進む・打者アウト
 *  - 三振/凡打 → 走者据え置き・打者アウト
 *  - 失策出塁 → 打者一塁・走者据え置き
 */
export function quickDetail(
  result: AtBatResult,
  prev: BaseState,
): AtBatDetail {
  const runnersOnBase: { from: 1 | 2 | 3; playerId: string }[] = [];
  if (prev.first) runnersOnBase.push({ from: 1, playerId: prev.first });
  if (prev.second) runnersOnBase.push({ from: 2, playerId: prev.second });
  if (prev.third) runnersOnBase.push({ from: 3, playerId: prev.third });

  const mk = (
    batterEndBase: EndBase,
    advance: (from: 1 | 2 | 3) => EndBase,
  ): AtBatDetail => ({
    batterEndBase,
    runners: runnersOnBase.map((r) => ({
      playerId: r.playerId,
      from: r.from,
      to: advance(r.from),
    })),
  });

  const bump = (from: number, by: number): EndBase =>
    Math.min(4, from + by) as EndBase;

  switch (result) {
    case 'walk':
    case 'hitByPitch': {
      // 押し出し：一塁が詰まっていれば一走が二へ、さらに詰まっていれば…と連鎖
      const firstOcc = prev.first != null;
      const secondForced = firstOcc && prev.second != null;
      const thirdForced = secondForced && prev.third != null;
      return mk(1, (from) => {
        if (from === 1 && firstOcc) return 2;
        if (from === 2 && secondForced) return 3;
        if (from === 3 && thirdForced) return 4;
        return from as EndBase;
      });
    }
    case 'single':
      return mk(1, (from) => bump(from, 1));
    case 'double':
      return mk(2, (from) => bump(from, 2));
    case 'triple':
      return mk(3, (from) => bump(from, 3));
    case 'homerun':
      return mk(4, () => 4);
    case 'reachedOnError':
      return mk(1, (from) => from as EndBase);
    case 'sacFly':
      return mk(0, (from) => (from === 3 ? 4 : (from as EndBase)));
    case 'sacBunt':
      return mk(0, (from) => bump(from, 1));
    case 'out':
    case 'strikeout':
    default:
      return mk(0, (from) => from as EndBase);
  }
}
