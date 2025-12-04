import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Match, Tournament } from '../models/tournament.model';
import { TournamentService } from '../services/tournament.service';

@Component({
  selector: 'app-admin-tournament-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-tournament-form.component.html',
  styleUrls: ['./admin-tournament-form.component.css'],
})
export class AdminTournamentFormComponent implements OnInit {
  tournament: Tournament = this.newTournament();
  newMatch: Partial<Match> = { teamA: '', teamB: '', startTime: '' };
  savedMessage = '';
  error = '';
  loading = false;
  private draftTournamentId = this.generateId();

  constructor(
    private tournamentService: TournamentService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'nouveau') {
      this.loadTournament(id);
    }
  }

  private newTournament(): Tournament {
    return {
      id: '',
      name: '',
      date: '',
      location: '',
      winner: null,
      matches: [],
      format: 'table',
    };
  }

  async loadTournament(id: string): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const data = await this.tournamentService.getTournamentById(id);
      if (!data) {
        this.error = 'Tournoi introuvable';
        return;
      }
      this.tournament = data;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Erreur lors du chargement';
    } finally {
      this.loading = false;
    }
  }

  addMatch(): void {
    if (!this.newMatch.teamA?.trim() || !this.newMatch.teamB?.trim() || !this.newMatch.startTime) {
      return;
    }
    const match: Match = {
      id: this.generateId(),
      tournamentId: this.tournament.id || this.draftTournamentId,
      teamA: this.newMatch.teamA.trim(),
      teamB: this.newMatch.teamB.trim(),
      startTime: this.newMatch.startTime,
      scoreA: null,
      scoreB: null,
    };
    this.tournament = { ...this.tournament, matches: [...this.tournament.matches, match] };
    this.newMatch = { teamA: '', teamB: '', startTime: '' };
  }

  removeMatch(matchId: string): void {
    this.tournament = {
      ...this.tournament,
      matches: this.tournament.matches.filter((m) => m.id !== matchId),
    };
  }

  async saveTournament(): Promise<void> {
    this.savedMessage = '';
    this.error = '';
    if (!this.tournament.name.trim() || !this.tournament.date) {
      this.error = 'Nom et date requis.';
      return;
    }
    if (!this.tournament.matches.length) {
      this.error = 'Ajoute au moins un match.';
      return;
    }
    const id = this.tournament.id || this.draftTournamentId;
    const payload: Tournament = {
      ...this.tournament,
      id,
      matches: this.tournament.matches.map((m) => ({ ...m, tournamentId: id })),
    };
    this.loading = true;
    try {
      await this.tournamentService.upsertTournament(payload);
      this.savedMessage = 'Tournoi enregistré.';
      this.tournament.id = id;
      this.router.navigate(['/admin/tournois', id]);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de sauvegarder';
    } finally {
      this.loading = false;
    }
  }

  private generateId(): string {
    return (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2);
  }
}
