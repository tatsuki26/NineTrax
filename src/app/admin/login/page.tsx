'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInAdmin } from '@/lib/auth';
import { Button } from '@/components/Button';
import { Field, TextInput } from '@/components/Field';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signInAdmin(email.trim(), password);
      router.replace('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-chalk-lines p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="eyebrow">NineTrax</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            アプリ管理者ログイン
          </h1>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-6 shadow-card"
        >
          <Field label="メールアドレス">
            <TextInput
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="パスワード" error={error ?? undefined}>
            <TextInput
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" fullWidth size="lg" disabled={busy}>
            {busy ? 'ログイン中…' : 'ログイン'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/" className="font-semibold text-field hover:underline">
            ← トップへ戻る
          </Link>
        </p>
      </div>
    </main>
  );
}
