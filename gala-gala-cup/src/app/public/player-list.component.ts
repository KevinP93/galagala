import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Registration } from '../models/tournament.model';
import { RegistrationService } from '../services/registration.service';

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

  constructor(private registrationService: RegistrationService) {}

  ngOnInit(): void {
    this.loadRegistrations();
  }

  async loadRegistrations(): Promise<void> {
    this.loading = true;
    this.error = '';
    try {
      this.registrations = await this.registrationService.getRegistrations();
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
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de créer la nouvelle inscription';
    } finally {
      this.submitting = false;
    }
  }
}
