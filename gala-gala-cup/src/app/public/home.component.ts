import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Tournament } from '../models/tournament.model';
import { TournamentService } from '../services/tournament.service';

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

  constructor(private tournamentService: TournamentService) {}

  ngOnInit(): void {
    this.loadNextTournament();
  }

  async loadNextTournament(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.nextTournament = await this.tournamentService.getNextTournament();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de charger le prochain tournoi';
    } finally {
      this.loading = false;
    }
  }

  get hasNextTournament(): boolean {
    return !!this.nextTournament;
  }
}
