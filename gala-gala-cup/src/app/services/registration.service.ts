import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Registration } from '../models/tournament.model';
import { AuthService } from '../auth.service';

@Injectable({ providedIn: 'root' })
export class RegistrationService {
  private supabase: SupabaseClient;

  constructor(private auth: AuthService) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  async getRegistrations(): Promise<Registration[]> {
    const { data, error } = await this.supabase
      .from('registrations')
      .select(
        `
        id,
        match_id,
        user_id,
        team_name,
        created_at,
        profiles:profiles ( username ),
        matches:matches ( start_time, team_a, team_b, tournament_id )
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération inscriptions:', error);
      throw new Error("Impossible de charger les inscriptions");
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      matchId: row.match_id ?? null,
      userId: row.user_id ?? null,
      teamName: row.team_name ?? null,
      createdAt: row.created_at,
      username: row.profiles?.username ?? null,
      matchStartTime: row.matches?.start_time ?? null,
      teamA: row.matches?.team_a ?? null,
      teamB: row.matches?.team_b ?? null,
    }));
  }

  async quickRegister(): Promise<void> {
    const userId = this.auth.getUserId();
    if (!userId) {
      throw new Error("Utilisateur non authentifié");
    }

    const teamName = await this.resolveTeamName(userId);
    const matchId = await this.findNextMatchId();

    const { error } = await this.supabase.from('registrations').insert({
      team_name: teamName,
      user_id: userId,
      match_id: matchId,
    });

    if (error) {
      console.error('Erreur inscription:', error);
      throw new Error("Impossible d'enregistrer l'inscription");
    }
  }

  private async resolveTeamName(userId: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('Impossible de récupérer le username, utilisation d’un libellé par défaut');
      return 'Équipe sans nom';
    }
    return data?.username ?? 'Équipe sans nom';
  }

  private async findNextMatchId(): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('matches')
      .select('id, start_time')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Erreur récupération prochain match:', error);
      return null;
    }

    return data?.[0]?.id ?? null;
  }
}
