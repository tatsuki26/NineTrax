'use client';

// onSnapshot ベースのリアルタイム購読フック（仕様書 §1.3 / §11.1）。
// 打席入力・スコアボードなど複数端末で同時に見る画面はこれを使う。

import { useEffect, useState } from 'react';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import type { AtBat, Game, Player } from '@/lib/types';
import { gameDoc, atbatsCol, playersCol, gamesCol } from './refs';
import { toGame } from './games';
import { toAtBat, sortAtBats } from './atbats';

function toPlayer(id: string, data: Record<string, unknown>): Player {
  return {
    id,
    name: (data.name as string) ?? '',
    number: data.number === undefined ? null : (data.number as number | null),
    archived: (data.archived as boolean) ?? false,
  };
}

export function useGame(
  teamId: string,
  gameId: string,
): { game: Game | null; loading: boolean } {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(gameDoc(teamId, gameId), (snap) => {
      setGame(snap.exists() ? toGame(snap.id, snap.data()) : null);
      setLoading(false);
    });
    return unsub;
  }, [teamId, gameId]);

  return { game, loading };
}

export function useAtBats(
  teamId: string,
  gameId: string,
): { atbats: AtBat[]; loading: boolean } {
  const [atbats, setAtBats] = useState<AtBat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // orderBy を使わず全件購読し、クライアント側で `ts` 昇順に並べる
    // （serverTimestamp の楽観的更新を即座に反映するため）。
    const unsub = onSnapshot(atbatsCol(teamId, gameId), (snap) => {
      setAtBats(sortAtBats(snap.docs.map((d) => toAtBat(d.id, d.data()))));
      setLoading(false);
    });
    return unsub;
  }, [teamId, gameId]);

  return { atbats, loading };
}

export function usePlayers(
  teamId: string,
  opts?: { includeArchived?: boolean },
): { players: Player[]; loading: boolean } {
  const includeArchived = opts?.includeArchived ?? false;
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(playersCol(teamId), orderBy('name'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => toPlayer(d.id, d.data()));
      setPlayers(includeArchived ? all : all.filter((p) => !p.archived));
      setLoading(false);
    });
    return unsub;
  }, [teamId, includeArchived]);

  return { players, loading };
}

export function useGames(teamId: string): { games: Game[]; loading: boolean } {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const q = query(gamesCol(teamId), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setGames(snap.docs.map((d) => toGame(d.id, d.data())));
      setLoading(false);
    });
    return unsub;
  }, [teamId]);

  return { games, loading };
}
