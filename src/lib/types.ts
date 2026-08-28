// アプリ全体で共有するエンティティ型と enum。
// この I/F は担当A が管理する。変更時は担当B へ連絡すること（docs/実装分担.md §4）。

export type AtBatResult =
  | 'single'
  | 'double'
  | 'triple'
  | 'homerun'
  | 'walk'
  | 'hitByPitch'
  | 'sacBunt'
  | 'sacFly'
  | 'reachedOnError'
  | 'out'
  | 'strikeout';

export const AT_BAT_RESULTS: AtBatResult[] = [
  'single',
  'double',
  'triple',
  'homerun',
  'walk',
  'hitByPitch',
  'sacBunt',
  'sacFly',
  'reachedOnError',
  'out',
  'strikeout',
];

export const AT_BAT_RESULT_LABELS: Record<AtBatResult, string> = {
  single: '単打',
  double: '二塁打',
  triple: '三塁打',
  homerun: '本塁打',
  walk: '四球',
  hitByPitch: '死球',
  sacBunt: '犠打',
  sacFly: '犠飛',
  reachedOnError: '失策出塁',
  out: '凡打',
  strikeout: '三振',
};

export type GameStatus = 'in_progress' | 'finished';

export interface Team {
  id: string;
  name: string;
  /** チームカラー（HEX, 例 "#2f7a3d"）。ロゴ未設定時のアバター背景色にも使う。 */
  color: string;
  /**
   * チームロゴ。設定時は縮小した data URL（Firestore に直接保存）。
   * 未設定なら null で、UI は color + 頭文字のアバターを表示する。
   * 将来 Firebase Storage の URL に差し替え可能。
   */
  logoUrl: string | null;
  createdAt: number;
}

export interface Player {
  id: string;
  name: string;
  number: number | null;
  archived: boolean;
}

export interface Game {
  id: string;
  date: string; // 'YYYY-MM-DD'
  opponent: string;
  ground: string;
  season: number; // 西暦
  lineup: string[]; // playerId、打順順、任意長
  homeScores: number[]; // 長さ9、未入力は 0
  awayScores: number[]; // 長さ9、未入力は 0
  status: GameStatus;
  createdAt: number;
}

export interface AtBat {
  id: string;
  playerId: string;
  order: number; // 1〜（打順）
  inning: number; // 1〜
  result: AtBatResult;
  rbi: number; // 0〜4
  createdAt: number;
}

// lib/stats.ts が返す集計結果。avg/obp/slg/ops は AB=0 のとき null（UIで "-" 表示）。
export interface StatLine {
  pa: number;
  ab: number;
  h: number;
  tb: number;
  single: number;
  double: number;
  triple: number;
  homerun: number;
  walk: number;
  hitByPitch: number;
  strikeout: number;
  sacBunt: number;
  sacFly: number;
  reachedOnError: number;
  out: number;
  rbi: number;
  avg: number | null;
  obp: number | null;
  slg: number | null;
  ops: number | null;
}

// 新規作成時の入力型（id / createdAt はアクセス層で付与）
export type PlayerInput = { name: string; number: number | null };
export type GameInput = {
  date: string;
  opponent: string;
  ground: string;
  season: number;
  lineup: string[];
};
export type AtBatInput = {
  playerId: string;
  order: number;
  inning: number;
  result: AtBatResult;
  rbi: number;
};

export const EMPTY_SCORES: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
