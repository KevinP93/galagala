import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegistrationService } from '../services/registration.service';
import { TournamentService } from '../services/tournament.service';
import { Tournament } from '../models/tournament.model';
import { environment } from '../../environments/environment';
import { createClient, SupabaseClient } from '@supabase/supabase-js';


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
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
  private supabase: SupabaseClient;


  constructor(
    private registrationService: RegistrationService,
    private tournamentService: TournamentService
  ) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  showNotificationModal = false;
  notificationTitle = '';
  notificationMessage = '';
  notificationError = '';

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

  openNotificationModal(): void {
    this.notificationError = '';
    this.showNotificationModal = true;
  }

  closeNotificationModal(): void {
    this.showNotificationModal = false;
  }

  saveNotificationDraft(): void {
    if (!this.notificationTitle.trim() || !this.notificationMessage.trim()) {
      this.notificationError = 'Titre et message obligatoires.';
      return;
    }
    this.notificationError = '';
    // Ici on pourrait appeler un service d'envoi; on se contente de fermer après validation.
    this.showNotificationModal = false;
  }

  async sendNotification(): Promise<void> {
  this.notificationError = '';

  try {
    const { data } = await this.supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error('Non connecté');

    const res = await fetch(`${environment.supabaseFunctionsUrl}/send-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        title: this.notificationTitle || 'GalaGala CUP',
        body: this.notificationMessage || 'Nouvelle annonce'
      })
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error ?? 'Erreur envoi notification');

    this.closeNotificationModal();
    alert(`Notif envoyée ✅ (${json.sent}/${json.total})`);
  } catch (e: any) {
    this.notificationError = e?.message ?? 'Erreur';
  }
}

}
