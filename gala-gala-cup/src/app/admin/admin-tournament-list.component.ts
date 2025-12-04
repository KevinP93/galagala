import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tournament } from '../models/tournament.model';
import { TournamentService } from '../services/tournament.service';

@Component({
  selector: 'app-admin-tournament-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-tournament-list.component.html',
  styleUrls: ['./admin-tournament-list.component.css'],
})
export class AdminTournamentListComponent implements OnInit {
  tournaments: Tournament[] = [];
  loading = false;
  error = '';

  constructor(private tournamentService: TournamentService) {}

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.tournaments = await this.tournamentService.getTournaments();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de charger les tournois';
    } finally {
      this.loading = false;
    }
  }
}
