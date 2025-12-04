import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-login.component.html',
  styleUrls: ['./admin-login.component.css'],
})
export class AdminLoginComponent {
  identifier = '';
  password = '';
  statusMessage = '';
  loading = false;

  constructor(private router: Router, private auth: AuthService) {}

  async login(): Promise<void> {
    const hasValues = this.identifier.trim() && this.password.trim();
    if (!hasValues) {
      this.statusMessage = 'Merci de renseigner un email/username et un mot de passe.';
      return;
    }

    this.loading = true;
    this.statusMessage = '';
    try {
      const role = await this.auth.login(this.identifier, this.password);
      this.statusMessage =
        role === 'admin'
          ? 'Connexion réussie · rôle admin détecté.'
          : 'Connexion réussie · rôle joueur.';

      if (role === 'admin') {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/']);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Connexion impossible';
      this.statusMessage = message;
    } finally {
      this.loading = false;
    }
  }
}
