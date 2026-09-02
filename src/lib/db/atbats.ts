'use client';

import {
  addDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import type { AtBat, AtBatDetail, AtBatInput } from '@/lib/types';
import { atbatsCol, atbatDoc } from './refs';

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return 0;
}

// Firestore は undefined を受け付けないため、書き込み前に再帰的に取り除く。
function pruneUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => pruneUndefined(v)) as unknown as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === undefined) continue;
      out[k] = pruneUndefined(v);
    }
    return out as T;
  }
  return value;
}

export function toAtBat(id: string, data: Record<string, unknown>): AtBat {
  // 並び替えキーはクライアント時刻 `ts` を優先する。
  // serverTimestamp() は書き込み確定まで null で、orderBy('createdAt') では
  // 楽観的更新が即反映されず「次打者が進まない」不具合の原因になる。
  const ts = typeof data.ts === 'number' ? data.ts : toMillis(data.createdAt);
  const ab: AtBat = {
    id,
    playerId: (data.playerId as string) ?? '',
    order: (data.order as number) ?? 0,
    inning: (data.inning as number) ?? 1,
    result: data.result as AtBat['result'],
    rbi: (data.rbi as number) ?? 0,
    createdAt: ts,
  };
  if (data.detail && typeof data.detail === 'object') {
    ab.detail = data.detail as AtBatDetail;
  }
  return ab;
}

export function sortAtBats(rows: AtBat[]): AtBat[] {
  return [...rows].sort((a, b) => a.createdAt - b.createdAt);
}

// 入力順。orderBy は使わず全件取得してクライアント側で並び替える
// （楽観的更新を即座に反映するため）。
export async function listAtBats(
  teamId: string,
  gameId: string,
): Promise<AtBat[]> {
  const snap = await getDocs(atbatsCol(teamId, gameId));
  return sortAtBats(snap.docs.map((d) => toAtBat(d.id, d.data())));
}

export async function addAtBat(
  teamId: string,
  gameId: string,
  input: AtBatInput,
): Promise<AtBat> {
  const ts = Date.now();
  const payload = pruneUndefined({ ...input, ts, createdAt: serverTimestamp() });
  const ref = await addDoc(atbatsCol(teamId, gameId), payload);
  return toAtBat(ref.id, { ...payload, ts, createdAt: ts });
}

export async function updateAtBat(
  teamId: string,
  gameId: string,
  atbatId: string,
  patch: Partial<AtBatInput>,
): Promise<void> {
  await updateDoc(atbatDoc(teamId, gameId, atbatId), pruneUndefined(patch));
}

export async function deleteAtBat(
  teamId: string,
  gameId: string,
  atbatId: string,
): Promise<void> {
  await deleteDoc(atbatDoc(teamId, gameId, atbatId));
}
