// ---------------------------------------------------------------------------
// 【一時的なモック実装】担当A の Firestore 実装が未 push のため、
// docs/実装分担.md §1.3 の I/F を localStorage 上のインメモリDBで満たしている。
// リアルタイム反映は同一ブラウザ内の pub/sub と storage イベントで疑似再現する。
// 担当A の src/lib/db/* が入ったら、このファイルと db 各ファイルを差し替えること。
// ---------------------------------------------------------------------------

import type { AtBat, Game, Player, Team } from '../types';

interface Snapshot {
  teams: Record<string, Team>;
  players: Record<string, Player[]>; // key: teamId
  games: Record<string, Game[]>; // key: teamId
  atbats: Record<string, AtBat[]>; // key: `${teamId}/${gameId}`
}

const STORAGE_KEY = 'ninetrax:mock-db:v1';

const listeners = new Set<() => void>();

function emptySnapshot(): Snapshot {
  return { teams: {}, players: {}, games: {}, atbats: {} };
}

function seed(snap: Snapshot): Snapshot {
  // デモ用チーム（12文字 base32: a-z2-7）
  const teamId = 'demoteam2345';
  const now = Date.now();
  snap.teams[teamId] = { id: teamId, name: 'デモ草野球クラブ', createdAt: now };
  snap.players[teamId] = [
    { id: 'p1', name: '田中', number: 7, archived: false },
    { id: 'p2', name: '佐藤', number: 4, archived: false },
    { id: 'p3', name: '鈴木', number: 10, archived: false },
    { id: 'p4', name: '高橋', number: 1, archived: false },
    { id: 'p5', name: '伊藤', number: 24, archived: false },
  ];
  snap.games[teamId] = [];
  return snap;
}

let cache: Snapshot | null = null;

function read(): Snapshot {
  if (cache) return cache;
  if (typeof window === 'undefined') {
    cache = emptySnapshot();
    return cache;
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      cache = JSON.parse(raw) as Snapshot;
      return cache;
    }
  } catch {
    // ignore parse errors, fall through to seed
  }
  cache = seed(emptySnapshot());
  persist();
  return cache;
}

function persist() {
  if (typeof window === 'undefined' || !cache) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // storage full / disabled — 無視（インメモリでは動作継続）
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      cache = null; // 次回 read で再読込
      listeners.forEach((l) => l());
    }
  });
}

/** 変更を通知する（onSnapshot 相当）。 */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 読み取り＋書き込みを行い、リスナーへ通知する。 */
export function mutate(fn: (snap: Snapshot) => void): void {
  const snap = read();
  fn(snap);
  persist();
  listeners.forEach((l) => l());
}

/** 現在のスナップショットを読む（読み取り専用として扱うこと）。 */
export function getSnapshot(): Snapshot {
  return read();
}

export function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

/** テスト・デバッグ用。DBを初期化する。 */
export function _resetForTest(): void {
  cache = seed(emptySnapshot());
  persist();
  listeners.forEach((l) => l());
}
