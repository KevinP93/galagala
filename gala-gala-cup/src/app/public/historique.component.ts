import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Match, Team } from '../models/tournament.model';
import { TournamentService } from '../services/tournament.service';
import { TeamService } from '../services/team.service';

interface HistoryEntry {
  id: string;
  name: string;
  date: string;
  winner: string;
  score?: string | null;
  finalMatch?: {
    teamAId?: string | null;
    teamBId?: string | null;
    teamA?: string | null;
    teamB?: string | null;
  } | null;
}

interface FinalistTeam {
  name: string;
  players: string[];
}

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historique.component.html',
  styleUrls: ['./historique.component.css'],
})
export class HistoriqueComponent implements OnInit {
  history: HistoryEntry[] = [];
  loading = false;
  error = '';
  showModal = false;
  modalLoading = false;
  modalError = '';
  selectedTournamentTitle = '';
  selectedWinner = '';
  selectedFinalists: FinalistTeam[] = [];

  constructor(private tournamentService: TournamentService, private teamService: TeamService) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  async loadHistory(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const tournaments = await this.tournamentService.getTournaments();
      this.history = (tournaments ?? [])
        .filter((t) => !!t.winner)
        .sort((a, b) => this.getTime(b.date) - this.getTime(a.date))
        .slice(0, 4)
        .map((t) => {
          const finalMatch = this.pickMatchWithScore(t.matches);
          return {
            id: t.id,
            name: t.name,
            date: t.date,
            winner: t.winner ?? '',
            score: this.formatScore(finalMatch),
            finalMatch: finalMatch
              ? {
                  teamAId: finalMatch.teamAId,
                  teamBId: finalMatch.teamBId,
                  teamA: finalMatch.teamA,
                  teamB: finalMatch.teamB,
                }
              : null,
          };
        });
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : "Impossible de charger l'historique";
    } finally {
      this.loading = false;
    }
  }

  async openFinalists(entry: HistoryEntry): Promise<void> {
    this.showModal = true;
    this.modalLoading = true;
    this.modalError = '';
    this.selectedFinalists = [];
    this.selectedTournamentTitle = entry.name;
    this.selectedWinner = entry.winner;

    if (!entry.finalMatch) {
      this.modalError = 'Finale non renseignee.';
      this.modalLoading = false;
      return;
    }

    try {
      const teams = await this.teamService.getTeams(entry.id);
      const finalists = this.resolveFinalists(entry.finalMatch, teams);
      this.selectedFinalists = finalists;
      if (!finalists.length) {
        this.modalError = 'Equipes finales introuvables.';
      }
    } catch (err: unknown) {
      this.modalError = err instanceof Error ? err.message : 'Impossible de charger les equipes finalistes';
    } finally {
      this.modalLoading = false;
    }
  }

  closeModal(): void {
    this.showModal = false;
    this.modalError = '';
    this.selectedFinalists = [];
    this.selectedWinner = '';
  }

  private resolveFinalists(
    finalMatch: NonNullable<HistoryEntry['finalMatch']>,
    teams: Team[]
  ): FinalistTeam[] {
    const list: FinalistTeam[] = [];
    const matchTeams = [
      { id: finalMatch.teamAId, name: finalMatch.teamA },
      { id: finalMatch.teamBId, name: finalMatch.teamB },
    ];
    matchTeams.forEach((info) => {
      const found = this.findTeam(teams, info.id, info.name);
      if (found) {
        list.push({
          name: found.name,
          players: found.members.map((m) => m.username || m.userId || 'Joueur'),
        });
      } else if (info.name) {
        list.push({ name: info.name, players: [] });
      }
    });
    return list;
  }

  private findTeam(teams: Team[], id?: string | null, name?: string | null): Team | undefined {
    if (id) {
      const byId = teams.find((t) => t.id === id);
      if (byId) return byId;
    }
    if (name) {
      const target = name.trim().toLowerCase();
      return teams.find((t) => t.name.trim().toLowerCase() === target);
    }
    return undefined;
  }

  private pickMatchWithScore(matches: Match[] | undefined): Match | null {
    if (!Array.isArray(matches) || !matches.length) {
      return null;
    }
    const scored = matches.filter((m) => this.hasScore(m));
    if (!scored.length) {
      return null;
    }
    const finished = scored
      .filter((m) => m.status === 'finished')
      .sort((a, b) => this.getTime(b.startTime) - this.getTime(a.startTime));
    if (finished.length) {
      return finished[0];
    }
    return scored.sort((a, b) => this.getTime(b.startTime) - this.getTime(a.startTime))[0];
  }

  private hasScore(match: Match | null | undefined): match is Match {
    return (
      !!match &&
      match.scoreA !== null &&
      match.scoreA !== undefined &&
      match.scoreB !== null &&
      match.scoreB !== undefined
    );
  }

  private formatScore(match: Match | null): string | null {
    if (!this.hasScore(match)) {
      return null;
    }
    const scoreText = `${match.scoreA} - ${match.scoreB}`;
    if (match.teamA && match.teamB) {
      return `${match.teamA} ${scoreText} ${match.teamB}`;
    }
    return scoreText;
  }

  private getTime(value: string | null | undefined): number {
    if (!value) {
      return 0;
    }
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  }
}
