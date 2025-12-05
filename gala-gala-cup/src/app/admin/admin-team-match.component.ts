import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Registration, Team, Tournament } from '../models/tournament.model';
import { RegistrationService } from '../services/registration.service';
import { TeamService } from '../services/team.service';
import { TournamentService } from '../services/tournament.service';

interface TeamSlot {
  id: string;
  name: string;
  members: Registration[];
}

@Component({
  selector: 'app-admin-team-match',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-team-match.component.html',
  styleUrls: ['./admin-team-match.component.css'],
})
export class AdminTeamMatchComponent implements OnInit {
  tournament: Tournament | null = null;
  registrations: Registration[] = [];
  bench: Registration[] = [];
  teams: TeamSlot[] = [];
  teamCount = 2;
  playersPerTeam = 5;
  loading = false;
  error = '';
  teamSelect: Record<string, string> = {};
  saveMessage = '';

  constructor(
    private registrationService: RegistrationService,
    private tournamentService: TournamentService,
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
      this.registrations = await this.registrationService.getRegistrations(this.tournament?.id ?? undefined);
      this.registrations = this.registrations.map((r) => ({
        ...r,
        userId: r.userId ?? r.id,
        username: r.username || r.userId || r.id,
      }));

      if (this.tournament?.id) {
        const persistedTeams = await this.teamService.getTeams(this.tournament.id);
        if (persistedTeams.length) {
          this.teams = persistedTeams.map((t) => ({
            id: t.id,
            name: t.name,
            members: t.members.map((m) => ({
              id: m.userId,
              userId: m.userId,
              username: m.username ?? m.userId,
              tournamentId: this.tournament?.id ?? null,
              createdAt: '',
            })),
          }));
          this.teamCount = this.teams.length;
        }
      }

      if (!this.teams.length) {
        this.generateTeams();
      }

      this.refreshBench();
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de charger les données';
    } finally {
      this.loading = false;
    }
  }

  generateTeams(): void {
    const list: TeamSlot[] = [];
    for (let i = 0; i < this.teamCount; i++) {
      list.push({ id: this.makeId(), name: `Équipe ${i + 1}`, members: [] });
    }
    this.teams = list;
    this.refreshBench();
  }

  setTeamCount(count: number): void {
    if (count < 1) return;
    this.teamCount = count;
    this.generateTeams();
  }

  assign(registration: Registration, teamId: string | null | undefined): void {
    this.error = '';
    const target = this.teams.find((t) => t.id === teamId);
    if (!target) return;
    if (this.isFull(target)) {
      this.error = 'Cette équipe est déjà complète.';
      return;
    }
    const key = registration.userId || registration.id;
    const updatedTeams = this.teams.map((t) => ({
      ...t,
      members: t.members.filter((r) => (r.userId || r.id) !== key),
    }));
    const updatedBench = this.bench.filter((r) => (r.userId || r.id) !== key);

    this.teams = updatedTeams.map((t) =>
      t.id === target.id ? { ...t, members: [...t.members, registration] } : t
    );
    this.bench = updatedBench;
    this.refreshBench();
    this.teamSelect[registration.userId || registration.id] = target.id;
  }

  removeFromTeam(team: TeamSlot, member: Registration): void {
    team.members = team.members.filter((m) => (m.userId || m.id) !== (member.userId || member.id));
    this.refreshBench();
  }

  isFull(team: TeamSlot): boolean {
    return team.members.length >= this.playersPerTeam;
  }

  private makeId(): string {
    return Math.random().toString(36).slice(2);
  }

  private refreshBench(): void {
    const assignedIds = new Set<string>(this.teams.flatMap((t) => t.members.map((m) => m.userId || m.id)));
    this.bench = this.registrations.filter((r) => !assignedIds.has(r.userId || r.id));
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  handleDragStart(event: DragEvent, registration: Registration): void {
    event.dataTransfer?.setData('id', registration.userId || registration.id);
  }

  handleDrop(event: DragEvent, team: TeamSlot): void {
    event.preventDefault();
    const key = event.dataTransfer?.getData('id');
    const reg = this.registrations.find((r) => (r.userId || r.id) === key);
    if (reg) {
      this.assign(reg, team.id);
    }
  }

  autoAssign(): void {
    const shuffled = [...this.bench];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    let teamIndex = 0;
    for (const reg of shuffled) {
      while (this.isFull(this.teams[teamIndex])) {
        teamIndex = (teamIndex + 1) % this.teams.length;
      }
      this.assign(reg, this.teams[teamIndex].id);
      teamIndex = (teamIndex + 1) % this.teams.length;
    }
  }

  async saveTeams(): Promise<void> {
    if (!this.tournament?.id) return;
    this.loading = true;
    this.error = '';
    this.saveMessage = '';
    try {
      const payload: Team[] = this.teams.map((t) => ({
        id: t.id,
        tournamentId: this.tournament!.id,
        name: t.name,
        color: null,
        members: t.members.map((m) => ({
          id: m.id,
          teamId: t.id,
          userId: m.userId ?? m.id,
        })),
      }));
      await this.teamService.saveTeams(this.tournament.id, payload);
      this.saveMessage = 'Équipes sauvegardées.';
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de sauvegarder les équipes';
    } finally {
      this.loading = false;
    }
  }
}
