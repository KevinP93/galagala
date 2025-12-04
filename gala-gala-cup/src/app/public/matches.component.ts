import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Match } from '../models/tournament.model';
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
  pastMatches: Match[] = [];

  constructor(private tournamentService: TournamentService) {}

  ngOnInit(): void {
    this.loadMatches();
  }

  private async loadMatches(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const tournaments = await this.tournamentService.getTournaments();
      const allMatches = tournaments.flatMap((t) => t.matches || []);
      const now = new Date();
      const sorted = allMatches.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      this.upcomingMatches = sorted.filter((m) => new Date(m.startTime) >= now);
      this.pastMatches = sorted.filter((m) => new Date(m.startTime) < now);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de charger les matchs';
    } finally {
      this.loading = false;
    }
  }
}
