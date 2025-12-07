import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { Match, Tournament } from '../models/tournament.model';
import { supabaseClient } from '../supabase.client';

@Injectable({
  providedIn: 'root',
})
export class TournamentService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabaseClient;
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
        matches:matches (
          id,
          tournament_id,
          start_time,
          team_a,
          team_b,
          team_a_id,
          team_b_id,
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
        matches:matches (
          id,
          tournament_id,
          start_time,
          team_a,
          team_b,
          team_a_id,
          team_b_id,
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
      .select(
        `
        id,
        name,
        date,
        location,
        winner_team,
        matches:matches (
          id,
          tournament_id,
          start_time,
          team_a,
          team_b,
          team_a_id,
          team_b_id,
          score_a,
          score_b
        )
      `
      )
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
      matches: Array.isArray(row.matches) ? row.matches.map((m: any) => this.fromDbMatch(m)) : [],
    };
  }

  async upsertTournament(tournament: Tournament): Promise<void> {
    const tournamentPayload = this.toDbTournament(tournament);
    const tournamentId = tournament.id || tournamentPayload.id;
    const { error: upsertTournamentError } = await this.supabase
      .from('tournaments')
      .upsert(tournamentPayload, { onConflict: 'id' });

    if (upsertTournamentError) {
      console.error('Erreur upsert tournoi:', upsertTournamentError);
      throw new Error("Impossible d'enregistrer le tournoi");
    }

    const matchesPayload = (tournament.matches || []).map((match) =>
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

    // Nettoyage des anciens matchs
    const { data: existingMatches, error: existingErr } = await this.supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId);
    if (existingErr) {
      console.error('Erreur récupération matches existants:', existingErr);
    } else {
      const existingIds = (existingMatches ?? []).map((m: any) => m.id as string);
      const toDelete = existingIds.filter((id) => !idsToKeep.includes(id));
      if (toDelete.length) {
        const { error: deleteError } = await this.supabase.from('matches').delete().in('id', toDelete);
        if (deleteError) {
          console.error('Erreur suppression matches obsolètes:', deleteError);
        }
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
      teamAId: row.team_a_id ?? null,
      teamBId: row.team_b_id ?? null,
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
    };
  }

  private toDbMatch(match: Match) {
    return {
      id: match.id || this.generateId(),
      tournament_id: match.tournamentId,
      start_time: match.startTime,
      team_a: match.teamA,
      team_b: match.teamB,
      team_a_id: match.teamAId ?? null,
      team_b_id: match.teamBId ?? null,
      score_a: match.scoreA ?? null,
      score_b: match.scoreB ?? null,
    };
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
