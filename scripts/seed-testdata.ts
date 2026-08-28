/**
 * 動作確認用テストデータ投入スクリプト（本番 Firestore: nine-trax）。
 *
 *   - テスト用チームを1件作成
 *   - 選手12名を登録
 *   - 完了済みの試合を1件（打席記録・スコア入り → 成績/試合一覧の確認用）
 *   - 進行中の試合を1件（打順設定済み・打席記録なし → 入力を試す用）
 *
 * 実行: npx tsx scripts/seed-testdata.ts
 *   .env.local の FIREBASE_SERVICE_ACCOUNT を利用する。
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import type { AtBatResult } from '../src/lib/types';

loadEnv({ path: '.env.local' });

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
function generateTeamId(length = 12): string {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

function loadServiceAccount(): ServiceAccount {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!path) throw new Error('FIREBASE_SERVICE_ACCOUNT を .env.local に設定してください');
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as ServiceAccount;
}

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const PLAYERS: { name: string; number: number }[] = [
  { name: '山田 太郎', number: 1 },
  { name: '佐藤 健', number: 7 },
  { name: '鈴木 一郎', number: 51 },
  { name: '田中 大輔', number: 3 },
  { name: '高橋 翔', number: 5 },
  { name: '伊藤 誠', number: 8 },
  { name: '渡辺 亮', number: 24 },
  { name: '中村 剛', number: 6 },
  { name: '小林 慎', number: 9 },
  { name: '加藤 涼', number: 10 },
  { name: '吉田 学', number: 2 },
  { name: '山本 洋', number: 44 },
];

async function main() {
  initializeApp({ credential: cert(loadServiceAccount()) });
  const db = getFirestore();

  // 1. チーム
  let teamId = generateTeamId();
  while ((await db.doc(`teams/${teamId}`).get()).exists) teamId = generateTeamId();
  await db.doc(`teams/${teamId}`).set({
    name: 'テスト用チーム（動作確認）',
    color: '#c2410c',
    logoUrl: null,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`チーム作成: テスト用チーム（動作確認）  teamId=${teamId}`);

  // 2. 選手
  const playerIds: string[] = [];
  for (const p of PLAYERS) {
    const ref = await db.collection(`teams/${teamId}/players`).add({
      name: p.name,
      number: p.number,
      archived: false,
    });
    playerIds.push(ref.id);
  }
  console.log(`選手登録: ${playerIds.length}名`);

  const lineup = playerIds.slice(0, 9); // 1〜9番

  // 3. 完了済みの試合（打席記録・スコア入り）
  const finishedRef = await db.collection(`teams/${teamId}/games`).add({
    date: isoDate(-7),
    opponent: 'グリーンズ',
    ground: '市営第2グラウンド',
    season: new Date().getFullYear(),
    lineup,
    homeScores: [0, 2, 0, 1, 0, 3, 0, 0, 1],
    awayScores: [1, 0, 0, 0, 2, 0, 0, 1, 0],
    status: 'finished',
    createdAt: FieldValue.serverTimestamp(),
  });

  // 打席記録: 3イニング分・打順どおりに一巡ずつ
  const pattern: { result: AtBatResult; rbi: number }[][] = [
    // 1回
    [
      { result: 'single', rbi: 0 },
      { result: 'strikeout', rbi: 0 },
      { result: 'double', rbi: 1 },
      { result: 'out', rbi: 0 },
      { result: 'walk', rbi: 0 },
      { result: 'out', rbi: 0 },
      { result: 'single', rbi: 1 },
      { result: 'strikeout', rbi: 0 },
      { result: 'out', rbi: 0 },
    ],
    // 2回
    [
      { result: 'homerun', rbi: 1 },
      { result: 'out', rbi: 0 },
      { result: 'single', rbi: 0 },
      { result: 'double', rbi: 1 },
      { result: 'sacFly', rbi: 1 },
      { result: 'out', rbi: 0 },
      { result: 'walk', rbi: 0 },
      { result: 'reachedOnError', rbi: 0 },
      { result: 'strikeout', rbi: 0 },
    ],
    // 3回
    [
      { result: 'out', rbi: 0 },
      { result: 'single', rbi: 0 },
      { result: 'out', rbi: 0 },
      { result: 'triple', rbi: 1 },
      { result: 'out', rbi: 0 },
      { result: 'hitByPitch', rbi: 0 },
      { result: 'sacBunt', rbi: 0 },
      { result: 'single', rbi: 1 },
      { result: 'strikeout', rbi: 0 },
    ],
  ];

  let atbatCount = 0;
  for (let i = 0; i < pattern.length; i++) {
    const inning = i + 1;
    for (let order = 1; order <= 9; order++) {
      const cell = pattern[i][order - 1];
      await db
        .collection(`teams/${teamId}/games/${finishedRef.id}/atbats`)
        .add({
          playerId: lineup[order - 1],
          order,
          inning,
          result: cell.result,
          rbi: cell.rbi,
          createdAt: FieldValue.serverTimestamp(),
        });
      atbatCount++;
    }
  }
  console.log(
    `完了済みの試合: vs グリーンズ (${isoDate(-7)})  打席記録 ${atbatCount}件  gameId=${finishedRef.id}`,
  );

  // 4. 進行中の試合（打順設定済み・打席記録なし → 入力を試す用）
  const liveRef = await db.collection(`teams/${teamId}/games`).add({
    date: isoDate(0),
    opponent: 'ブルーウェーブ',
    ground: '河川敷グラウンドA',
    season: new Date().getFullYear(),
    lineup,
    homeScores: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    awayScores: [0, 0, 0, 0, 0, 0, 0, 0, 0],
    status: 'in_progress',
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(
    `進行中の試合: vs ブルーウェーブ (${isoDate(0)})  打席記録なし  gameId=${liveRef.id}`,
  );

  console.log('\n--- 完了 ---');
  console.log(`共有URL:        /team/${teamId}`);
  console.log(`本番:           https://ninetrax.vercel.app/team/${teamId}`);
  console.log(`入力を試す試合: https://ninetrax.vercel.app/team/${teamId}/game/${liveRef.id}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
