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
import type {
  FieldPosition,
  Game,
  GameInput,
  LineupSlot,
  OurSide,
  Substitution,
} from '@/lib/types';
import { EMPTY_SCORES, FIELD_POSITIONS } from '@/lib/types';
import { getDb } from '@/lib/firebase';
import { gamesCol, gameDoc, atbatsCol } from './refs';

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return Date.now();
}

function normalizeScores(v: unknown): (number | null)[] {
  const out = [...EMPTY_SCORES];
  if (Array.isArray(v)) {
    for (let i = 0; i < 9; i++) out[i] = typeof v[i] === 'number' ? v[i] : null;
  }
  return out;
}

// 旧形式（string[]）も新形式（LineupSlot[]）も受け付ける。
function normalizeLineup(v: unknown): LineupSlot[] {
  if (!Array.isArray(v)) return [];
  return v.map((entry, i): LineupSlot => {
    if (typeof entry === 'string') {
      return { playerId: entry, position: i < 9 ? FIELD_POSITIONS[i] : 'BENCH' };
    }
    const e = (entry ?? {}) as Partial<LineupSlot>;
    return {
      playerId: typeof e.playerId === 'string' ? e.playerId : '',
      position: FIELD_POSITIONS.includes(e.position as FieldPosition)
        ? (e.position as FieldPosition)
        : 'BENCH',
    };
  });
}

function normalizeSubs(v: unknown): Substitution[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s): Substitution | null => {
      const e = (s ?? {}) as Partial<Substitution>;
      if (!e.outPlayerId || !e.inPlayerId) return null;
      return {
        inning: typeof e.inning === 'number' ? e.inning : 1,
        order: typeof e.order === 'number' ? e.order : 0,
        outPlayerId: e.outPlayerId,
        inPlayerId: e.inPlayerId,
        position: FIELD_POSITIONS.includes(e.position as FieldPosition)
          ? (e.position as FieldPosition)
          : 'BENCH',
        createdAt: typeof e.createdAt === 'number' ? e.createdAt : Date.now(),
      };
    })
    .filter((s): s is Substitution => s !== null);
}

export function toGame(id: string, data: Record<string, unknown>): Game {
  const side = data.ourSide;
  return {
    id,
    date: (data.date as string) ?? '',
    opponent: (data.opponent as string) ?? '',
    ground: (data.ground as string) ?? '',
    season: (data.season as number) ?? new Date().getFullYear(),
    lineup: normalizeLineup(data.lineup),
    ourSide: side === 'first' || side === 'second' ? (side as OurSide) : null,
    substitutions: normalizeSubs(data.substitutions),
    homeScores: normalizeScores(data.homeScores),
    awayScores: normalizeScores(data.awayScores),
    homeInningsDone: clampDone(data.homeInningsDone),
    awayInningsDone: clampDone(data.awayInningsDone),
    status: (data.status as Game['status']) ?? 'in_progress',
    createdAt: toMillis(data.createdAt),
  };
}

function clampDone(v: unknown): number {
  return typeof v === 'number' ? Math.max(0, Math.min(9, Math.floor(v))) : 0;
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
    ourSide: null,
    substitutions: [],
    homeScores: [...EMPTY_SCORES],
    awayScores: [...EMPTY_SCORES],
    homeInningsDone: 0,
    awayInningsDone: 0,
    status: 'in_progress' as const,
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
