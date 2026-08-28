'use client';

import {
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore';
import type { Team } from '@/lib/types';
import { generateTeamId } from '@/lib/ids';
import { getDb } from '@/lib/firebase';
import {
  teamDoc,
  playersCol,
  playerDoc,
  gamesCol,
  gameDoc,
  atbatsCol,
  atbatDoc,
} from './refs';

function toMillis(v: unknown): number {
  if (v instanceof Timestamp) return v.toMillis();
  if (typeof v === 'number') return v;
  return Date.now();
}

export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(teamDoc(teamId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    name: data.name ?? '',
    createdAt: toMillis(data.createdAt),
  };
}

export async function createTeam(name: string): Promise<Team> {
  // ID 衝突は極めて稀だが一応リトライする
  for (let attempt = 0; attempt < 5; attempt++) {
    const id = generateTeamId();
    const ref = teamDoc(id);
    if ((await getDoc(ref)).exists()) continue;
    await setDoc(ref, { name, createdAt: serverTimestamp() });
    return { id, name, createdAt: Date.now() };
  }
  throw new Error('チームIDの生成に失敗しました（衝突が続きました）');
}

export async function updateTeamName(teamId: string, name: string): Promise<void> {
  await updateDoc(teamDoc(teamId), { name });
}

// チームIDの再発行。新IDでチームを作り直し、players / games / games/*/atbats を移行してから
// 旧ツリーを削除する。旧URLは即座に無効になる（仕様書 §11.1）。戻り値は新しい teamId。
export async function reissueTeamId(teamId: string): Promise<string> {
  const team = await getTeam(teamId);
  if (!team) throw new Error('チームが見つかりません');

  let newId = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generateTeamId();
    if (!(await getDoc(teamDoc(candidate))).exists()) {
      newId = candidate;
      break;
    }
  }
  if (!newId) throw new Error('チームIDの生成に失敗しました');

  const write = new BatchWriter(getDb());

  write.set(teamDoc(newId), { name: team.name, createdAt: serverTimestamp() });

  const players = await getDocs(playersCol(teamId));
  for (const p of players.docs) {
    write.set(playerDoc(newId, p.id), p.data());
    write.delete(p.ref);
  }

  const games = await getDocs(gamesCol(teamId));
  for (const g of games.docs) {
    write.set(gameDoc(newId, g.id), g.data());
    const atbats = await getDocs(atbatsCol(teamId, g.id));
    for (const a of atbats.docs) {
      write.set(atbatDoc(newId, g.id, a.id), a.data());
      write.delete(a.ref);
    }
    write.delete(g.ref);
  }

  write.delete(teamDoc(teamId));

  await write.commit();
  return newId;
}

// Firestore の 500 オペレーション/バッチ制限を跨いで自動フラッシュする簡易バッチライター。
class BatchWriter {
  private batch;
  private count = 0;
  private readonly pending: Promise<void>[] = [];

  constructor(private readonly db: Firestore) {
    this.batch = writeBatch(db);
  }

  private flushIfNeeded() {
    if (this.count >= 450) {
      this.pending.push(this.batch.commit());
      this.batch = writeBatch(this.db);
      this.count = 0;
    }
  }

  set(ref: DocumentReference, data: DocumentData) {
    this.batch.set(ref, data);
    this.count += 1;
    this.flushIfNeeded();
  }

  delete(ref: DocumentReference) {
    this.batch.delete(ref);
    this.count += 1;
    this.flushIfNeeded();
  }

  async commit() {
    this.pending.push(this.batch.commit());
    await Promise.all(this.pending);
  }
}
