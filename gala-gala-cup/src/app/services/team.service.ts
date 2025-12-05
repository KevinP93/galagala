import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabaseClient } from '../supabase.client';
import { Team, TeamMember } from '../models/tournament.model';

@Injectable({ providedIn: 'root' })
export class TeamService {
  private supabase: SupabaseClient = supabaseClient;

  async getTeams(tournamentId: string): Promise<Team[]> {
    const { data, error } = await this.supabase
      .from('teams')
      .select(
        `
        id,
        tournament_id,
        name,
        color,
        team_members:team_members (
          id,
          user_id,
          profiles:profiles ( username )
        )
      `
      )
      .eq('tournament_id', tournamentId);

    if (error) {
      console.error('Erreur chargement équipes:', error);
      throw new Error('Impossible de charger les équipes');
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      tournamentId: row.tournament_id,
      name: row.name,
      color: row.color,
      members: Array.isArray(row.team_members)
        ? row.team_members.map((m: any) => ({
            id: m.id,
            teamId: row.id,
            userId: m.user_id,
            username: m.profiles?.username ?? null,
          }))
        : [],
    }));
  }

  async saveTeams(tournamentId: string, teams: Team[]): Promise<void> {
    const teamsPayload: { id: string; tournament_id: string; name: string; color: string | null }[] = [];
    const idMap = new Map<string, string>();

    teams.forEach((team) => {
      const assignedId = this.ensureUuid(team.id);
      idMap.set(team.id || assignedId, assignedId);
      teamsPayload.push({
        id: assignedId,
        tournament_id: tournamentId,
        name: team.name || 'Équipe',
        color: team.color ?? null,
      });
    });

    const ids = teamsPayload.map((t) => t.id);

    const { error: upsertErr } = await this.supabase.from('teams').upsert(teamsPayload, { onConflict: 'id' });
    if (upsertErr) {
      console.error('Erreur sauvegarde équipes:', upsertErr);
      throw new Error('Impossible de sauvegarder les équipes');
    }

    // Supprimer les membres existants pour ces équipes
    const { error: delErr } = await this.supabase.from('team_members').delete().in('team_id', ids);
    if (delErr) {
      console.error('Erreur purge membres:', delErr);
      throw new Error('Impossible de mettre à jour les membres');
    }

    const membersPayload: TeamMember[] = teams.flatMap((team) =>
      team.members.map((member) => ({
        id: this.makeId(),
        teamId: idMap.get(team.id || '') || this.ensureUuid(team.id),
        userId: member.userId,
      }))
    );

    if (membersPayload.length) {
      const { error: insertErr } = await this.supabase.from('team_members').insert(
        membersPayload.map((m) => ({
          id: m.id,
          team_id: ids.find((tid) => tid === m.teamId) || m.teamId,
          user_id: m.userId,
        }))
      );
      if (insertErr) {
        console.error('Erreur insertion membres:', insertErr);
        throw new Error('Impossible d’ajouter les membres');
      }
    }
  }

  async saveHistory(tournamentId: string, historyId: string, winnerTeam: Team): Promise<void> {
    const { error: historyErr } = await this.supabase.from('tournament_history').insert({
      id: historyId,
      tournament_id: tournamentId,
      winner_team_id: winnerTeam.id,
      winner_team_name: winnerTeam.name,
    });
    if (historyErr) {
      console.error('Erreur insertion historique tournoi:', historyErr);
      throw new Error('Impossible de sauvegarder le vainqueur');
    }

    const membersPayload =
      winnerTeam.members?.map((m) => ({
        id: this.makeId(),
        history_id: historyId,
        user_id: m.userId,
        username_snapshot: m.username ?? null,
      })) ?? [];

    if (membersPayload.length) {
      const { error: histMembersErr } = await this.supabase.from('tournament_history_players').insert(membersPayload);
      if (histMembersErr) {
        console.error('Erreur insertion joueurs historique:', histMembersErr);
        throw new Error('Impossible de sauvegarder les joueurs du vainqueur');
      }
    }
  }

  private makeId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // simple fallback UUID v4-ish
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private ensureUuid(id?: string | null): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (id && uuidRegex.test(id)) {
      return id;
    }
    return this.makeId();
  }
}
