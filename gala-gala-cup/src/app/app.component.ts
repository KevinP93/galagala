import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'gala-gala-cup';
  menuOpen = false;
  private navSub?: Subscription;
  private currentUrl = '';
  private previousUrl: string | null = null;
  private touchStartX = 0;
  private touchEndX = 0;

  constructor(private auth: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.navSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.previousUrl = this.currentUrl || null;
        this.currentUrl = event.urlAfterRedirects;
      });
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
  }

  get isLoggedIn(): boolean {
    return this.auth.isLoggedIn();
  }

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    this.router.navigate(['/admin/login']);
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  closeMenu(): void {
    this.menuOpen = false;
  }

  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchEndX = this.touchStartX;
  }

  onTouchMove(event: TouchEvent): void {
    this.touchEndX = event.touches[0].clientX;
  }

  onTouchEnd(): void {
    const deltaX = this.touchEndX - this.touchStartX;
    const isFromLeftEdge = this.touchStartX < 50;
    if (isFromLeftEdge && deltaX > 80) {
      if (this.previousUrl) {
        this.router.navigateByUrl(this.previousUrl);
      } else {
        history.back();
      }
    }
    this.touchStartX = 0;
    this.touchEndX = 0;
  }
}
