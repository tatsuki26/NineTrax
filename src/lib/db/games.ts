'use client';

import {
  addDoc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { BaseState, Game, GameInput } from '@/lib/types';
import { EMPTY_BASES, EMPTY_SCORES } from '@/lib/types';
import { getDb } from '@/lib/firebase';
import { gamesCol, gameDoc, atbatsCol } from './refs';

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return Date.now();
}

function normalizeScores(v: unknown): number[] {
  if (!Array.isArray(v)) return [...EMPTY_SCORES];
  const out = [...EMPTY_SCORES];
  for (let i = 0; i < 9; i++) out[i] = typeof v[i] === 'number' ? v[i] : 0;
  return out;
}

function normalizeBases(v: unknown): BaseState {
  const b = (v ?? {}) as Partial<BaseState>;
  return {
    first: typeof b.first === 'string' ? b.first : null,
    second: typeof b.second === 'string' ? b.second : null,
    third: typeof b.third === 'string' ? b.third : null,
  };
}

export function toGame(id: string, data: Record<string, unknown>): Game {
  return {
    id,
    date: (data.date as string) ?? '',
    opponent: (data.opponent as string) ?? '',
    ground: (data.ground as string) ?? '',
    season: (data.season as number) ?? new Date().getFullYear(),
    lineup: Array.isArray(data.lineup) ? (data.lineup as string[]) : [],
    homeScores: normalizeScores(data.homeScores),
    awayScores: normalizeScores(data.awayScores),
    status: (data.status as Game['status']) ?? 'in_progress',
    baseState: normalizeBases(data.baseState),
    outs: typeof data.outs === 'number' ? Math.max(0, Math.min(3, data.outs)) : 0,
    createdAt: toMillis(data.createdAt),
  };
}

export async function listGames(
  teamId: string,
  season?: number,
): Promise<Game[]> {
  const base = season
    ? query(gamesCol(teamId), where('season', '==', season), orderBy('date', 'desc'))
    : query(gamesCol(teamId), orderBy('date', 'desc'));
  const snap = await getDocs(base);
  return snap.docs.map((d) => toGame(d.id, d.data()));
}

export async function getGame(
  teamId: string,
  gameId: string,
): Promise<Game | null> {
  const snap = await getDoc(gameDoc(teamId, gameId));
  return snap.exists() ? toGame(snap.id, snap.data()) : null;
}

export async function createGame(
  teamId: string,
  input: GameInput,
): Promise<Game> {
  const payload = {
    date: input.date,
    opponent: input.opponent,
    ground: input.ground,
    season: input.season,
    lineup: input.lineup,
    homeScores: [...EMPTY_SCORES],
    awayScores: [...EMPTY_SCORES],
    status: 'in_progress' as const,
    baseState: { ...EMPTY_BASES },
    outs: 0,
    createdAt: serverTimestamp(),
  };
  const ref = await addDoc(gamesCol(teamId), payload);
  return toGame(ref.id, { ...payload, createdAt: Date.now() });
}

// スコア手入力・status 変更・lineup 修正などすべてこれを使う（仕様書 §1.3）。
export async function updateGame(
  teamId: string,
  gameId: string,
  patch: Partial<Omit<Game, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(gameDoc(teamId, gameId), patch);
}

// 試合削除。配下の atbats も一括削除する（仕様書 §11.3）。
export async function deleteGame(
  teamId: string,
  gameId: string,
): Promise<void> {
  const atbats = await getDocs(atbatsCol(teamId, gameId));
  const db = getDb();
  let batch = writeBatch(db);
  let count = 0;
  for (const d of atbats.docs) {
    batch.delete(d.ref);
    count += 1;
    if (count >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  }
  batch.delete(gameDoc(teamId, gameId));
  await batch.commit();
}
