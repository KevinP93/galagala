export interface Match {
  id: string;
  tournamentId: string;
  startTime: string;
  teamA: string;
  teamB: string;
  scoreA?: number | null;
  scoreB?: number | null;
}

export interface Tournament {
  id: string;
  name: string;
  date: string;
  location: string;
  winner?: string | null;
  matches: Match[];
  format?: 'table' | 'poule' | 'elim';
}

export interface Registration {
  id: string;
  matchId: string | null;
  userId: string | null;
  teamName: string | null;
  createdAt: string;
  username?: string | null;
  matchStartTime?: string | null;
  teamA?: string | null;
  teamB?: string | null;
}
