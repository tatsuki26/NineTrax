// docs/実装分担.md §1.3 teams.ts の I/F。【一時モック実装】
import type { Team } from '../types';
import { getSnapshot, mutate } from './_store';

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';

function generateTeamId(): string {
  const bytes =
    typeof crypto !== 'undefined' && crypto.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(12))
      : Array.from({ length: 12 }, () => Math.floor(Math.random() * 256));
  let out = '';
  for (let i = 0; i < 12; i++) out += BASE32[bytes[i] % 32];
  return out;
}

export async function getTeam(teamId: string): Promise<Team | null> {
  return getSnapshot().teams[teamId] ?? null;
}

export async function createTeam(name: string): Promise<Team> {
  const team: Team = { id: generateTeamId(), name, createdAt: Date.now() };
  mutate((snap) => {
    snap.teams[team.id] = team;
    snap.players[team.id] = [];
    snap.games[team.id] = [];
  });
  return team;
}

export async function updateTeamName(teamId: string, name: string): Promise<void> {
  mutate((snap) => {
    const t = snap.teams[teamId];
    if (t) t.name = name;
  });
}

export async function reissueTeamId(teamId: string): Promise<string> {
  const newId = generateTeamId();
  mutate((snap) => {
    const old = snap.teams[teamId];
    if (!old) return;
    snap.teams[newId] = { ...old, id: newId };
    snap.players[newId] = snap.players[teamId] ?? [];
    snap.games[newId] = snap.games[teamId] ?? [];
    for (const key of Object.keys(snap.atbats)) {
      if (key.startsWith(`${teamId}/`)) {
        const rest = key.slice(teamId.length + 1);
        snap.atbats[`${newId}/${rest}`] = snap.atbats[key];
        delete snap.atbats[key];
      }
    }
    delete snap.teams[teamId];
    delete snap.players[teamId];
    delete snap.games[teamId];
  });
  return newId;
}
