'use client';

import { useEffect, useRef, useState } from 'react';
import type { Game } from '@/lib/types';
import { updateGame } from '@/lib/db/games';

type Side = 'home' | 'away';

export function Scoreboard({ teamId, game }: { teamId: string; game: Game }) {
  const [editing, setEditing] = useState<{ side: Side; inning: number } | null>(null);

  const setScore = async (side: Side, inning: number, value: number) => {
    const key = side === 'home' ? 'homeScores' : 'awayScores';
    const arr = [...(game[key] ?? Array(9).fill(0))];
    arr[inning] = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    await updateGame(teamId, game.id, { [key]: arr });
  };

  const rows: { side: Side; label: string; scores: number[] }[] = [
    { side: 'away', label: `相手`, scores: game.awayScores ?? Array(9).fill(0) },
    { side: 'home', label: `自チーム`, scores: game.homeScores ?? Array(9).fill(0) },
  ];

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[520px] text-center text-sm">
          <thead>
            <tr className="bg-slate-50 text-xs text-slate-500">
              <th className="px-2 py-2 text-left">回</th>
              {Array.from({ length: 9 }, (_, i) => (
                <th key={i} className="w-9 px-1 py-2">
                  {i + 1}
                </th>
              ))}
              <th className="w-12 px-2 py-2">計</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.side} className="border-t border-slate-100">
                <td className="px-2 py-2 text-left font-medium">{row.label}</td>
                {Array.from({ length: 9 }, (_, i) => {
                  const isEditing =
                    editing?.side === row.side && editing?.inning === i;
                  return (
                    <td key={i} className="px-1 py-1">
                      {isEditing ? (
                        <CellInput
                          initial={row.scores[i] ?? 0}
                          onCommit={(v) => {
                            setScore(row.side, i, v);
                            setEditing(null);
                          }}
                          onCancel={() => setEditing(null)}
                        />
                      ) : (
                        <button
                          className="h-8 w-8 rounded active:bg-slate-100"
                          onClick={() => setEditing({ side: row.side, inning: i })}
                        >
                          {row.scores[i] ?? 0}
                        </button>
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-2 font-bold">
                  {(row.scores ?? []).reduce((a, b) => a + (b || 0), 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        セルをタップして得点を手入力します。打席記録とは連動しません。
      </p>
    </div>
  );
}

function CellInput({
  initial,
  onCommit,
  onCancel,
}: {
  initial: number;
  onCommit: (v: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(String(initial));
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      value={value}
      inputMode="numeric"
      className="h-8 w-9 rounded border border-brand text-center outline-none"
      onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={() => onCommit(Number(value || '0'))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onCommit(Number(value || '0'));
        if (e.key === 'Escape') onCancel();
      }}
    />
  );
}
