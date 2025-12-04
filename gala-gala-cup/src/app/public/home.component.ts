import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
})
export class HomeComponent {
  nextTournament = {
    name: 'GalaGala CUP #5',
    date: '14 février 2025',
    location: 'Stade municipal de Yaoundé',
    registeredTeams: 12,
    capacity: 16,
  };

  highlights = [
    {
      title: 'Notifications des matchs',
      description: 'Soyez prévenu avant chaque coup d’envoi pour ne rien manquer.',
    },
    {
      title: 'Inscriptions rapides',
      description: 'Ajoutez vos joueurs ou vos amis en quelques clics depuis votre mobile.',
    },
    {
      title: 'Historique des champions',
      description: 'Consultez les vainqueurs et les scores de toutes les GalaGala CUP.',
    },
  ];

  get progress(): number {
    return Math.min(
      100,
      Math.round((this.nextTournament.registeredTeams / this.nextTournament.capacity) * 100)
    );
  }
}
