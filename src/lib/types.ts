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

/** 守備位置。BENCH は控え（守備につかない）。 */
export type FieldPosition =
  | 'P'
  | 'C'
  | '1B'
  | '2B'
  | '3B'
  | 'SS'
  | 'LF'
  | 'CF'
  | 'RF'
  | 'DH'
  | 'BENCH';

export const FIELD_POSITIONS: FieldPosition[] = [
  'P',
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
  'DH',
  'BENCH',
];

export const FIELD_POSITION_LABELS: Record<FieldPosition, string> = {
  P: '投',
  C: '捕',
  '1B': '一',
  '2B': '二',
  '3B': '三',
  SS: '遊',
  LF: '左',
  CF: '中',
  RF: '右',
  DH: 'DH',
  BENCH: '控',
};

/** 打順1枠 = 選手 + 守備位置。配列インデックス+1 が打順。 */
export interface LineupSlot {
  playerId: string;
  position: FieldPosition;
}

/** 選手交代の記録 */
export interface Substitution {
  inning: number;
  /** 交代した打順（1〜） */
  order: number;
  outPlayerId: string;
  inPlayerId: string;
  /** 入った選手の守備位置 */
  position: FieldPosition;
  createdAt: number;
}

/** 盗塁の記録（打席とは独立。試合ドキュメントに配列で保持） */
export interface Steal {
  playerId: string;
  inning: number;
  /** 何塁への盗塁か（2=二盗, 3=三盗, 4=本盗） */
  base: 2 | 3 | 4;
  /** true なら盗塁死（CS） */
  caught: boolean;
  createdAt: number;
}

/** 自チームが先攻(first)か後攻(second)か。 */
export type OurSide = 'first' | 'second';

export interface Game {
  id: string;
  date: string; // 'YYYY-MM-DD'
  opponent: string;
  ground: string;
  season: number; // 西暦
  /** 現在の打順（先発 + 交代反映後）。配列インデックス+1 が打順。 */
  lineup: LineupSlot[];
  /** 自チームの先攻/後攻。null なら未設定（最初の打席入力前に選択させる）。 */
  ourSide: OurSide | null;
  /** 選手交代の履歴 */
  substitutions: Substitution[];
  /** 盗塁の記録 */
  steals: Steal[];
  /** 各回の得点。長さ9。null = 未入力。 */
  homeScores: (number | null)[];
  awayScores: (number | null)[];
  /**
   * 「何回まで終わったか」。スコアボードはこの回数までのセルだけ数字を表示する。
   * これより後の回は保存値が 0 でも空欄（未終了扱い）。
   */
  homeInningsDone: number;
  awayInningsDone: number;
  status: GameStatus;
  createdAt: number;
}

// --- 打席の付加情報（統一入力：結果 → 方向 → 打点）-------------------------

/** 打球の方向ゾーン（守備位置 + 隙間 + ライン際）。 */
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

/** 打球方向。'unknown' は「不明」。 */
export type Direction = HitZone | 'unknown';

export type Trajectory = 'grounder' | 'liner' | 'flyball' | 'popup' | 'bunt';

export interface AtBatDetail {
  /** 打球性質（ゴロ・フライ等）。三振・四死球など打球のない結果では未設定。 */
  kind?: Trajectory;
  /** 打球方向。'unknown' は「不明」ボタン。 */
  zone?: Direction;
  /** 併殺打 */
  gidp?: boolean;
}

export interface AtBat {
  id: string;
  playerId: string;
  /** 打順上の位置（lineup のインデックス+1、外なら 0）。集計は playerId 基準。 */
  order: number;
  inning: number; // 1〜
  /** 公式記録上の結果（成績集計の基準）。選んだ結果から自動導出。 */
  result: AtBatResult;
  rbi: number; // 0〜4
  /** 方向・打球性質などの付加情報（任意）。 */
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
  lineup: LineupSlot[];
};
export type AtBatInput = {
  playerId: string;
  order: number;
  inning: number;
  result: AtBatResult;
  rbi: number;
  detail?: AtBatDetail;
};

export const EMPTY_SCORES: (number | null)[] = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];
