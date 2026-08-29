import type { AtBatResult, HitZone } from '@/lib/types';
import { ZONE_XY } from '@/lib/plate';

export interface SprayEntry {
  zone: HitZone;
  result: AtBatResult;
}

type Cat = 'hit' | 'out' | 'onbase' | 'error';
function cat(r: AtBatResult): Cat {
  if (r === 'single' || r === 'double' || r === 'triple' || r === 'homerun')
    return 'hit';
  if (r === 'reachedOnError') return 'error';
  if (r === 'walk' || r === 'hitByPitch') return 'onbase';
  return 'out';
}
const DOT: Record<Cat, string> = {
  hit: '#0F7B5F',
  out: '#8B877B',
  onbase: '#22334F',
  error: '#C75D3B',
};

// 打球方向の散布図（スプレーチャート）。ゾーンごとの座標に、重なりを避けて点を打つ。
export function SprayChart({ entries }: { entries: SprayEntry[] }) {
  // 同じゾーンの点を渦巻き状にずらす
  const perZone = new Map<HitZone, number>();

  return (
    <svg viewBox="0 0 320 290" className="w-full select-none" aria-label="打球方向">
      <path
        d="M160 262 L34 96 A170 170 0 0 1 286 96 Z"
        fill="#E4F1EC"
        stroke="#CFE4DB"
        strokeWidth="1.5"
      />
      <path
        d="M160 262 L100 200 L160 138 L220 200 Z"
        fill="#F3E7DC"
        stroke="#E4D2BF"
        strokeWidth="1.5"
      />
      <path
        d="M160 262 L34 96 M160 262 L286 96"
        stroke="#C9C3B4"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {[
        [160, 262],
        [220, 200],
        [160, 138],
        [100, 200],
      ].map(([x, y], i) => (
        <rect
          key={i}
          x={x - 4}
          y={y - 4}
          width="8"
          height="8"
          fill="#fff"
          stroke="#C9C3B4"
          strokeWidth="1.5"
          transform={`rotate(45 ${x} ${y})`}
        />
      ))}

      {entries.map((e, idx) => {
        const base = ZONE_XY[e.zone];
        const n = perZone.get(e.zone) ?? 0;
        perZone.set(e.zone, n + 1);
        // n 個目を黄金角でずらす
        const angle = n * 2.399963;
        const radius = n === 0 ? 0 : 4 + Math.sqrt(n) * 5;
        const x = base.x + Math.cos(angle) * radius;
        const y = base.y + Math.sin(angle) * radius;
        return (
          <circle
            key={idx}
            cx={x}
            cy={y}
            r={4}
            fill={DOT[cat(e.result)]}
            fillOpacity={0.9}
            stroke="#fff"
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}

export function SprayLegend() {
  const items: [string, string][] = [
    ['安打', DOT.hit],
    ['アウト', DOT.out],
    ['失策', DOT.error],
  ];
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-faint">
      {items.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: color }}
            aria-hidden
          />
          {label}
        </span>
      ))}
    </div>
  );
}
