// docs/実装分担.md §1.3 players.ts の I/F。【一時モック実装】
import type { Player } from '../types';
import { genId, getSnapshot, mutate } from './_store';

export async function listPlayers(
  teamId: string,
  opts?: { includeArchived?: boolean },
): Promise<Player[]> {
  const all = getSnapshot().players[teamId] ?? [];
  const filtered = opts?.includeArchived ? all : all.filter((p) => !p.archived);
  return filtered.map((p) => ({ ...p }));
}

export async function createPlayer(
  teamId: string,
  input: { name: string; number: number | null },
): Promise<Player> {
  const player: Player = {
    id: genId('p'),
    name: input.name,
    number: input.number,
    archived: false,
  };
  mutate((snap) => {
    if (!snap.players[teamId]) snap.players[teamId] = [];
    snap.players[teamId].push(player);
  });
  return player;
}

export async function updatePlayer(
  teamId: string,
  playerId: string,
  patch: Partial<Pick<Player, 'name' | 'number'>>,
): Promise<void> {
  mutate((snap) => {
    const p = (snap.players[teamId] ?? []).find((x) => x.id === playerId);
    if (!p) return;
    if (patch.name !== undefined) p.name = patch.name;
    if (patch.number !== undefined) p.number = patch.number;
  });
}

export async function archivePlayer(teamId: string, playerId: string): Promise<void> {
  mutate((snap) => {
    const p = (snap.players[teamId] ?? []).find((x) => x.id === playerId);
    if (p) p.archived = true;
  });
}
