import type { Config } from 'tailwindcss';

/**
 * NineTrax デザインシステム — "Night Game"
 * 野球場（芝・土・ナイター）をモチーフにした、落ち着いてモダンな配色。
 * - field  : 芝のディープグリーン（プライマリ）
 * - clay   : 内野の土（アクセント／主要CTA）
 * - stitch : ボールの赤い縫い目（削除・警告・ライブ表示）
 * - night  : ナイターの紺（ヘッダー／スコアボード）
 * - chalk  : ラインチョーク色の温かみのある背景
 */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        field: {
          DEFAULT: '#0F7B5F',
          dark: '#0B5E49',
          light: '#E4F1EC',
          tint: '#F0F7F4',
        },
        clay: {
          DEFAULT: '#C75D3B',
          dark: '#A94A2D',
          light: '#F8ECE5',
        },
        stitch: {
          DEFAULT: '#D6402F',
          dark: '#B32E20',
        },
        night: {
          DEFAULT: '#122139',
          700: '#22334F',
          600: '#31465F',
        },
        chalk: '#F3F1EA',
        cream: '#FCFAF5',
        ink: {
          DEFAULT: '#1C1B17',
          muted: '#57544C',
          faint: '#8B877B',
        },
        line: '#E6E2D8',
        /* 既存クラス（bg-brand 等）を新グリーンにマッピングする互換エイリアス */
        brand: {
          DEFAULT: '#0F7B5F',
          dark: '#0B5E49',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Hiragino Kaku Gothic ProN"',
          '"Hiragino Sans"',
          '"Noto Sans JP"',
          'Meiryo',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(28,27,23,0.04), 0 4px 16px -6px rgba(28,27,23,0.10)',
        pop: '0 8px 30px -8px rgba(15,123,95,0.35)',
        panel: '0 10px 40px -12px rgba(18,33,57,0.45)',
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.94)', opacity: '0.6' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        pop: 'pop 180ms ease-out',
        'slide-up': 'slide-up 220ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;
