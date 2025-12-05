import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Registration, Tournament, Team } from '../models/tournament.model';
import { RegistrationService } from '../services/registration.service';
import { TournamentService } from '../services/tournament.service';
import { TeamService } from '../services/team.service';

@Component({
  selector: 'app-admin-next-tournament',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './admin-next-tournament.component.html',
  styleUrls: ['./admin-next-tournament.component.css'],
})
export class AdminNextTournamentComponent implements OnInit {
  tournament: Tournament | null = null;
  registrations: Registration[] = [];
  teams: Team[] = [];
  loading = false;
  error = '';
  showEditModal = false;
  editDate = '';
  editWinner = '';
  showWinnerForm = false;
  selectedWinnerTeamId: string | null = null;

  constructor(
    private tournamentService: TournamentService,
    private registrationService: RegistrationService,
    private teamService: TeamService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.tournament = await this.tournamentService.getNextTournament();
      if (this.tournament?.id) {
        this.registrations = await this.registrationService.getRegistrations(this.tournament.id);
        this.editDate = this.tournament.date?.slice(0, 10);
        this.editWinner = this.tournament.winner ?? '';
        this.teams = await this.teamService.getTeams(this.tournament.id);
        this.selectedWinnerTeamId = this.tournament.winner ? this.teams.find((t) => t.name === this.tournament?.winner)?.id ?? null : null;
      }
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de charger le prochain tournoi';
    } finally {
      this.loading = false;
    }
  }

  openEditModal(): void {
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
  }

  async saveTournament(): Promise<void> {
    if (!this.tournament) return;
    this.loading = true;
    this.error = '';
    try {
      const updated: Tournament = {
        ...this.tournament,
        date: this.editDate || this.tournament.date,
        winner: this.editWinner || null,
      };
      await this.tournamentService.upsertTournament(updated);
      this.tournament = updated;
      this.closeEditModal();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de mettre à jour le tournoi';
    } finally {
      this.loading = false;
    }
  }

  toggleWinnerForm(): void {
    this.showWinnerForm = !this.showWinnerForm;
  }

  async saveWinner(): Promise<void> {
    if (!this.tournament?.id || !this.selectedWinnerTeamId) {
      this.error = 'Sélectionne une équipe gagnante.';
      return;
    }
    const winnerTeam = this.teams.find((t) => t.id === this.selectedWinnerTeamId);
    if (!winnerTeam) {
      this.error = 'Équipe introuvable.';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      // maj tournoi
      await this.tournamentService.upsertTournament({
        ...this.tournament,
        winner: winnerTeam.name,
      });
      this.tournament.winner = winnerTeam.name;

      // insérer historique + joueurs snapshot
      const historyId = crypto.randomUUID();
      await this.teamService.saveHistory(this.tournament.id, historyId, winnerTeam);
      this.showWinnerForm = false;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de sauvegarder le vainqueur';
    } finally {
      this.loading = false;
    }
  }
}
