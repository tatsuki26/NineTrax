// docs/実装分担.md §1.3 games.ts の I/F。【一時モック実装】
import type { Game } from '../types';
import { genId, getSnapshot, mutate } from './_store';

export type CreateGameInput = {
  date: string;
  opponent: string;
  ground: string;
  season: number;
  lineup: string[];
};

function sortGames(games: Game[]): Game[] {
  return [...games].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });
}

export async function listGames(teamId: string, season?: number): Promise<Game[]> {
  const all = getSnapshot().games[teamId] ?? [];
  const filtered = season === undefined ? all : all.filter((g) => g.season === season);
  return sortGames(filtered).map((g) => ({ ...g }));
}

export async function getGame(teamId: string, gameId: string): Promise<Game | null> {
  const g = (getSnapshot().games[teamId] ?? []).find((x) => x.id === gameId);
  return g ? { ...g } : null;
}

export async function createGame(teamId: string, input: CreateGameInput): Promise<Game> {
  const game: Game = {
    id: genId('g'),
    date: input.date,
    opponent: input.opponent,
    ground: input.ground,
    season: input.season,
    lineup: [...input.lineup],
    homeScores: Array(9).fill(0),
    awayScores: Array(9).fill(0),
    status: 'in_progress',
    createdAt: Date.now(),
  };
  mutate((snap) => {
    if (!snap.games[teamId]) snap.games[teamId] = [];
    snap.games[teamId].push(game);
  });
  return game;
}

export async function updateGame(
  teamId: string,
  gameId: string,
  patch: Partial<Omit<Game, 'id' | 'createdAt'>>,
): Promise<void> {
  mutate((snap) => {
    const g = (snap.games[teamId] ?? []).find((x) => x.id === gameId);
    if (!g) return;
    Object.assign(g, patch);
  });
}

export async function deleteGame(teamId: string, gameId: string): Promise<void> {
  mutate((snap) => {
    snap.games[teamId] = (snap.games[teamId] ?? []).filter((x) => x.id !== gameId);
    delete snap.atbats[`${teamId}/${gameId}`];
  });
}
