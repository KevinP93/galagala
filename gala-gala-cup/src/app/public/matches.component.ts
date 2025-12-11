import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Match, Tournament } from '../models/tournament.model';
import { TournamentService } from '../services/tournament.service';

@Component({
  selector: 'app-matches',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './matches.component.html',
  styleUrls: ['./matches.component.css'],
})
export class MatchesComponent implements OnInit {
  loading = false;
  error = '';
  upcomingMatches: Match[] = [];
  inProgressMatches: Match[] = [];
  pastMatches: Match[] = [];
  upcomingTournaments: Tournament[] = [];

  constructor(private tournamentService: TournamentService) {}

  ngOnInit(): void {
    this.loadMatches();
  }

  private async loadMatches(): Promise<void> {
    const now = new Date();
    this.loading = true;
    this.error = '';
    try {
      const tournaments = await this.tournamentService.getTournaments();
      const activeTournament = tournaments.find((t) => new Date(t.date) >= now && !t.winner) || null;
      this.upcomingTournaments = activeTournament ? [activeTournament] : [];
      const matches = activeTournament?.matches || [];

      // Ne considérer que les matchs du tournoi en cours/prévu.
      const matchesWithStatus = matches.map((m) => ({
        match: m,
        isInProgress: m.status === 'in_progress',
        isFinished: m.status === 'finished',
        startTime: new Date(m.startTime),
      }));

      const sorted = matchesWithStatus.sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      );
      this.inProgressMatches = sorted.filter((entry) => entry.isInProgress).map((entry) => entry.match);
      this.pastMatches = sorted
        .filter((entry) => entry.isFinished || entry.startTime < now)
        .map((entry) => entry.match);
      this.upcomingMatches = sorted
        .filter((entry) => !entry.isFinished && !entry.isInProgress && entry.startTime >= now)
        .map((entry) => entry.match);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de charger les matchs';
    } finally {
      this.loading = false;
    }
  }
}
