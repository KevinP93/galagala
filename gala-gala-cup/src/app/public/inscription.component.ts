import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Registration {
  playerName: string;
  teamName: string;
  contact: string;
  registeredAt: Date;
}

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inscription.component.html',
  styleUrls: ['./inscription.component.css'],
})
export class InscriptionComponent {
  playerName = '';
  teamName = '';
  contact = '';
  registrations: Registration[] = [];

  registerPlayer(): void {
    if (!this.playerName.trim() || !this.contact.trim()) {
      return;
    }

    this.registrations = [
      ...this.registrations,
      {
        playerName: this.playerName.trim(),
        teamName: this.teamName.trim() || 'Équipe à compléter',
        contact: this.contact.trim(),
        registeredAt: new Date(),
      },
    ];

    this.playerName = '';
    this.teamName = '';
    this.contact = '';
  }
}
