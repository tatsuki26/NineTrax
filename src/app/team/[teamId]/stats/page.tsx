'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Select } from '@/components/Field';
import { usePlayers, useGames } from '@/lib/db/hooks';
import { listAtBats } from '@/lib/db/atbats';
import { computeByPlayer, formatRate } from '@/lib/stats';
import type { AtBat, StatLine } from '@/lib/types';

type Row = { playerId: string; name: string; stat: StatLine };

const COLUMNS: { key: keyof StatLine; label: string; rate?: boolean }[] = [
  { key: 'pa', label: '打席' },
  { key: 'ab', label: '打数' },
  { key: 'h', label: '安打' },
  { key: 'double', label: '二' },
  { key: 'triple', label: '三' },
  { key: 'homerun', label: '本' },
  { key: 'rbi', label: '打点' },
  { key: 'walk', label: '四球' },
  { key: 'hitByPitch', label: '死球' },
  { key: 'strikeout', label: '三振' },
  { key: 'sacBunt', label: '犠打' },
  { key: 'sacFly', label: '犠飛' },
  { key: 'avg', label: '打率', rate: true },
  { key: 'obp', label: '出塁率', rate: true },
  { key: 'slg', label: '長打率', rate: true },
  { key: 'ops', label: 'OPS', rate: true },
];

export default function StatsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { players } = usePlayers(teamId, { includeArchived: true });
  const { games } = useGames(teamId);

  const seasons = useMemo(
    () => Array.from(new Set(games.map((g) => g.season))).sort((a, b) => b - a),
    [games],
  );
  const [season, setSeason] = useState<number | 'all'>('all');
  const [gameId, setGameId] = useState<string | 'total'>('total');

  // 対象試合の atbats をまとめて取得
  const [atbatsByGame, setAtbatsByGame] = useState<Record<string, AtBat[]>>({});
  useEffect(() => {
    let alive = true;
    Promise.all(
      games.map((g) => listAtBats(teamId, g.id).then((abs) => [g.id, abs] as const)),
    ).then((entries) => {
      if (alive) setAtbatsByGame(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [teamId, games]);

  const filteredGames = useMemo(
    () => (season === 'all' ? games : games.filter((g) => g.season === season)),
    [games, season],
  );

  // gameId が現在の絞り込みから外れたら total に戻す
  useEffect(() => {
    if (gameId !== 'total' && !filteredGames.some((g) => g.id === gameId)) {
      setGameId('total');
    }
  }, [filteredGames, gameId]);

  const targetAtBats: AtBat[] = useMemo(() => {
    const target =
      gameId === 'total' ? filteredGames : filteredGames.filter((g) => g.id === gameId);
    return target.flatMap((g) => atbatsByGame[g.id] ?? []);
  }, [gameId, filteredGames, atbatsByGame]);

  const rows: Row[] = useMemo(() => {
    const byPlayer = computeByPlayer(targetAtBats);
    const nameOf = (id: string) =>
      players.find((p) => p.id === id)?.name ?? '不明な選手';
    return Array.from(byPlayer.entries())
      .map(([playerId, stat]) => ({ playerId, name: nameOf(playerId), stat }))
      .sort((a, b) => (b.stat.avg ?? -1) - (a.stat.avg ?? -1) || b.stat.h - a.stat.h);
  }, [targetAtBats, players]);

  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold">個人成績</h2>

      <div className="flex gap-2">
        <Select
          value={season === 'all' ? 'all' : String(season)}
          onChange={(e) =>
            setSeason(e.target.value === 'all' ? 'all' : Number(e.target.value))
          }
        >
          <option value="all">全シーズン</option>
          {seasons.map((s) => (
            <option key={s} value={s}>
              {s}年
            </option>
          ))}
        </Select>
        <Select value={gameId} onChange={(e) => setGameId(e.target.value as typeof gameId)}>
          <option value="total">通算</option>
          {filteredGames.map((g) => (
            <option key={g.id} value={g.id}>
              {g.date} vs {g.opponent || '未設定'}
            </option>
          ))}
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-500">
          対象の打席記録がありません。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-[720px] text-right text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500">
                <th className="sticky left-0 bg-slate-50 px-3 py-2 text-left">選手</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-2.5 py-2">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.playerId} className="border-t border-slate-100">
                  <td className="sticky left-0 bg-white px-3 py-2 text-left font-medium">
                    {row.name}
                  </td>
                  {COLUMNS.map((c) => {
                    const v = row.stat[c.key];
                    return (
                      <td key={c.key} className="px-2.5 py-2 tabular-nums">
                        {c.rate
                          ? formatRate(v as number | null)
                          : (v as number)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400">
        打率・長打率は打数0のとき「-」表示。失策出塁は出塁率の分子に含みません。
      </p>
    </div>
  );
}
