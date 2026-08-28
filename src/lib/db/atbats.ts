// docs/実装分担.md §1.3 atbats.ts の I/F。【一時モック実装】
import type { AtBat, AtBatResult } from '../types';
import { genId, getSnapshot, mutate } from './_store';

export type AddAtBatInput = {
  playerId: string;
  order: number;
  inning: number;
  result: AtBatResult;
  rbi: number;
};

function key(teamId: string, gameId: string): string {
  return `${teamId}/${gameId}`;
}

/** createdAt 昇順で返す。 */
export async function listAtBats(teamId: string, gameId: string): Promise<AtBat[]> {
  const all = getSnapshot().atbats[key(teamId, gameId)] ?? [];
  return [...all].sort((a, b) => a.createdAt - b.createdAt).map((a) => ({ ...a }));
}

export async function addAtBat(
  teamId: string,
  gameId: string,
  input: AddAtBatInput,
): Promise<AtBat> {
  const atbat: AtBat = {
    id: genId('ab'),
    playerId: input.playerId,
    order: input.order,
    inning: input.inning,
    result: input.result,
    rbi: input.rbi,
    createdAt: Date.now(),
  };
  mutate((snap) => {
    const k = key(teamId, gameId);
    if (!snap.atbats[k]) snap.atbats[k] = [];
    snap.atbats[k].push(atbat);
  });
  return atbat;
}

export async function updateAtBat(
  teamId: string,
  gameId: string,
  atbatId: string,
  patch: Partial<Pick<AtBat, 'playerId' | 'order' | 'inning' | 'result' | 'rbi'>>,
): Promise<void> {
  mutate((snap) => {
    const ab = (snap.atbats[key(teamId, gameId)] ?? []).find((x) => x.id === atbatId);
    if (ab) Object.assign(ab, patch);
  });
}

export async function deleteAtBat(
  teamId: string,
  gameId: string,
  atbatId: string,
): Promise<void> {
  mutate((snap) => {
    const k = key(teamId, gameId);
    snap.atbats[k] = (snap.atbats[k] ?? []).filter((x) => x.id !== atbatId);
  });
}
