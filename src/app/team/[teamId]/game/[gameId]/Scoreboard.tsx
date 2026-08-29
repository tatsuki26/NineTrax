'use client';

import { useState } from 'react';
import type { Game } from '@/lib/types';
import { updateGame } from '@/lib/db';
import { useTeamContext } from '@/lib/team-context';

type GamePatch = Partial<Omit<Game, 'id' | 'createdAt'>>;

const INNINGS = [0, 1, 2, 3, 4, 5, 6, 7, 8];

function sum(scores: (number | null)[], done: number): number {
  return scores
    .slice(0, Math.max(0, done))
    .reduce<number>((a, b) => a + (b ?? 0), 0);
}

type Row = 'home' | 'away';

export function Scoreboard({
  teamId,
  gameId,
  game,
  homeInningsDone,
  awayInningsDone,
}: {
  teamId: string;
  gameId: string;
  game: Game;
  /** at-bats から算出した最新値で上書きしたいとき（省略時は game の値） */
  homeInningsDone?: number;
  awayInningsDone?: number;
}) {
  const team = useTeamContext();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const doneOf = (row: Row) =>
    row === 'home'
      ? Math.max(game.homeInningsDone, homeInningsDone ?? 0)
      : Math.max(game.awayInningsDone, awayInningsDone ?? 0);

  async function commit(row: Row, inning: number) {
    const key = `${row}-${inning}`;
    if (editing !== key) return;
    const current = row === 'home' ? game.homeScores : game.awayScores;
    const value =
      draft.trim() === '' ? null : Math.max(0, Math.min(99, Number(draft) || 0));
    setEditing(null);
    if (value === current[inning]) return;
    const next = [...current];
    next[inning] = value;
    // 数字を入れた回は「終わった回」として最低でも i+1 まで done にする。
    const curDone = row === 'home' ? game.homeInningsDone : game.awayInningsDone;
    const nextDone = value == null ? curDone : Math.max(curDone, inning + 1);
    const patch: GamePatch =
      row === 'home'
        ? { homeScores: next, homeInningsDone: nextDone }
        : { awayScores: next, awayInningsDone: nextDone };
    await updateGame(teamId, gameId, patch);
  }

  function startEdit(row: Row, inning: number, value: number | null) {
    setEditing(`${row}-${inning}`);
    setDraft(value == null ? '' : String(value));
  }

  const renderRow = (row: Row, label: string, scores: (number | null)[]) => {
    const done = doneOf(row);
    const total = sum(scores, done);
    const otherRow = row === 'home' ? 'away' : 'home';
    const other = sum(
      otherRow === 'home' ? game.homeScores : game.awayScores,
      doneOf(otherRow),
    );
    return (
      <tr key={row}>
        <th className="sticky left-0 z-10 max-w-[6.5rem] truncate bg-night px-3 py-2.5 text-left text-xs font-bold text-white/80">
          {label}
        </th>
        {INNINGS.map((i) => {
          const key = `${row}-${i}`;
          const val = scores[i];
          // 「終わった回」までのみ数字を表示。それ以外は保存値が 0 でも空欄。
          const text = i < done && val != null ? String(val) : i < done ? '0' : '';
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
                  onClick={() => startEdit(row, i, val)}
                  className="tnum h-11 w-11 text-lg font-bold tabular-nums text-amber-300 transition-colors hover:bg-white/10 active:bg-white/15"
                >
                  {text}
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

  // 先攻を上、後攻を下に表示。ラベルはチーム名。
  const our = { row: 'home' as Row, label: team.name, scores: game.homeScores };
  const opp = {
    row: 'away' as Row,
    label: game.opponent || '相手',
    scores: game.awayScores,
  };
  const rows = game.ourSide === 'second' ? [opp, our] : [our, opp];

  return (
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
            {rows.map((r) => renderRow(r.row, r.label, r.scores))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
