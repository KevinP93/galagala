import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { Tournament } from '../models/tournament.model';
import { TournamentService } from '../services/tournament.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css'],
})
export class AdminLoginComponent implements OnInit {
  identifier = '';
  password = '';
  statusMessage = '';
  loading = false;
  loadingTournament = false;
  signupHint = '';
  nextTournament: Tournament | null = null;

  constructor(
    private router: Router,
    private auth: AuthService,
    private tournamentService: TournamentService
  ) {}

  async ngOnInit(): Promise<void> {
    if (this.auth.isLoggedIn()) {
      this.safeRedirectAfterLogin(this.auth.isAdmin() ? 'admin' : 'player');
      return;
    }

    await this.loadNextTournament();
  }

  async login(): Promise<void> {
    const hasValues = this.identifier.trim() && this.password.trim();
    if (!hasValues) {
      this.statusMessage = 'Merci de renseigner un email/username et un mot de passe.';
      return;
    }

    this.loading = true;
    this.statusMessage = '';
    try {
      const role = await this.auth.login(this.identifier, this.password);
      this.statusMessage =
        role === 'admin'
          ? 'Connexion reussie - espace organisateur.'
          : 'Connexion reussie - espace joueur.';

      this.safeRedirectAfterLogin(role);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connexion impossible';
      this.statusMessage = message;
    } finally {
      this.loading = false;
    }
  }

  goToSignup(): void {
    this.router.navigate(['/admin/signup'], { replaceUrl: true });
  }

  private async loadNextTournament(): Promise<void> {
    this.loadingTournament = true;
    this.signupHint = 'Tu peux creer un compte maintenant.';
    try {
      this.nextTournament = await this.tournamentService.getNextTournament();
    } catch (error) {
      console.error('Erreur lors du chargement du prochain tournoi:', error);
      this.signupHint = 'Compte joueur OK. Planning non disponible pour le moment.';
    } finally {
      this.loadingTournament = false;
    }
  }

  private safeRedirectAfterLogin(role: 'admin' | 'player'): void {
    const target = role === 'admin' ? '/admin' : '/';
    this.router.navigate([target], { replaceUrl: true });
  }
}
