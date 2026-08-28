'use client';

import type { HitZone } from '@/lib/types';
import { HIT_ZONE_LABELS, HIT_ZONE_SHORT } from '@/lib/plate';

// 扇形の守備配置図。打球の飛んだ方向（ゾーン）をタップで選ぶ。
// 左＝三塁側(3B/SS/LF)、右＝一塁側(1B/2B/RF)。テレビ中継と同じ向き。

interface ZoneDef {
  zone: HitZone;
  x: number;
  y: number;
}

const ZONES: ZoneDef[] = [
  // 外野
  { zone: 'lf', x: 70, y: 92 },
  { zone: 'gap_lc', x: 114, y: 62 },
  { zone: 'cf', x: 160, y: 50 },
  { zone: 'gap_rc', x: 206, y: 62 },
  { zone: 'rf', x: 250, y: 92 },
  // ライン際
  { zone: 'line_l', x: 60, y: 166 },
  { zone: 'line_r', x: 260, y: 166 },
  // 内野
  { zone: '3b', x: 92, y: 192 },
  { zone: 'gap_56', x: 118, y: 168 },
  { zone: 'ss', x: 138, y: 150 },
  { zone: '2b', x: 182, y: 150 },
  { zone: 'gap_13', x: 202, y: 168 },
  { zone: '1b', x: 228, y: 192 },
  // バッテリー
  { zone: 'p', x: 160, y: 202 },
  { zone: 'c', x: 160, y: 244 },
];

export function FanField({
  value,
  onChange,
}: {
  value: HitZone | null;
  onChange: (z: HitZone) => void;
}) {
  return (
    <svg
      viewBox="0 0 320 290"
      className="w-full select-none"
      role="group"
      aria-label="打球方向"
    >
      {/* 外野の芝 */}
      <path
        d="M160 262 L34 96 A170 170 0 0 1 286 96 Z"
        fill="#E4F1EC"
        stroke="#CFE4DB"
        strokeWidth="1.5"
      />
      {/* 内野の土 */}
      <path
        d="M160 262 L100 200 L160 138 L220 200 Z"
        fill="#F3E7DC"
        stroke="#E4D2BF"
        strokeWidth="1.5"
      />
      {/* ファウルライン */}
      <path
        d="M160 262 L34 96 M160 262 L286 96"
        stroke="#C9C3B4"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* ベース */}
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
          transform={`rotate(45 ${x} ${y})`}
        />
      ))}

      {ZONES.map(({ zone, x, y }) => {
        const active = value === zone;
        return (
          <g
            key={zone}
            onClick={() => onChange(zone)}
            className="cursor-pointer"
            role="button"
            aria-pressed={active}
            aria-label={HIT_ZONE_LABELS[zone]}
          >
            <circle
              cx={x}
              cy={y}
              r={16}
              fill={active ? '#0F7B5F' : '#FFFFFF'}
              stroke={active ? '#0B5E49' : '#D8D2C4'}
              strokeWidth={active ? 2 : 1.5}
            />
            <text
              x={x}
              y={y + 3.5}
              textAnchor="middle"
              fontSize={HIT_ZONE_SHORT[zone].length > 1 ? '9' : '11'}
              fontWeight="700"
              fill={active ? '#FFFFFF' : '#57544C'}
            >
              {HIT_ZONE_SHORT[zone]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
