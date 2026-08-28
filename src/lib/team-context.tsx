'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Team } from './types';

const TeamContext = createContext<Team | null>(null);

export function TeamProvider({
  team,
  children,
}: {
  team: Team;
  children: ReactNode;
}) {
  return <TeamContext.Provider value={team}>{children}</TeamContext.Provider>;
}

// /team/[teamId] 配下でのみ使用可。チーム情報（id, name）を返す。
export function useTeamContext(): Team {
  const team = useContext(TeamContext);
  if (!team) {
    throw new Error('useTeamContext は /team/[teamId] のレイアウト配下で使用してください');
  }
  return team;
}
