// docs/実装分担.md §1.2 のとおり。担当A が管理する共有契約。
// 変更する場合は担当Bと相互連絡すること。

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

// 打席入力ボタンの並び順（UI用）
export const AT_BAT_RESULT_ORDER: AtBatResult[] = [
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

export interface Team {
  id: string;
  name: string;
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
  awayScores: number[];
  status: 'in_progress' | 'finished';
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

// 集計結果（lib/stats.ts が返す）
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
  avg: number | null; // AB=0 は null（UIで "-" 表示）
  obp: number | null;
  slg: number | null;
  ops: number | null;
}
