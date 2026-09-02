// 成績計算。仕様書 §11.2 の定義に厳密に従う。
//
//   打席 PA  = 全打席結果の件数
//   打数 AB  = 単打 + 二塁打 + 三塁打 + 本塁打 + 失策出塁 + 凡打 + 三振
//            ( = PA − 四球 − 死球 − 犠打 − 犠飛 )
//   安打 H   = 単打 + 二塁打 + 三塁打 + 本塁打
//   塁打 TB  = 単打×1 + 二塁打×2 + 三塁打×3 + 本塁打×4
//   打率  AVG = H / AB                                   ( AB=0 は null )
//   出塁率 OBP = (H + 四球 + 死球) / (AB + 四球 + 死球 + 犠飛)   ( 失策出塁は分子に含めない )
//   長打率 SLG = TB / AB                                  ( AB=0 は null )
//   OPS       = OBP + SLG                                 ( OBP か SLG が null なら null )
//   打点  RBI = rbi の合計

import type { AtBat, Steal, StatLine } from './types';

function emptyStatLine(): StatLine {
  return {
    pa: 0,
    ab: 0,
    h: 0,
    tb: 0,
    single: 0,
    double: 0,
    triple: 0,
    homerun: 0,
    walk: 0,
    hitByPitch: 0,
    strikeout: 0,
    sacBunt: 0,
    sacFly: 0,
    reachedOnError: 0,
    out: 0,
    rbi: 0,
    avg: null,
    obp: null,
    slg: null,
    ops: null,
  };
}

export function computeStatLine(atbats: AtBat[]): StatLine {
  const s = emptyStatLine();

  for (const ab of atbats) {
    s.pa += 1;
    s.rbi += ab.rbi;
    switch (ab.result) {
      case 'single':
        s.single += 1;
        break;
      case 'double':
        s.double += 1;
        break;
      case 'triple':
        s.triple += 1;
        break;
      case 'homerun':
        s.homerun += 1;
        break;
      case 'walk':
        s.walk += 1;
        break;
      case 'hitByPitch':
        s.hitByPitch += 1;
        break;
      case 'sacBunt':
        s.sacBunt += 1;
        break;
      case 'sacFly':
        s.sacFly += 1;
        break;
      case 'reachedOnError':
        s.reachedOnError += 1;
        break;
      case 'out':
        s.out += 1;
        break;
      case 'strikeout':
        s.strikeout += 1;
        break;
    }
  }

  s.h = s.single + s.double + s.triple + s.homerun;
  s.tb = s.single + s.double * 2 + s.triple * 3 + s.homerun * 4;
  s.ab = s.h + s.reachedOnError + s.out + s.strikeout;

  const obpDenom = s.ab + s.walk + s.hitByPitch + s.sacFly;
  s.avg = s.ab > 0 ? s.h / s.ab : null;
  s.obp = obpDenom > 0 ? (s.h + s.walk + s.hitByPitch) / obpDenom : null;
  s.slg = s.ab > 0 ? s.tb / s.ab : null;
  s.ops = s.obp !== null && s.slg !== null ? s.obp + s.slg : null;

  return s;
}

// playerId ごとに集計する。返り値は playerId -> StatLine。
export function computeByPlayer(atbats: AtBat[]): Map<string, StatLine> {
  const byPlayer = new Map<string, AtBat[]>();
  for (const ab of atbats) {
    const list = byPlayer.get(ab.playerId);
    if (list) list.push(ab);
    else byPlayer.set(ab.playerId, [ab]);
  }
  const result = new Map<string, StatLine>();
  for (const [playerId, list] of byPlayer) {
    result.set(playerId, computeStatLine(list));
  }
  return result;
}

export interface StealLine {
  sb: number; // 盗塁成功
  cs: number; // 盗塁死
}

// 盗塁の集計。playerId -> {sb, cs}。
export function stealsByPlayer(steals: Steal[]): Map<string, StealLine> {
  const m = new Map<string, StealLine>();
  for (const s of steals) {
    const cur = m.get(s.playerId) ?? { sb: 0, cs: 0 };
    if (s.caught) cur.cs += 1;
    else cur.sb += 1;
    m.set(s.playerId, cur);
  }
  return m;
}

// 表示用フォーマット。null は "-"、それ以外は先頭0を省いた小数3桁（例: .333, 1.000）。
export function formatRate(value: number | null): string {
  if (value === null) return '-';
  const fixed = value.toFixed(3);
  return value < 1 ? fixed.replace(/^0/, '') : fixed;
}
