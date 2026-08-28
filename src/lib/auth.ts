'use client';

// アプリ管理者認証（仕様書 §11.1）。
// Firebase Auth でサインインし、admins/{uid} ドキュメントの存在で管理者判定する。

import { useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { getAuthClient } from './firebase';
import { adminDoc } from './db/refs';

export async function signInAdmin(
  email: string,
  password: string,
): Promise<void> {
  const cred = await signInWithEmailAndPassword(getAuthClient(), email, password);
  const isAdmin = (await getDoc(adminDoc(cred.user.uid))).exists();
  if (!isAdmin) {
    await fbSignOut(getAuthClient());
    throw new Error('このアカウントには管理者権限がありません');
  }
}

export async function signOutAdmin(): Promise<void> {
  await fbSignOut(getAuthClient());
}

export type AdminAuthState =
  | { status: 'loading'; user: null }
  | { status: 'signed-out'; user: null }
  | { status: 'not-admin'; user: User }
  | { status: 'admin'; user: User };

// 管理画面のガードに使う。status === 'admin' のときだけ表示を許可する。
export function useAdminAuth(): AdminAuthState {
  const [state, setState] = useState<AdminAuthState>({
    status: 'loading',
    user: null,
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuthClient(), async (user) => {
      if (!user) {
        setState({ status: 'signed-out', user: null });
        return;
      }
      try {
        const isAdmin = (await getDoc(adminDoc(user.uid))).exists();
        setState({ status: isAdmin ? 'admin' : 'not-admin', user });
      } catch {
        setState({ status: 'not-admin', user });
      }
    });
    return unsub;
  }, []);

  return state;
}
