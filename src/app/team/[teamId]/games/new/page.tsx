'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Field, TextInput } from '@/components/Field';
import { usePlayers } from '@/lib/db/hooks';
import { createGame } from '@/lib/db/games';

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );
  const bench = players.filter((p) => !lineup.includes(p.id));

  const addToLineup = (id: string) => setLineup((l) => [...l, id]);
  const removeFromLineup = (id: string) =>
    setLineup((l) => l.filter((x) => x !== id));
  const move = (index: number, dir: -1 | 1) => {
    setLineup((l) => {
      const next = [...l];
      const j = index + dir;
      if (j < 0 || j >= next.length) return l;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  };

  const submit = async () => {
    setError('');
    const seasonNum = Number(season);
    if (!Number.isInteger(seasonNum) || seasonNum < 1900 || seasonNum > 2100) {
      setError('シーズン（西暦）を正しく入力してください');
      return;
    }
    if (lineup.length === 0) {
      setError('打順に選手を1人以上追加してください');
      return;
    }
    setSaving(true);
    const game = await createGame(teamId, {
      date,
      opponent: opponent.trim(),
      ground: ground.trim(),
      season: seasonNum,
      lineup,
    });
    router.replace(`/team/${teamId}/game/${game.id}`);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-base font-bold">試合を作成</h2>

      <div className="space-y-3">
        <Field label="日付">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
            placeholder="市営第2グラウンド"
          />
        </Field>
        <Field label="シーズン（西暦）">
          <TextInput
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            inputMode="numeric"
          />
        </Field>
      </div>

      <section>
        <h3 className="text-sm font-bold">打順（{lineup.length}人）</h3>
        {loading ? (
          <p className="mt-2 text-sm text-slate-500">読み込み中…</p>
        ) : (
          <>
            <ol className="mt-2 space-y-1.5">
              {lineup.map((id, i) => (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-2"
                >
                  <span className="w-5 text-center text-sm font-bold text-slate-500">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm">
                    {playerMap.get(id)?.name ?? '?'}
                    {playerMap.get(id)?.number != null && (
                      <span className="ml-1 text-xs text-slate-400">
                        #{playerMap.get(id)?.number}
                      </span>
                    )}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0}>
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => move(i, 1)}
                    disabled={i === lineup.length - 1}
                  >
                    ↓
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeFromLineup(id)}>
                    <span className="text-red-600">外す</span>
                  </Button>
                </li>
              ))}
              {lineup.length === 0 && (
                <li className="rounded-md border border-dashed border-slate-300 px-2.5 py-3 text-center text-xs text-slate-400">
                  下の控えから選手を追加
                </li>
              )}
            </ol>

            {bench.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-medium text-slate-500">控え</h4>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {bench.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => addToLineup(p.id)}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm active:bg-slate-100"
                    >
                      ＋ {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button size="lg" className="w-full" onClick={submit} disabled={saving}>
        作成して打席入力へ
      </Button>
    </div>
  );
}
