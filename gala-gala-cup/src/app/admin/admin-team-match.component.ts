import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Match, Registration, Team, Tournament } from '../models/tournament.model';
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
  matches: Match[] = [];
  newMatch: Partial<Match> = { teamAId: '', teamBId: '', startTime: '' };
  teamCount = 2;
  playersPerTeam = 5;
  loading = false;
  savingMatches = false;
  error = '';
  teamSelect: Record<string, string> = {};
  saveMessage = '';
  confirmVisible = false;
  underfilled: string[] = [];
  summaryTeams: TeamSlot[] = [];
  deleteTeamVisible: Record<string, boolean> = {};
  touchStartTeamX: Record<string, number> = {};
  activeTouchReg: Registration | null = null;
  readonly isTouch =
    typeof window !== 'undefined' && ('ontouchstart' in window || (navigator as any).maxTouchPoints > 0);

  constructor(
    private registrationService: RegistrationService,
    private tournamentService: TournamentService,
    private teamService: TeamService,
    private router: Router
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

      this.matches = this.tournament?.matches ?? [];

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
    if (typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function') {
      return (crypto as any).randomUUID();
    }
    // fallback simple v4-ish
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
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

  removeTeam(teamId: string): void {
    this.teams = this.teams.filter((t) => t.id !== teamId);
    delete this.deleteTeamVisible[teamId];
    this.teamCount = this.teams.length;
    this.refreshBench();
    this.saveTeamsDirect(); // suppression immédiate en base
  }

  addMatch(): void {
    if (!this.tournament) return;
    const teamA = this.teams.find((t) => t.id === this.newMatch.teamAId);
    const teamB = this.teams.find((t) => t.id === this.newMatch.teamBId);
    if (!teamA || !teamB || !this.newMatch.startTime) {
      this.error = 'Selectionne deux equipes et une date.';
      return;
    }
    // composer avec la date du tournoi (ou aujourd'hui) + heure saisie
    const baseDate = this.tournament?.date ? new Date(this.tournament.date) : new Date();
    const [hh, mm] = this.newMatch.startTime.split(':');
    baseDate.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
    const iso = baseDate.toISOString();

    const match: Match = {
      id: this.makeId(),
      tournamentId: this.tournament.id,
      startTime: iso,
      teamA: teamA.name,
      teamB: teamB.name,
      teamAId: teamA.id,
      teamBId: teamB.id,
      scoreA: null,
      scoreB: null,
    };
    this.matches = [...this.matches, match];
    this.tournament.matches = this.matches;
    this.newMatch = { teamAId: '', teamBId: '', startTime: '' };
    this.error = '';
  }

  removeMatch(matchId: string): void {
    this.matches = this.matches.filter((m) => m.id !== matchId);
    if (this.tournament) {
      this.tournament.matches = this.matches;
    }
  }

  async saveMatches(): Promise<void> {
    if (!this.tournament?.id) return;
    this.savingMatches = true;
    this.error = '';
    this.saveMessage = '';
    try {
      const payload: Tournament = {
        ...this.tournament,
        matches: this.matches.map((m) => ({ ...m, tournamentId: this.tournament!.id })),
      };
      await this.tournamentService.upsertTournament(payload);
      const refreshed = await this.tournamentService.getTournamentById(this.tournament.id);
      if (refreshed) {
        this.tournament = refreshed;
        this.matches = refreshed.matches ?? [];
      }
      this.saveMessage = 'Matchs sauvegardés.';
      this.router.navigate(['/admin/prochain']);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de sauvegarder les matchs';
    } finally {
      this.savingMatches = false;
    }
  }

  async saveTeams(): Promise<void> {
    await this.openConfirm();
  }

  closeConfirm(): void {
    this.confirmVisible = false;
  }

  private async openConfirm(): Promise<void> {
    this.error = '';
    this.saveMessage = '';
    this.confirmVisible = false;
    this.underfilled = [];
    this.summaryTeams = [...this.teams];

    if (!this.tournament?.id) {
      this.error = 'Aucun tournoi cible.';
      return;
    }

    this.underfilled = this.teams
      .filter((t) => t.members.length < this.playersPerTeam)
      .map((t) => `${t.name} (${t.members.length}/${this.playersPerTeam})`);

    // Check duplicates in current selection
    const nameCounts: Record<string, number> = {};
    for (const t of this.teams) {
      const key = t.name.trim().toLowerCase();
      nameCounts[key] = (nameCounts[key] || 0) + 1;
      if (nameCounts[key] > 1) {
        this.error = `Nom d'équipe dupliqué : "${t.name}". Chaque équipe doit avoir un nom unique.`;
        return;
      }
    }

    const existing = await this.teamService.getTeams(this.tournament.id);
    const existingMap = new Map(existing.map((t) => [t.name?.toLowerCase(), t.id]));
    const duplicate = this.teams.find((t) => {
      const existingId = existingMap.get(t.name.toLowerCase());
      return existingId && existingId !== t.id;
    });
    if (duplicate) {
      this.error = `Une équipe nommée "${duplicate.name}" existe déjà pour ce tournoi. Choisis un autre nom.`;
      return;
    }

    this.confirmVisible = true;
  }

  async confirmSave(): Promise<void> {
    if (!this.tournament?.id) return;
    await this.persistTeams();
    this.confirmVisible = false;
    this.router.navigate(['/admin/prochain']);
  }

  private async persistTeams(): Promise<void> {
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
      this.router.navigate(['/admin/prochain']);
    } catch (err: unknown) {
      this.error = err instanceof Error ? err.message : 'Impossible de sauvegarder les équipes';
    } finally {
      this.loading = false;
    }
  }

  private saveTeamsDirect(): void {
    // déclenche une sauvegarde silencieuse sans passer par la modale
    this.persistTeams();
  }

  showDelete(teamId: string): void {
    this.deleteTeamVisible[teamId] = true;
  }

  hideDelete(teamId: string): void {
    this.deleteTeamVisible[teamId] = false;
  }

  onTeamTouchStart(event: TouchEvent, teamId: string): void {
    this.touchStartTeamX[teamId] = event.touches[0].clientX;
  }

  onTeamTouchMove(event: TouchEvent, teamId: string): void {
    if (this.activeTouchReg) {
      event.preventDefault();
    }
    this.touchStartTeamX[teamId] ??= event.touches[0].clientX;
  }

  onTeamTouchEnd(event: TouchEvent, teamId: string): void {
    const startX = this.touchStartTeamX[teamId] ?? 0;
    const endX = event.changedTouches[0].clientX;
    const deltaX = endX - startX;
    if (deltaX < -60) {
      if (this.deleteTeamVisible[teamId]) {
        this.removeTeam(teamId);
      } else {
        this.showDelete(teamId);
      }
    } else if (deltaX > 60) {
      this.hideDelete(teamId);
    }
    delete this.touchStartTeamX[teamId];

    // if a player touch is active, drop into this team
    if (this.activeTouchReg) {
      this.assign(this.activeTouchReg, teamId);
      this.activeTouchReg = null;
    }
  }

  onBenchTouchStart(event: TouchEvent, reg: Registration): void {
    if (!this.isTouch) return;
    event.preventDefault();
    this.activeTouchReg = reg;
  }
}
