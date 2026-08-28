'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { usePlayers, createGame } from '@/lib/db';
import { Button } from '@/components/Button';
import { Field, TextInput } from '@/components/Field';
import { Spinner } from '@/components/Spinner';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewGamePage() {
  const { teamId } = useParams<{ teamId: string }>();
  const router = useRouter();
  const { players, loading } = usePlayers(teamId);

  const [date, setDate] = useState(today());
  const [opponent, setOpponent] = useState('');
  const [ground, setGround] = useState('');
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [lineup, setLineup] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );
  const available = players.filter((p) => !lineup.includes(p.id));

  function addToLineup(id: string) {
    setLineup((cur) => [...cur, id]);
  }
  function removeFromLineup(id: string) {
    setLineup((cur) => cur.filter((x) => x !== id));
  }
  function move(index: number, dir: -1 | 1) {
    setLineup((cur) => {
      const next = [...cur];
      const j = index + dir;
      if (j < 0 || j >= next.length) return cur;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lineup.length === 0) {
      setError('スタメンを1人以上選んでください');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const game = await createGame(teamId, {
        date,
        opponent: opponent.trim(),
        ground: ground.trim(),
        season: Number(season),
        lineup,
      });
      router.replace(`/team/${teamId}/game/${game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '試合の作成に失敗しました');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <h1 className="text-lg font-bold text-slate-900">試合を作成</h1>

      <div className="grid grid-cols-2 gap-3 rounded-xl bg-white p-4 shadow-sm">
        <Field label="日付">
          <TextInput
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </Field>
        <Field label="シーズン（西暦）">
          <TextInput
            type="number"
            inputMode="numeric"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            required
          />
        </Field>
        <Field label="対戦相手">
          <TextInput
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="◯◯クラブ"
          />
        </Field>
        <Field label="球場">
          <TextInput
            value={ground}
            onChange={(e) => setGround(e.target.value)}
            placeholder="市営第1球場"
          />
        </Field>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">
          スタメン・打順（{lineup.length}人）
        </h2>

        {loading ? (
          <Spinner />
        ) : (
          <>
            <ol className="mb-4 divide-y divide-slate-100">
              {lineup.map((id, i) => {
                const p = playerById.get(id);
                return (
                  <li key={id} className="flex items-center gap-2 py-2">
                    <span className="w-6 text-center font-bold tabular-nums text-slate-500">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate text-slate-800">
                      {p?.number != null && (
                        <span className="mr-1 tabular-nums text-slate-500">
                          #{p.number}
                        </span>
                      )}
                      {p?.name ?? '(不明)'}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="上へ"
                    >
                      ↑
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => move(i, 1)}
                      disabled={i === lineup.length - 1}
                      aria-label="下へ"
                    >
                      ↓
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeFromLineup(id)}
                    >
                      外す
                    </Button>
                  </li>
                );
              })}
              {lineup.length === 0 && (
                <li className="py-3 text-center text-sm text-slate-500">
                  下から選手を追加してください。
                </li>
              )}
            </ol>

            {available.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-slate-500">
                  追加できる選手
                </p>
                <div className="flex flex-wrap gap-2">
                  {available.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToLineup(p.id)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 hover:border-brand hover:text-brand"
                    >
                      + {p.number != null ? `#${p.number} ` : ''}
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      <Button type="submit" fullWidth size="lg" disabled={busy}>
        {busy ? '作成中…' : '試合を作成して打席入力へ'}
      </Button>
    </form>
  );
}
