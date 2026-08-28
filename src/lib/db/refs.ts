'use client';

// Firestore のコレクション/ドキュメント参照ヘルパー。
// コレクション構成は仕様書 §11.3 を参照。

import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { getDb } from '@/lib/firebase';

export const teamsCol = (): CollectionReference => collection(getDb(), 'teams');
export const teamDoc = (teamId: string): DocumentReference =>
  doc(getDb(), 'teams', teamId);

export const playersCol = (teamId: string): CollectionReference =>
  collection(getDb(), 'teams', teamId, 'players');
export const playerDoc = (teamId: string, playerId: string): DocumentReference =>
  doc(getDb(), 'teams', teamId, 'players', playerId);

export const gamesCol = (teamId: string): CollectionReference =>
  collection(getDb(), 'teams', teamId, 'games');
export const gameDoc = (teamId: string, gameId: string): DocumentReference =>
  doc(getDb(), 'teams', teamId, 'games', gameId);

export const atbatsCol = (teamId: string, gameId: string): CollectionReference =>
  collection(getDb(), 'teams', teamId, 'games', gameId, 'atbats');
export const atbatDoc = (
  teamId: string,
  gameId: string,
  atbatId: string,
): DocumentReference =>
  doc(getDb(), 'teams', teamId, 'games', gameId, 'atbats', atbatId);

export const adminDoc = (uid: string): DocumentReference =>
  doc(getDb(), 'admins', uid);
