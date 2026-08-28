// docs/仕様書.md §11.2 の成績計算式（純関数）。
// 本来は担当A のスコープ。担当B の成績画面のために先行実装している。
// 担当A の実体が push されたら置き換えること。

import type { AtBat, AtBatResult, StatLine } from './types';

type Count = Record<AtBatResult, number>;

function emptyCount(): Count {
  return {
    single: 0,
    double: 0,
    triple: 0,
    homerun: 0,
    walk: 0,
    hitByPitch: 0,
    sacBunt: 0,
    sacFly: 0,
    reachedOnError: 0,
    out: 0,
    strikeout: 0,
  };
}

/**
 * §11.2 の式で打席結果配列から成績を算出する。
 *
 *   PA  = 全打席結果の件数
 *   AB  = 単打 + 二塁打 + 三塁打 + 本塁打 + 失策出塁 + 凡打 + 三振
 *   H   = 単打 + 二塁打 + 三塁打 + 本塁打
 *   TB  = 単打×1 + 二塁打×2 + 三塁打×3 + 本塁打×4
 *   AVG = H / AB                                   (AB=0 は null)
 *   OBP = (H + 四球 + 死球) / (AB + 四球 + 死球 + 犠飛)   (失策出塁は分子に入れない / 犠打は分母に入れない)
 *   SLG = TB / AB                                  (AB=0 は null)
 *   OPS = OBP + SLG                                (どちらか null なら null)
 *   RBI = rbi の合計
 */
export function computeStatLine(atbats: AtBat[]): StatLine {
  const c = emptyCount();
  let rbi = 0;
  for (const ab of atbats) {
    c[ab.result] += 1;
    rbi += ab.rbi ?? 0;
  }

  const pa = atbats.length;
  const h = c.single + c.double + c.triple + c.homerun;
  const ab = h + c.reachedOnError + c.out + c.strikeout;
  const tb = c.single * 1 + c.double * 2 + c.triple * 3 + c.homerun * 4;

  const avg = ab === 0 ? null : h / ab;
  const slg = ab === 0 ? null : tb / ab;

  const obpDenom = ab + c.walk + c.hitByPitch + c.sacFly;
  const obp = obpDenom === 0 ? null : (h + c.walk + c.hitByPitch) / obpDenom;

  const ops = obp === null || slg === null ? null : obp + slg;

  return {
    pa,
    ab,
    h,
    tb,
    single: c.single,
    double: c.double,
    triple: c.triple,
    homerun: c.homerun,
    walk: c.walk,
    hitByPitch: c.hitByPitch,
    strikeout: c.strikeout,
    sacBunt: c.sacBunt,
    sacFly: c.sacFly,
    reachedOnError: c.reachedOnError,
    out: c.out,
    rbi,
    avg,
    obp,
    slg,
    ops,
  };
}

/** playerId ごとに集計する。 */
export function computeByPlayer(atbats: AtBat[]): Map<string, StatLine> {
  const grouped = new Map<string, AtBat[]>();
  for (const ab of atbats) {
    const arr = grouped.get(ab.playerId);
    if (arr) arr.push(ab);
    else grouped.set(ab.playerId, [ab]);
  }
  const result = new Map<string, StatLine>();
  for (const [playerId, list] of grouped) {
    result.set(playerId, computeStatLine(list));
  }
  return result;
}

/** 率の表示ヘルパ。null は "-"、それ以外は先頭0を落とした3桁（例 .333）。 */
export function formatRate(value: number | null): string {
  if (value === null) return '-';
  const fixed = value.toFixed(3);
  return fixed.startsWith('0') ? fixed.slice(1) : fixed;
}
