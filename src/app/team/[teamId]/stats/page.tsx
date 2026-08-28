'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import type { AtBat, Player, StatLine } from '@/lib/types';
import { useGames, usePlayers, listAtBats } from '@/lib/db';
import { computeByPlayer, formatRate } from '@/lib/stats';
import { Table, Th, Td } from '@/components/Table';
import { Spinner } from '@/components/Spinner';

export default function StatsPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const { games, loading: gamesLoading } = useGames(teamId);
  const { players } = usePlayers(teamId, { includeArchived: true });

  const seasons = useMemo(
    () => Array.from(new Set(games.map((g) => g.season))).sort((a, b) => b - a),
    [games],
  );
  const [season, setSeason] = useState<number | null>(null);
  const effectiveSeason = season ?? seasons[0] ?? null;

  const seasonGames = useMemo(
    () =>
      effectiveSeason == null
        ? []
        : games.filter((g) => g.season === effectiveSeason),
    [games, effectiveSeason],
  );

  const [atbatsByGame, setAtbatsByGame] = useState<Record<string, AtBat[]>>({});
  const [loadingAtBats, setLoadingAtBats] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (seasonGames.length === 0) {
      setAtbatsByGame({});
      return;
    }
    setLoadingAtBats(true);
    Promise.all(
      seasonGames.map((g) =>
        listAtBats(teamId, g.id).then((rows) => [g.id, rows] as const),
      ),
    ).then((entries) => {
      if (cancelled) return;
      setAtbatsByGame(Object.fromEntries(entries));
      setLoadingAtBats(false);
    });
    return () => {
      cancelled = true;
    };
  }, [teamId, seasonGames]);

  const playerById = useMemo(
    () => new Map(players.map((p) => [p.id, p])),
    [players],
  );

  const allAtBats = useMemo(
    () => Object.values(atbatsByGame).flat(),
    [atbatsByGame],
  );
  const totalByPlayer = useMemo(
    () => computeByPlayer(allAtBats),
    [allAtBats],
  );

  if (gamesLoading) return <Spinner />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-ink">個人成績</h1>
        {seasons.length > 0 && (
          <select
            value={effectiveSeason ?? ''}
            onChange={(e) => setSeason(Number(e.target.value))}
            className="h-9 rounded-xl border border-line bg-white px-3 text-sm font-bold text-ink"
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}年
              </option>
            ))}
          </select>
        )}
      </div>

      {effectiveSeason == null ? (
        <p className="py-12 text-center text-sm text-ink-faint">
          試合がありません。
        </p>
      ) : loadingAtBats ? (
        <Spinner label="成績を集計中…" />
      ) : (
        <>
          <section>
            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-sm font-bold text-ink-muted">通算</h2>
              <span className="tnum text-xs text-ink-faint">
                {effectiveSeason}年 ・ {seasonGames.length}試合
              </span>
            </div>
            <StatTable byPlayer={totalByPlayer} playerById={playerById} />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-sm font-bold text-ink-muted">試合ごと</h2>
            {seasonGames.map((g) => {
              const rows = atbatsByGame[g.id] ?? [];
              if (rows.length === 0) return null;
              return (
                <div key={g.id}>
                  <p className="tnum mb-1.5 text-xs font-semibold text-ink-faint">
                    {g.date} ・ vs {g.opponent || '未設定'}
                  </p>
                  <StatTable
                    byPlayer={computeByPlayer(rows)}
                    playerById={playerById}
                  />
                </div>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}

const COLUMNS: {
  key: keyof StatLine;
  label: string;
  rate?: boolean;
  strong?: boolean;
}[] = [
  { key: 'avg', label: '打率', rate: true, strong: true },
  { key: 'pa', label: '打席' },
  { key: 'ab', label: '打数' },
  { key: 'h', label: '安打' },
  { key: 'double', label: '2B' },
  { key: 'triple', label: '3B' },
  { key: 'homerun', label: 'HR' },
  { key: 'rbi', label: '打点' },
  { key: 'walk', label: '四球' },
  { key: 'hitByPitch', label: '死球' },
  { key: 'strikeout', label: '三振' },
  { key: 'sacBunt', label: '犠打' },
  { key: 'sacFly', label: '犠飛' },
  { key: 'obp', label: '出塁率', rate: true },
  { key: 'slg', label: '長打率', rate: true },
  { key: 'ops', label: 'OPS', rate: true, strong: true },
];

function StatTable({
  byPlayer,
  playerById,
}: {
  byPlayer: Map<string, StatLine>;
  playerById: Map<string, Player>;
}) {
  const rows = Array.from(byPlayer.entries())
    .map(([playerId, line]) => ({
      playerId,
      name: playerById.get(playerId)?.name ?? '(不明)',
      number: playerById.get(playerId)?.number ?? null,
      line,
    }))
    .sort((a, b) => b.line.pa - a.line.pa || a.name.localeCompare(b.name, 'ja'));

  if (rows.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-ink-faint">記録なし</p>
    );
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>選手</Th>
          {COLUMNS.map((c) => (
            <Th key={c.key}>{c.label}</Th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.playerId}>
            <Td>
              {r.number != null && (
                <span className="mr-1 text-ink-faint">#{r.number}</span>
              )}
              {r.name}
            </Td>
            {COLUMNS.map((c) => {
              const v = r.line[c.key];
              return (
                <Td key={c.key} strong={c.strong}>
                  {c.rate ? formatRate(v as number | null) : (v as number)}
                </Td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
