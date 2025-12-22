import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-signup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-signup.component.html',
  styleUrls: ['./admin-signup.component.css'],
})
export class AdminSignupComponent {
  email = '';
  password = '';
  username = '';
  statusMessage = '';
  loading = false;

  constructor(private auth: AuthService, private router: Router) {}

  async signup(): Promise<void> {
    if (!this.email.trim() || !this.password.trim() || !this.username.trim()) {
      this.statusMessage = 'Email, mot de passe et username sont requis.';
      return;
    }
    this.loading = true;
    this.statusMessage = '';
    try {
      await this.auth.signup(this.email.trim(), this.password.trim(), this.username.trim());
      this.router.navigate(['/']);
    } catch (err: unknown) {
      this.statusMessage = err instanceof Error ? err.message : "Impossible de créer le compte";
    } finally {
      this.loading = false;
    }
  }
}
