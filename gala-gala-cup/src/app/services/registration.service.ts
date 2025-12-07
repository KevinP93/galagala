import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Registration } from '../models/tournament.model';
import { AuthService } from '../auth.service';
import { supabaseClient } from '../supabase.client';

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private supabase: SupabaseClient;

  constructor(private auth: AuthService) {
    this.supabase = supabaseClient;
  }

  async getRegistrations(tournamentId?: string | null): Promise<Registration[]> {
    if (!tournamentId) {
      return [];
    }

    let query = this.supabase
      .from('registrations')
      .select(
        `
        id,
        tournament_id,
        user_id,
        created_at,
        profiles:profiles ( username ),
        tournaments:tournaments ( name, date )
      `
      )
      .order('created_at', { ascending: false });

    query = query.eq('tournament_id', tournamentId);

    const { data, error } = await query;

    if (error) {
      console.error('Erreur récupération inscriptions:', error);
      throw new Error("Impossible de charger les inscriptions");
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      tournamentId: row.tournament_id ?? null,
      userId: row.user_id ?? null,
      createdAt: row.created_at,
      username: row.profiles?.username ?? null,
      tournamentName: row.tournaments?.name ?? null,
      tournamentDate: row.tournaments?.date ?? null,
    }));
  }

  async quickRegister(): Promise<void> {
    const userId = this.auth.getUserId();
    if (!userId) {
      throw new Error("Utilisateur non authentifié");
    }

    const tournamentId = await this.findNextTournamentId();

    const { error } = await this.supabase.from('registrations').insert({
      user_id: userId,
      tournament_id: tournamentId,
    });

    if (error) {
      console.error('Erreur inscription:', error);
      throw new Error("Impossible d'enregistrer l'inscription");
    }
  }

  private async findNextTournamentId(): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('id, date')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Erreur récupération prochain tournoi:', error);
      return null;
    }
    return data?.[0]?.id ?? null;
  }

  async getNextTournamentId(): Promise<string | null> {
    return this.findNextTournamentId();
  }

  async countNotificationTokens(): Promise<number> {
    const { count, error } = await this.supabase
      .from('notification_tokens')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('Erreur récupération tokens:', error);
      return 0;
    }
    return count ?? 0;
  }
}
