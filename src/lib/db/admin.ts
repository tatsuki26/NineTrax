'use client';

// アプリ管理画面用のデータアクセス（全チーム横断）。admins/{uid} を持つユーザーのみ実行できる
// （Firestore ルールで保護。firestore.rules 参照）。

import {
  collectionGroup,
  getCountFromServer,
  getDocs,
  orderBy,
  query,
  where,
  writeBatch,
} from 'firebase/firestore';
import type { Team } from '@/lib/types';
import { getDb } from '@/lib/firebase';
import { teamsCol, teamDoc, playersCol, gamesCol, atbatsCol } from './refs';

export interface TeamWithStats extends Team {
  gameCount: number;
}

export async function listAllTeams(): Promise<Team[]> {
  const snap = await getDocs(query(teamsCol(), orderBy('createdAt', 'desc')));
  return snap.docs.map((d) => ({
    id: d.id,
    name: (d.data().name as string) ?? '',
    createdAt:
      typeof d.data().createdAt?.toMillis === 'function'
        ? d.data().createdAt.toMillis()
        : Date.now(),
  }));
}

export async function countAllGames(): Promise<number> {
  const snap = await getCountFromServer(collectionGroup(getDb(), 'games'));
  return snap.data().count;
}

// 直近 days 日以内に試合があるチームを「アクティブ」とみなす。
export async function countActiveTeams(days = 60): Promise<number> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);
  const snap = await getDocs(
    query(collectionGroup(getDb(), 'games'), where('date', '>=', sinceStr)),
  );
  const teamIds = new Set<string>();
  for (const d of snap.docs) {
    // path: teams/{teamId}/games/{gameId}
    const teamId = d.ref.parent.parent?.id;
    if (teamId) teamIds.add(teamId);
  }
  return teamIds.size;
}

// チームの完全削除（運営用）。players / games / games/*/atbats と team 本体をまとめて消す。
export async function deleteTeam(teamId: string): Promise<void> {
  const db = getDb();
  let batch = writeBatch(db);
  let count = 0;
  const flush = async (force = false) => {
    if (force || count >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      count = 0;
    }
  };

  const players = await getDocs(playersCol(teamId));
  for (const p of players.docs) {
    batch.delete(p.ref);
    count += 1;
    await flush();
  }

  const games = await getDocs(gamesCol(teamId));
  for (const g of games.docs) {
    const atbats = await getDocs(atbatsCol(teamId, g.id));
    for (const a of atbats.docs) {
      batch.delete(a.ref);
      count += 1;
      await flush();
    }
    batch.delete(g.ref);
    count += 1;
    await flush();
  }

  batch.delete(teamDoc(teamId));
  await flush(true);
}
