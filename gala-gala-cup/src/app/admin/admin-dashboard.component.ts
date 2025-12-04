import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent {
  stats = [
    { label: 'Équipes inscrites', value: 12 },
    { label: 'Matchs planifiés', value: 8 },
    { label: 'Notifications envoyées', value: 26 },
  ];

  alerts = [
    'Publie les horaires officiels.',
    'Vérifie les coordonnées des capitaines.',
    'Confirme le terrain pour la demi-finale.',
  ];
}
