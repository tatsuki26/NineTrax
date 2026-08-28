// チームカラーのプリセット。ロゴ未設定時のアバター背景に使う。
// いずれも白文字が乗る前提の十分に濃い色を選んでいる。

export interface TeamColorOption {
  value: string; // HEX
  label: string;
}

export const TEAM_COLORS: TeamColorOption[] = [
  { value: '#2f7a3d', label: 'グラス' },
  { value: '#1d4ed8', label: 'ブルー' },
  { value: '#b91c1c', label: 'レッド' },
  { value: '#c2410c', label: 'クレー' },
  { value: '#a16207', label: 'ゴールド' },
  { value: '#0f766e', label: 'ティール' },
  { value: '#6d28d9', label: 'パープル' },
  { value: '#334155', label: 'スレート' },
];

export const DEFAULT_TEAM_COLOR = TEAM_COLORS[0].value;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

/** 不正・未指定の値はデフォルト色に丸める。 */
export function normalizeTeamColor(value: unknown): string {
  if (typeof value === 'string' && HEX_RE.test(value)) return value.toLowerCase();
  return DEFAULT_TEAM_COLOR;
}

/** チーム名から頭文字（アバター表示用）を1文字取り出す。 */
export function teamInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? Array.from(trimmed)[0] : '⚾';
}
