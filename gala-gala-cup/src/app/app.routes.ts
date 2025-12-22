import { Routes } from '@angular/router';
import { HomeComponent } from './public/home.component';
import { MatchesComponent } from './public/matches.component';
import { HistoriqueComponent } from './public/historique.component';
import { AdminLoginComponent } from './admin/admin-login.component';
import { AdminDashboardComponent } from './admin/admin-dashboard.component';
import { AdminTournamentListComponent } from './admin/admin-tournament-list.component';
import { AdminTournamentFormComponent } from './admin/admin-tournament-form.component';
import { adminGuard, authGuard, guestGuard } from './auth.guard';
import { PlayerListComponent } from './public/player-list.component';
import { AdminSignupComponent } from './admin/admin-signup.component';
import { AdminNextTournamentComponent } from './admin/admin-next-tournament.component';
import { AdminTeamMatchComponent } from './admin/admin-team-match.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full', canMatch: [authGuard] },
  { path: 'matches', component: MatchesComponent, canMatch: [authGuard] },
  { path: 'listes', component: PlayerListComponent, canMatch: [authGuard] },
  { path: 'historique', component: HistoriqueComponent, canMatch: [authGuard] },
  { path: 'admin/login', component: AdminLoginComponent, canMatch: [guestGuard] },
  { path: 'admin/signup', component: AdminSignupComponent, canMatch: [guestGuard] },
  { path: 'admin/prochain', component: AdminNextTournamentComponent, canMatch: [adminGuard] },
  { path: 'admin/prochain/gestion', component: AdminTeamMatchComponent, canMatch: [adminGuard] },
  { path: 'admin', component: AdminDashboardComponent, canMatch: [adminGuard] },
  { path: 'admin/tournois', component: AdminTournamentListComponent, canMatch: [adminGuard] },
  { path: 'admin/tournois/nouveau', component: AdminTournamentFormComponent, canMatch: [adminGuard] },
  { path: 'admin/tournois/:id', component: AdminTournamentFormComponent, canMatch: [adminGuard] },
  { path: '**', redirectTo: '' },
];
