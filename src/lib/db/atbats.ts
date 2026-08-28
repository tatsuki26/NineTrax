'use client';

import {
  addDoc,
  deleteDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import type { AtBat, AtBatInput } from '@/lib/types';
import { atbatsCol, atbatDoc } from './refs';

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return Date.now();
}

export function toAtBat(id: string, data: Record<string, unknown>): AtBat {
  return {
    id,
    playerId: (data.playerId as string) ?? '',
    order: (data.order as number) ?? 0,
    inning: (data.inning as number) ?? 1,
    result: data.result as AtBat['result'],
    rbi: (data.rbi as number) ?? 0,
    createdAt: toMillis(data.createdAt),
  };
}

// createdAt 昇順（入力順）。
export async function listAtBats(
  teamId: string,
  gameId: string,
): Promise<AtBat[]> {
  const snap = await getDocs(
    query(atbatsCol(teamId, gameId), orderBy('createdAt', 'asc')),
  );
  return snap.docs.map((d) => toAtBat(d.id, d.data()));
}

export async function addAtBat(
  teamId: string,
  gameId: string,
  input: AtBatInput,
): Promise<AtBat> {
  const payload = { ...input, createdAt: serverTimestamp() };
  const ref = await addDoc(atbatsCol(teamId, gameId), payload);
  return toAtBat(ref.id, { ...payload, createdAt: Date.now() });
}

export async function updateAtBat(
  teamId: string,
  gameId: string,
  atbatId: string,
  patch: Partial<AtBatInput>,
): Promise<void> {
  await updateDoc(atbatDoc(teamId, gameId, atbatId), patch);
}

export async function deleteAtBat(
  teamId: string,
  gameId: string,
  atbatId: string,
): Promise<void> {
  await deleteDoc(atbatDoc(teamId, gameId, atbatId));
}
