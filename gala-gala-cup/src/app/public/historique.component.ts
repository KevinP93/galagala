import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface Winner {
  year: number;
  team: string;
  score: string;
  mvp: string;
}

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './historique.component.html',
  styleUrls: ['./historique.component.css'],
})
export class HistoriqueComponent {
  winners: Winner[] = [
    { year: 2024, team: 'Les Panthères', score: '2 - 1', mvp: 'Kevin N.' },
    { year: 2023, team: 'Tiki Taka', score: '3 - 0', mvp: 'Brice M.' },
    { year: 2022, team: 'FC Mboa', score: '1 - 1 (5-4 TAB)', mvp: 'Aline K.' },
  ];
}
