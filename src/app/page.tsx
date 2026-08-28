import Link from 'next/link';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">草野球スコア記録</h1>
        <p className="mt-2 text-sm text-slate-600">
          チームの共有URL（<code className="rounded bg-slate-200 px-1">/team/チームID</code>
          ）を開くと、そのチームの画面に直接入れます。
        </p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-700">デモ用チーム</p>
        <Link
          href="/team/demoteam2345"
          className="mt-2 inline-block rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white"
        >
          デモチームを開く
        </Link>
      </div>
    </main>
  );
}
