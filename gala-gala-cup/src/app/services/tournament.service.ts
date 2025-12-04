import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';
import { Match, Tournament } from '../models/tournament.model';

@Injectable({
  providedIn: 'root',
})
export class TournamentService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
  }

  async getTournaments(): Promise<Tournament[]> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select(
        `
        id,
        name,
        date,
        location,
        winner_team,
        format,
        matches:matches (
          id,
          tournament_id,
          start_time,
          team_a,
          team_b,
          score_a,
          score_b
        )
      `
      )
      .order('date', { ascending: true });

    if (error) {
      console.error('Erreur récupération tournois:', error);
      throw new Error('Impossible de charger les tournois');
    }

    return (data ?? []).map((row) => this.fromDbTournament(row));
  }

  async getTournamentById(id: string): Promise<Tournament | null> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select(
        `
        id,
        name,
        date,
        location,
        winner_team,
        format,
        matches:matches (
          id,
          tournament_id,
          start_time,
          team_a,
          team_b,
          score_a,
          score_b
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erreur récupération tournoi:', error);
      return null;
    }

    return data ? this.fromDbTournament(data) : null;
  }

  async getNextTournament(): Promise<Tournament | null> {
    const { data, error } = await this.supabase
      .from('tournaments')
      .select('id, name, date, location, winner_team, format')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(1);

    if (error) {
      console.error('Erreur récupération prochain tournoi:', error);
      return null;
    }

    const row = data?.[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      date: row.date,
      location: row.location,
      winner: row.winner_team ?? null,
      matches: [],
      format: row.format ?? undefined,
    };
  }

  async upsertTournament(tournament: Tournament): Promise<void> {
    if (!tournament.matches.length) {
      throw new Error('Merci d’ajouter au moins un match avant de sauvegarder.');
    }
    // 1) Upsert tournoi
    const tournamentPayload = this.toDbTournament(tournament);
    const tournamentId = tournament.id || tournamentPayload.id;
    const { error: upsertTournamentError } = await this.supabase
      .from('tournaments')
      .upsert(tournamentPayload, { onConflict: 'id' });

    if (upsertTournamentError) {
      console.error('Erreur upsert tournoi:', upsertTournamentError);
      throw new Error("Impossible d'enregistrer le tournoi");
    }

    // 2) Upsert matches
    const matchesPayload = tournament.matches.map((match) =>
      this.toDbMatch({ ...match, tournamentId: match.tournamentId || tournamentId })
    );
    const idsToKeep = matchesPayload.map((m) => m.id);

    if (matchesPayload.length) {
      const { error: upsertMatchesError } = await this.supabase
        .from('matches')
        .upsert(matchesPayload, { onConflict: 'id' });

      if (upsertMatchesError) {
        console.error('Erreur upsert matches:', upsertMatchesError);
        throw new Error("Impossible d'enregistrer les matchs");
      }
    }

    // 3) Supprimer les matchs absents (remise à zéro)
    if (idsToKeep.length) {
      const { error: deleteError } = await this.supabase
        .from('matches')
        .delete()
        .eq('tournament_id', tournamentId)
        .not('id', 'in', `(${idsToKeep.map((id) => `'${id}'`).join(',')})`);

      if (deleteError) {
        console.error('Erreur suppression matches obsolètes:', deleteError);
      }
    } else {
      const { error: deleteAllError } = await this.supabase.from('matches').delete().eq('tournament_id', tournamentId);
      if (deleteAllError) {
        console.error('Erreur suppression matches (aucun à conserver):', deleteAllError);
      }
    }
  }

  async deleteTournament(id: string): Promise<void> {
    const { error: deleteMatchesError } = await this.supabase.from('matches').delete().eq('tournament_id', id);
    if (deleteMatchesError) {
      console.error('Erreur suppression matches:', deleteMatchesError);
    }

    const { error: deleteTournamentError } = await this.supabase.from('tournaments').delete().eq('id', id);
    if (deleteTournamentError) {
      console.error('Erreur suppression tournoi:', deleteTournamentError);
      throw new Error("Impossible de supprimer le tournoi");
    }
  }

  private fromDbTournament(row: any): Tournament {
    return {
      id: row.id,
      name: row.name,
      date: row.date,
      location: row.location,
      winner: row.winner_team ?? null,
      format: row.format ?? undefined,
      matches: Array.isArray(row.matches) ? row.matches.map((m: any) => this.fromDbMatch(m)) : [],
    };
  }

  private fromDbMatch(row: any): Match {
    return {
      id: row.id,
      tournamentId: row.tournament_id,
      startTime: row.start_time,
      teamA: row.team_a,
      teamB: row.team_b,
      scoreA: row.score_a ?? null,
      scoreB: row.score_b ?? null,
    };
  }

  private toDbTournament(tournament: Tournament) {
    return {
      id: tournament.id || this.generateId(),
      name: tournament.name,
      date: tournament.date,
      location: tournament.location,
      winner_team: tournament.winner ?? null,
      format: tournament.format ?? null,
    };
  }

  private toDbMatch(match: Match) {
    return {
      id: match.id || this.generateId(),
      tournament_id: match.tournamentId,
      start_time: match.startTime,
      team_a: match.teamA,
      team_b: match.teamB,
      score_a: match.scoreA ?? null,
      score_b: match.scoreB ?? null,
    };
  }

  private generateId(): string {
    return (crypto as any).randomUUID ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2);
  }
}
