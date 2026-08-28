/**
 * 初期データ投入スクリプト（仕様書 §11.1）。
 *
 *   1. アプリ管理者の Firebase Auth ユーザーを作成（既存ならそのまま利用）
 *   2. admins/{uid} ドキュメントを作成
 *   3. 初期チームを1件作成し、共有URLのパスを表示
 *
 * 実行:
 *   1) サービスアカウントJSONを用意し、.env.local に FIREBASE_SERVICE_ACCOUNT / SEED_* を設定
 *   2) pnpm seed
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { cert, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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
  if (!path) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT（サービスアカウントJSONのパス）を .env.local に設定してください',
    );
  }
  return JSON.parse(readFileSync(resolve(path), 'utf8')) as ServiceAccount;
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const teamName = process.env.SEED_TEAM_NAME ?? 'サンプルチーム';
  if (!email || !password) {
    throw new Error('SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD を .env.local に設定してください');
  }

  initializeApp({ credential: cert(loadServiceAccount()) });
  const auth = getAuth();
  const db = getFirestore();

  // 1 + 2. 管理者ユーザー
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    console.log(`既存の管理者ユーザーを利用します: ${email} (${uid})`);
  } catch {
    const created = await auth.createUser({ email, password, emailVerified: true });
    uid = created.uid;
    console.log(`管理者ユーザーを作成しました: ${email} (${uid})`);
  }
  await db.doc(`admins/${uid}`).set(
    { email, createdAt: FieldValue.serverTimestamp() },
    { merge: true },
  );
  console.log('admins ドキュメントを作成しました');

  // 3. 初期チーム
  let teamId = generateTeamId();
  while ((await db.doc(`teams/${teamId}`).get()).exists) teamId = generateTeamId();
  await db.doc(`teams/${teamId}`).set({
    name: teamName,
    color: '#2f7a3d', // src/lib/team-colors.ts の DEFAULT_TEAM_COLOR
    logoUrl: null,
    createdAt: FieldValue.serverTimestamp(),
  });

  console.log('\n--- 完了 ---');
  console.log(`管理画面:   /admin/login  （${email} / 設定したパスワード）`);
  console.log(`初期チーム: ${teamName}`);
  console.log(`共有URL:    /team/${teamId}`);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
