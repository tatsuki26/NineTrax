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
  // editing: `${row}-${inning}` / null
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

  const renderRow = (row: 'home' | 'away', label: string, scores: number[]) => (
    <tr>
      <th className="whitespace-nowrap border-b border-slate-100 bg-white px-2 py-2 text-left font-semibold text-slate-700">
        {label}
      </th>
      {INNINGS.map((i) => {
        const key = `${row}-${i}`;
        return (
          <td
            key={i}
            className="border-b border-l border-slate-100 p-0 text-center"
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
                className="h-10 w-10 text-center tabular-nums outline-none ring-2 ring-brand"
              />
            ) : (
              <button
                type="button"
                onClick={() => startEdit(row, i, scores[i] || 0)}
                className="h-10 w-10 tabular-nums text-slate-800 hover:bg-brand/10"
              >
                {scores[i] || 0}
              </button>
            )}
          </td>
        );
      })}
      <td className="border-b border-l-2 border-slate-300 bg-slate-50 px-2 text-center font-bold tabular-nums text-slate-900">
        {sum(scores)}
      </td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="w-full overflow-x-auto rounded-xl bg-white p-3 shadow-sm">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="bg-white px-2 py-2" />
              {INNINGS.map((i) => (
                <th
                  key={i}
                  className="w-10 border-b border-l border-slate-100 px-0 py-2 text-center font-semibold text-slate-500"
                >
                  {i + 1}
                </th>
              ))}
              <th className="border-b border-l-2 border-slate-300 bg-slate-50 px-2 py-2 text-center font-semibold text-slate-500">
                計
              </th>
            </tr>
          </thead>
          <tbody>
            {renderRow('away', '相手', game.awayScores)}
            {renderRow('home', '自チーム', game.homeScores)}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        セルをタップして各イニングの得点を入力します（打席記録とは連動しません）。
      </p>
    </div>
  );
}
