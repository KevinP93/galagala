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
    { label: 'Matchs planifies', value: 0 },
    { label: 'Notifications envoyees', value: 0 },
  ];

  alerts = [
    'Publie les horaires officiels.',
    'Verifie les coordonnees des capitaines.',
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
      const tokens = await this.registrationService.countNotificationTokens();

      if (!this.tournament) {
        this.stats = [
          { label: 'Joueurs inscrits', value: 0 },
          { label: 'Matchs planifies', value: 0 },
          { label: 'Notifications envoyees', value: tokens },
        ];
        return;
      }

      const registrations = await this.registrationService.getRegistrations(this.tournament.id);
      const matchesCount = this.tournament.matches?.length ?? 0;
      this.stats = [
        { label: 'Joueurs inscrits', value: registrations.length },
        { label: 'Matchs planifies', value: matchesCount },
        { label: 'Notifications envoyees', value: tokens },
      ];
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Erreur chargement stats';
    } finally {
      this.loading = false;
    }
  }
}
