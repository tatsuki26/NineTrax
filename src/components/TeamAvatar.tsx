import { normalizeTeamColor, teamInitial } from '@/lib/team-colors';

interface TeamAvatarProps {
  name: string;
  color?: string | null;
  logoUrl?: string | null;
  /** 一辺の px。 */
  size?: number;
  className?: string;
}

// ロゴがあれば画像、なければチームカラー背景 + 頭文字を表示する。
export function TeamAvatar({
  name,
  color,
  logoUrl,
  size = 28,
  className = '',
}: TeamAvatarProps) {
  const bg = normalizeTeamColor(color);
  const style = { width: size, height: size };

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} のロゴ`}
        style={style}
        className={`shrink-0 rounded-lg object-cover ${className}`}
      />
    );
  }

  return (
    <span
      aria-hidden
      style={{ ...style, backgroundColor: bg, fontSize: Math.round(size * 0.46) }}
      className={`grid shrink-0 place-items-center rounded-lg font-bold leading-none text-white ${className}`}
    >
      {teamInitial(name)}
    </span>
  );
}
