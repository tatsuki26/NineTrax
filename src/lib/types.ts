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

/**
 * 塁上のランナー（playerId）。null は空。
 * 打席入力時のプリセット・自動連動に使う（仕様書 §11 の方針拡張）。
 */
export interface BaseState {
  first: string | null;
  second: string | null;
  third: string | null;
}

export const EMPTY_BASES: BaseState = { first: null, second: null, third: null };

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
  /** 現在の塁上ランナー。打席保存時に走者結果から自動更新する。 */
  baseState: BaseState;
  /** 現在のアウトカウント 0〜2。3 で攻守交代（手動イニング送りでリセット）。 */
  outs: number;
  createdAt: number;
}

// --- 打席の詳細記録 -----------------------------------------------------------

/** 守備位置番号: 1投 2捕 3一 4二 5三 6遊 7左 8中 9右 */
export type FieldPos = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** 打球の方向ゾーン（守備位置 + 隙間 + ライン際） */
export type HitZone =
  | 'p'
  | 'c'
  | '1b'
  | '2b'
  | '3b'
  | 'ss'
  | 'lf'
  | 'cf'
  | 'rf'
  | 'gap_13' // 一二塁間
  | 'gap_56' // 三遊間
  | 'gap_lc' // 左中間
  | 'gap_rc' // 右中間
  | 'line_l' // 三塁線
  | 'line_r'; // 一塁線

export type Trajectory = 'grounder' | 'liner' | 'flyball' | 'popup' | 'bunt';
export type BallDepth = 'infield' | 'shallow' | 'medium' | 'deep';

export interface BattedBall {
  trajectory: Trajectory;
  zone: HitZone;
  depth?: BallDepth;
  hard?: boolean;
}

export interface FieldingRecord {
  /** 打球処理の順序。例: 6-4-3 併殺 = [6, 4, 3] */
  sequence: FieldPos[];
  error?: { pos: FieldPos; kind: 'field' | 'throw' };
  /** 野選（打者は生きたが他の走者を刺した/刺そうとした） */
  fieldersChoice?: boolean;
}

export type EndBase = 0 | 1 | 2 | 3 | 4; // 0=アウト, 1〜3=進塁, 4=生還

export interface RunnerEvent {
  playerId: string;
  from: 1 | 2 | 3; // 打席開始時の塁
  to: EndBase;
}

export interface AtBatDetail {
  battedBall?: BattedBall;
  fielding?: FieldingRecord;
  /** 打者走者の最終到達塁 */
  batterEndBase?: EndBase;
  /** 打席開始時に塁上にいた各走者の結果 */
  runners?: RunnerEvent[];
  /** この打席で発生したアウト数（0〜3） */
  outsRecorded?: number;
  doublePlay?: boolean;
  triplePlay?: boolean;
  /** 併殺崩れ（併殺を狙ったが打者はセーフ） */
  brokenDoublePlay?: boolean;
  note?: string;
}

export interface AtBat {
  id: string;
  playerId: string;
  order: number; // 1〜（打順）
  inning: number; // 1〜
  /** 公式記録上の結果（成績集計の基準）。詳細入力時は自動導出される。 */
  result: AtBatResult;
  rbi: number; // 0〜4
  /** 詳細記録（任意）。未設定なら従来どおり result だけの簡易記録。 */
  detail?: AtBatDetail;
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
  detail?: AtBatDetail;
};

export const EMPTY_SCORES: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
