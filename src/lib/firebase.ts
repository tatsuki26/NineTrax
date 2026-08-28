'use client';

// Firebase Web SDK の初期化。クライアント専用（'use client' 配下からのみ import すること）。
// Firestore はオフライン永続化（IndexedDB, マルチタブ対応）を有効化する（仕様書 §11.1）。

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  type AppCheck,
} from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let dbInstance: Firestore;
let authInstance: Auth;
let appCheckInstance: AppCheck | undefined;

function ensureApp(): FirebaseApp {
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);

    // App Check（サイトキーがある場合のみ）
    const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
    if (siteKey && typeof window !== 'undefined') {
      try {
        appCheckInstance = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(siteKey),
          isTokenAutoRefreshEnabled: true,
        });
      } catch {
        // 二重初期化などは無視
      }
    }
  }
  return app;
}

export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = initializeFirestore(ensureApp(), {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  }
  return dbInstance;
}

export function getAuthClient(): Auth {
  if (!authInstance) {
    authInstance = getAuth(ensureApp());
  }
  return authInstance;
}

export function getAppCheck(): AppCheck | undefined {
  ensureApp();
  return appCheckInstance;
}
