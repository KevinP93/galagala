export interface Match {
  id: string;
  tournamentId: string;
  startTime: string;
  teamA: string;
  teamB: string;
  status?: 'planned' | 'in_progress' | 'finished' | null;
  scoreA?: number | null;
  scoreB?: number | null;
  teamAId?: string | null;
  teamBId?: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  winner?: string | null;
  matches: Match[];
}

export interface Registration {
  id: string;
  tournamentId: string | null;
  userId: string | null;
  createdAt: string;
  username?: string | null;
  tournamentName?: string | null;
  tournamentDate?: string | null;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  username?: string | null;
}

export interface Team {
  id: string;
  tournamentId: string;
  name: string;
  color?: string | null;
  members: TeamMember[];
}
