import { NewTeamButton } from './NewTeamButton';

// ルート = アプリ紹介を兼ねたランディングページ。
// 既存チームはチームごとに配布された共有URL（/team/[teamId]）から入る想定。

const FEATURES = [
  {
    title: '打席結果を1タップ記録',
    body: 'ヒット・凡退・四球まで、スマホからその場でサクッと入力。試合中でも手が止まりません。',
    icon: (
      <path d="M4 20 20 4M14 4h6v6M9 15l-4 4" />
    ),
  },
  {
    title: 'スコアボードを共有',
    body: 'イニングごとの得点や試合経過を、チームのみんながリアルタイムで確認できます。',
    icon: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18M9 5v14" />
      </>
    ),
  },
  {
    title: 'URLだけでチーム参加',
    body: 'アカウント登録もパスワードも不要。共有URLを送るだけでメンバー全員がすぐ使えます。',
    icon: (
      <>
        <path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
      </>
    ),
  },
];

const STEPS = [
  { n: '1', title: 'チームを作成', body: 'チーム名を入れるだけ。専用の共有URLが発行されます。' },
  { n: '2', title: 'メンバーに共有', body: '発行されたURLをLINEなどで送るだけで招待完了。' },
  { n: '3', title: '試合を記録', body: '打席結果とスコアを入力。記録はチームで自動的に共有されます。' },
];

function FeatureIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col">
      {/* Hero */}
      <section className="panel-night relative overflow-hidden text-white">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-field/30 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-clay/25 blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-8 px-6 py-16">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-stitch" />
              草野球のためのスコア記録アプリ
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
              チームの1球を、
              <br />
              みんなの記録に。
            </h1>
            <p className="mt-4 text-base leading-relaxed text-white/75">
              NineTrax（ナイントラックス）は、草野球チームの打席結果とスコアを
              スマホから記録・共有できるアプリです。試合の熱を、そのまま残しましょう。
            </p>
          </div>

          <div className="animate-slide-up space-y-3">
            <NewTeamButton />
            <p className="text-center text-xs text-white/55">
              既存チームは、配布された共有URL{' '}
              <code className="rounded bg-white/10 px-1 py-0.5 text-white/80">
                /team/&lt;チームID&gt;
              </code>{' '}
              からアクセスしてください。
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-chalk px-6 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-2xl font-bold tracking-tight text-ink">
            試合の記録に、必要なものだけ
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-center text-sm text-ink-muted">
            むずかしい設定は一切なし。スマホひとつで完結します。
          </p>

          <div className="mt-8 grid gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-line bg-cream p-5 shadow-card"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-field-tint text-field">
                  <FeatureIcon>{f.icon}</FeatureIcon>
                </div>
                <h3 className="mt-4 text-base font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-cream px-6 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-2xl font-bold tracking-tight text-ink">
            はじめかたは3ステップ
          </h2>

          <ol className="mt-8 space-y-6">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="tnum flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-night text-lg font-bold text-white">
                  {s.n}
                </span>
                <div className="pt-1">
                  <h3 className="text-base font-bold text-ink">{s.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {s.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="panel-night px-6 py-16 text-white">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-5 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            さっそくチームを作りましょう
          </h2>
          <p className="max-w-sm text-sm text-white/70">
            費用も登録もなし。作成にかかるのは10秒です。
          </p>
          <div className="w-full max-w-xs">
            <NewTeamButton />
          </div>
        </div>
      </section>

      <footer className="bg-night px-6 py-8 text-center text-xs text-white/50">
        <p className="text-sm font-semibold tracking-tight text-white/70">
          NineTrax
        </p>
        <p className="mt-1">草野球チームの打席結果とスコアを記録・共有するアプリ</p>
      </footer>
    </main>
  );
}
