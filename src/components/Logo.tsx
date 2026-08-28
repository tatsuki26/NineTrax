// NineTrax ロゴ。
// - NineTraxMark : マーク単体（自己完結のアプリアイコン。どの背景でも使える）
// - NineTraxLogo : マーク＋ワードマークのロックアップ
//
// モチーフ: 内野ダイヤモンド＋各ベース＋ホームベース（土色）＋中央のボール（縫い目つき）。
// ファビコンは src/app/icon.svg に同じ絵を置いている。

export function NineTraxMark({
  size = 28,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="NineTrax"
      className={`shrink-0 ${className}`}
    >
      <rect width="40" height="40" rx="11" fill="#14273F" />
      {/* 上部のわずかな光沢 */}
      <path
        d="M4 15A11 11 0 0 1 15 4h10a11 11 0 0 1 11 11Z"
        fill="#ffffff"
        opacity="0.07"
      />
      {/* 内野ダイヤモンド */}
      <path
        d="M20 6.5 33.5 20 20 33.5 6.5 20Z"
        fill="#0F7B5F"
        fillOpacity="0.16"
        stroke="#8FB2DD"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* 一・二・三塁 */}
      <circle cx="20" cy="6.5" r="1.9" fill="#F1F6FB" />
      <circle cx="33.5" cy="20" r="1.9" fill="#F1F6FB" />
      <circle cx="6.5" cy="20" r="1.9" fill="#F1F6FB" />
      {/* ホームベース（土色） */}
      <circle cx="20" cy="33.5" r="2.7" fill="#C75D3B" />
      {/* 中央のボール＋縫い目 */}
      <circle cx="20" cy="20" r="5.3" fill="#F6C945" />
      <path
        d="M16.7 16.9c2 1.1 3.2 3.5 3 6M23.3 23.1c-2-1.1-3.2-3.5-3-6"
        stroke="#9A2E1C"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function NineTraxWordmark({
  variant = 'light',
  className = '',
}: {
  variant?: 'light' | 'dark';
  className?: string;
}) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      <span className={variant === 'light' ? 'text-white' : 'text-ink'}>
        Nine
      </span>
      <span className="text-field">Trax</span>
    </span>
  );
}

export function NineTraxLogo({
  size = 28,
  variant = 'light',
  showWordmark = true,
  wordmarkClassName = 'text-[17px]',
  className = '',
}: {
  size?: number;
  variant?: 'light' | 'dark';
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <NineTraxMark size={size} />
      {showWordmark && (
        <NineTraxWordmark variant={variant} className={wordmarkClassName} />
      )}
    </span>
  );
}
