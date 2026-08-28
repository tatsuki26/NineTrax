import Link from 'next/link';
import { NewTeamButton } from './NewTeamButton';

// ルート。共有URL（/team/[teamId]）から入る想定のため、ここは簡単な案内と
// 新規チーム作成の導線のみ。
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">NineTrax</h1>
        <p className="mt-2 text-slate-600">
          草野球チームの打席結果とスコアを記録・共有するアプリです。
        </p>
      </div>

      <NewTeamButton />

      <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">
        既存チームの画面には、チームごとに配布された共有URL
        <code className="mx-1 rounded bg-slate-100 px-1">/team/&lt;チームID&gt;</code>
        からアクセスしてください。
      </p>

      <Link
        href="/admin/login"
        className="text-sm font-medium text-brand hover:underline"
      >
        アプリ管理者ログイン →
      </Link>
    </main>
  );
}
