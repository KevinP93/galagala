import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RegistrationService } from '../services/registration.service';
import { TournamentService } from '../services/tournament.service';
import { Tournament } from '../models/tournament.model';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit {
  stats = [
    { label: 'Joueurs inscrits', value: 0 },
    { label: 'Matchs planifiés', value: 0 },
    { label: 'Notifications envoyées', value: 0 },
  ];

  alerts = [
    'Publie les horaires officiels.',
    'Vérifie les coordonnées des capitaines.',
    'Confirme le terrain pour la demi-finale.',
  ];

  tournament: Tournament | null = null;
  error = '';
  loading = false;

  constructor(
    private registrationService: RegistrationService,
    private tournamentService: TournamentService
  ) {}

  ngOnInit(): void {
    this.loadStats();
  }

  async loadStats(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.tournament = await this.tournamentService.getNextTournament();
      const tournamentId = this.tournament?.id ?? undefined;
      const registrations = await this.registrationService.getRegistrations(tournamentId);
      const tokens = await this.registrationService.countNotificationTokens();
      const matchesCount = this.tournament?.matches?.length ?? 0;
      this.stats = [
        { label: 'Joueurs inscrits', value: registrations.length },
        { label: 'Matchs planifiés', value: matchesCount },
        { label: 'Notifications envoyées', value: tokens },
      ];
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Erreur chargement stats';
    } finally {
      this.loading = false;
    }
  }
}
