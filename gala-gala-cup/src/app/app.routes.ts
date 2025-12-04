import { Routes } from '@angular/router';
import { HomeComponent } from './public/home.component';
import { MatchesComponent } from './public/matches.component';
import { HistoriqueComponent } from './public/historique.component';
import { AdminLoginComponent } from './admin/admin-login.component';
import { AdminDashboardComponent } from './admin/admin-dashboard.component';
import { AdminTournamentListComponent } from './admin/admin-tournament-list.component';
import { AdminTournamentFormComponent } from './admin/admin-tournament-form.component';
import { adminGuard, authGuard } from './auth.guard';
import { PlayerListComponent } from './public/player-list.component';
import { AdminSignupComponent } from './admin/admin-signup.component';

export const routes: Routes = [
  { path: '', component: HomeComponent, pathMatch: 'full', canMatch: [authGuard] },
  { path: 'matches', component: MatchesComponent, canMatch: [authGuard] },
  { path: 'listes', component: PlayerListComponent, canMatch: [authGuard] },
  { path: 'historique', component: HistoriqueComponent, canMatch: [authGuard] },
  { path: 'admin/login', component: AdminLoginComponent },
  { path: 'admin/signup', component: AdminSignupComponent },
  { path: 'admin', component: AdminDashboardComponent, canMatch: [adminGuard] },
  { path: 'admin/tournois', component: AdminTournamentListComponent, canMatch: [adminGuard] },
  { path: 'admin/tournois/nouveau', component: AdminTournamentFormComponent, canMatch: [adminGuard] },
  { path: 'admin/tournois/:id', component: AdminTournamentFormComponent, canMatch: [adminGuard] },
  { path: '**', redirectTo: '' },
];
