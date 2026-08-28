'use client';

import { useState } from 'react';
import type { Game } from '@/lib/types';
import { updateGame } from '@/lib/db';

const INNINGS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function sum(scores: number[]): number {
  return scores.reduce((a, b) => a + (b || 0), 0);
}

export function Scoreboard({
  teamId,
  gameId,
  game,
}: {
  teamId: string;
  gameId: string;
  game: Game;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  async function commit(row: 'home' | 'away', inning: number) {
    const key = `${row}-${inning}`;
    if (editing !== key) return;
    const value = Math.max(0, Math.min(99, Number(draft) || 0));
    const current = row === 'home' ? game.homeScores : game.awayScores;
    setEditing(null);
    if (value === current[inning]) return;
    const next = [...current];
    next[inning] = value;
    await updateGame(
      teamId,
      gameId,
      row === 'home' ? { homeScores: next } : { awayScores: next },
    );
  }

  function startEdit(row: 'home' | 'away', inning: number, value: number) {
    setEditing(`${row}-${inning}`);
    setDraft(value ? String(value) : '');
  }

  const renderRow = (row: 'home' | 'away', label: string, scores: number[]) => {
    const total = sum(scores);
    const other =
      row === 'home' ? sum(game.awayScores) : sum(game.homeScores);
    return (
      <tr>
        <th className="sticky left-0 z-10 whitespace-nowrap bg-night px-3 py-2.5 text-left text-xs font-bold text-white/70">
          {label}
        </th>
        {INNINGS.map((i) => {
          const key = `${row}-${i}`;
          return (
            <td
              key={i}
              className="border-l border-white/10 p-0 text-center align-middle"
            >
              {editing === key ? (
                <input
                  autoFocus
                  type="number"
                  inputMode="numeric"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commit(row, i)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commit(row, i);
                    if (e.key === 'Escape') setEditing(null);
                  }}
                  className="tnum h-11 w-11 rounded-md bg-white text-center text-lg font-bold text-night outline-none ring-2 ring-clay"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit(row, i, scores[i] || 0)}
                  className="tnum h-11 w-11 text-lg font-bold text-amber-300 tabular-nums transition-colors hover:bg-white/10 active:bg-white/15"
                >
                  {scores[i] || 0}
                </button>
              )}
            </td>
          );
        })}
        <td
          className={`border-l-2 border-white/25 px-3 text-center align-middle text-xl font-bold tabular-nums ${
            total >= other ? 'text-white' : 'text-white/55'
          }`}
        >
          {total}
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-2xl border border-night/30 shadow-panel">
        <div className="w-full overflow-x-auto panel-night">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[11px] font-bold text-white/40">
                <th className="sticky left-0 z-10 bg-night px-3 py-2 text-left">
                  回
                </th>
                {INNINGS.map((i) => (
                  <th
                    key={i}
                    className="tnum w-11 border-l border-white/10 px-0 py-2 text-center"
                  >
                    {i + 1}
                  </th>
                ))}
                <th className="border-l-2 border-white/25 px-3 py-2 text-center">
                  計
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {renderRow('away', '相手', game.awayScores)}
              {renderRow('home', '自チーム', game.homeScores)}
            </tbody>
          </table>
        </div>
      </div>
      <p className="px-1 text-xs text-ink-faint">
        数字をタップして各イニングの得点を入力します（打席記録とは連動しません）。
      </p>
    </div>
  );
}
