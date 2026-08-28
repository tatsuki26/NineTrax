// docs/実装分担.md §1.3 hooks.ts の I/F（リアルタイム）。【一時モック実装】
// onSnapshot の代わりに _store の pub/sub を購読して再取得する。
'use client';

import { useEffect, useState } from 'react';
import type { AtBat, Game, Player, Team } from '../types';
import { listAtBats } from './atbats';
import { getGame, listGames } from './games';
import { listPlayers } from './players';
import { subscribe } from './_store';
import { getTeam } from './teams';

function useLive<T>(load: () => Promise<T>, initial: T, deps: unknown[]) {
  const [value, setValue] = useState<T>(initial);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const run = () => {
      load().then((v) => {
        if (!alive) return;
        setValue(v);
        setLoading(false);
      });
    };
    run();
    const unsub = subscribe(run);
    return () => {
      alive = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { value, loading };
}

export function useGame(teamId: string, gameId: string): { game: Game | null; loading: boolean } {
  const { value, loading } = useLive<Game | null>(
    () => getGame(teamId, gameId),
    null,
    [teamId, gameId],
  );
  return { game: value, loading };
}

/** createdAt 昇順。 */
export function useAtBats(
  teamId: string,
  gameId: string,
): { atbats: AtBat[]; loading: boolean } {
  const { value, loading } = useLive<AtBat[]>(
    () => listAtBats(teamId, gameId),
    [],
    [teamId, gameId],
  );
  return { atbats: value, loading };
}

export function usePlayers(
  teamId: string,
  opts?: { includeArchived?: boolean },
): { players: Player[]; loading: boolean } {
  const { value, loading } = useLive<Player[]>(
    () => listPlayers(teamId, opts),
    [],
    [teamId, opts?.includeArchived],
  );
  return { players: value, loading };
}

// --- 以下は担当B が追加した補助フック（契約外・リアルタイム便宜用） ---

export function useTeam(teamId: string): { team: Team | null; loading: boolean } {
  const { value, loading } = useLive<Team | null>(() => getTeam(teamId), null, [teamId]);
  return { team: value, loading };
}

export function useGames(
  teamId: string,
  season?: number,
): { games: Game[]; loading: boolean } {
  const { value, loading } = useLive<Game[]>(
    () => listGames(teamId, season),
    [],
    [teamId, season],
  );
  return { games: value, loading };
}
