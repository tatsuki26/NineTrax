'use client';

import {
  addDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from 'firebase/firestore';
import type { Player, PlayerInput } from '@/lib/types';
import { playersCol, playerDoc } from './refs';

function toPlayer(id: string, data: Record<string, unknown>): Player {
  return {
    id,
    name: (data.name as string) ?? '',
    number: data.number === undefined ? null : (data.number as number | null),
    archived: (data.archived as boolean) ?? false,
  };
}

export async function listPlayers(
  teamId: string,
  opts?: { includeArchived?: boolean },
): Promise<Player[]> {
  const snap = await getDocs(query(playersCol(teamId), orderBy('name')));
  const all = snap.docs.map((d) => toPlayer(d.id, d.data()));
  return opts?.includeArchived ? all : all.filter((p) => !p.archived);
}

export async function createPlayer(
  teamId: string,
  input: PlayerInput,
): Promise<Player> {
  const ref = await addDoc(playersCol(teamId), {
    name: input.name,
    number: input.number,
    archived: false,
  });
  return { id: ref.id, name: input.name, number: input.number, archived: false };
}

export async function updatePlayer(
  teamId: string,
  playerId: string,
  patch: Partial<PlayerInput>,
): Promise<void> {
  await updateDoc(playerDoc(teamId, playerId), patch);
}

// 論理削除（仕様書 §11.1）。過去の打席記録は保持する。
export async function archivePlayer(
  teamId: string,
  playerId: string,
): Promise<void> {
  await updateDoc(playerDoc(teamId, playerId), { archived: true });
}

export async function unarchivePlayer(
  teamId: string,
  playerId: string,
): Promise<void> {
  await updateDoc(playerDoc(teamId, playerId), { archived: false });
}
