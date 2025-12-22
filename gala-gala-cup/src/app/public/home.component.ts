import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tournament } from '../models/tournament.model';
import { TournamentService } from '../services/tournament.service';
import { RegistrationService } from '../services/registration.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent implements OnInit {
  nextTournament: Tournament | null = null;
  loading = false;
  error = '';
  isRegistered = false;
  hasNextTournament = false;

  highlights = [
    {
      title: 'Notifications des matchs',
      description: 'Soyez prévenu avant chaque coup d’envoi pour ne rien manquer.',
    },
    {
      title: 'Inscriptions rapides',
      description: 'Ajoutez vos joueurs ou vos amis en quelques clics depuis votre mobile.',
    },
    {
      title: 'Historique des champions',
      description: 'Consultez les vainqueurs et les scores de toutes les GalaGala CUP.',
    },
  ];

  constructor(
    private tournamentService: TournamentService,
    private registrationService: RegistrationService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.loadNextTournament();
  }

  async loadNextTournament(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.nextTournament = await this.tournamentService.getNextTournament();
      this.hasNextTournament = !!this.nextTournament;
      await this.checkRegistration();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de charger le prochain tournoi';
    } finally {
      this.loading = false;
    }
  }

  private async checkRegistration(): Promise<void> {
    this.isRegistered = false;
    const userId = this.auth.getUserId();
    if (!userId || !this.nextTournament?.id) {
      return;
    }
    const registrations = await this.registrationService.getRegistrations(this.nextTournament.id);
    this.isRegistered = registrations.some((r) => r.userId === userId);
  }
}
