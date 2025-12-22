import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Registration } from '../models/tournament.model';
import { RegistrationService } from '../services/registration.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-player-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './player-list.component.html',
  styleUrls: ['./player-list.component.css'],
})
export class PlayerListComponent implements OnInit {
  registrations: Registration[] = [];
  loading = false;
  submitting = false;
  error = '';
  isRegistered = false;
  hasNextTournament = false;
  currentUserId: string | null = null;

  constructor(private registrationService: RegistrationService, private auth: AuthService) {
    this.currentUserId = this.auth.getUserId();
  }

  ngOnInit(): void {
    this.loadRegistrations();
  }

  async loadRegistrations(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      const nextTournamentId = await this.registrationService.getNextTournamentId();
      this.hasNextTournament = !!nextTournamentId;
      this.registrations = await this.registrationService.getRegistrations(nextTournamentId ?? undefined);
      this.isRegistered = !!this.currentUserId && this.registrations.some((r) => r.userId === this.currentUserId);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de charger les inscriptions';
    } finally {
      this.loading = false;
    }
  }

  async register(): Promise<void> {
    this.submitting = true;
    this.error = '';
    try {
      await this.registrationService.quickRegister();
      await this.loadRegistrations();
      this.isRegistered = true;
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de créer la nouvelle inscription';
    } finally {
      this.submitting = false;
    }
  }
}
