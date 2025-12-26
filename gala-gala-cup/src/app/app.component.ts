import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { PushService } from './services/push.service';
import { SwUpdate, VersionEvent } from '@angular/service-worker';

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
  private swSub?: Subscription;
  private currentUrl = '';
  private previousUrl: string | null = null;
  private touchStartX = 0;
  private touchEndX = 0;
  notifStatus = '';
  showNotifPrompt = false;
  notifPromptBusy = false;
  notifPromptError = '';

  constructor(private auth: AuthService, private router: Router,private push: PushService, private sw: SwUpdate) {}

  ngOnInit(): void {
    this.navSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.previousUrl = this.currentUrl || null;
        this.currentUrl = event.urlAfterRedirects;
      });

    this.maybePromptNotifications();
    this.setupServiceWorkerUpdates();
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.swSub?.unsubscribe();
  }

  async enableNotifications(): Promise<void> {
    this.notifStatus = '';
    try {
      await this.push.enablePush();
      this.notifStatus = 'Notifications activées ✅';
    } catch (e: any) {
      this.notifStatus = e?.message ?? 'Impossible d’activer les notifications';
    }
  }

  private setupServiceWorkerUpdates(): void {
    if (!this.sw.isEnabled) return;
    // activer immédiatement une nouvelle version puis recharger
    this.swSub = this.sw.versionUpdates.subscribe((event: VersionEvent) => {
      if (event.type === 'VERSION_READY') {
        this.sw.activateUpdate().then(() => document.location.reload());
      }
    });
    // déclencher une vérification au chargement
    this.sw.checkForUpdate();
    // recheck périodique
    const interval = setInterval(() => this.sw.checkForUpdate(), 60 * 60 * 1000);
    this.swSub?.add({ unsubscribe: () => clearInterval(interval) });
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

  private getPromptKey(): string {
    const userId = this.auth.getUserId();
    return `notifPrompted:${userId ?? 'guest'}`;
  }

  private async maybePromptNotifications(): Promise<void> {
    if (!this.isLoggedIn) return;
    const permission = typeof Notification !== 'undefined' ? Notification.permission : 'default';
    if (permission === 'granted') {
      return;
    }
    const key = this.getPromptKey();
    if (localStorage.getItem(key) === 'done') {
      return;
    }
    this.showNotifPrompt = true;
  }

  async acceptNotifPrompt(): Promise<void> {
    this.notifPromptError = '';
    this.notifPromptBusy = true;
    try {
      await this.enableNotifications();
      localStorage.setItem(this.getPromptKey(), 'done');
      this.showNotifPrompt = false;
    } catch (e: any) {
      this.notifPromptError = e?.message ?? "Impossible d'activer les notifications";
    } finally {
      this.notifPromptBusy = false;
    }
  }

  declineNotifPrompt(): void {
    localStorage.setItem(this.getPromptKey(), 'done');
    this.showNotifPrompt = false;
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
    const shouldGoBack = isFromLeftEdge && deltaX > 80;

    if (shouldGoBack) {
      this.goBack();
    }
    this.touchStartX = 0;
    this.touchEndX = 0;
  }

  goBack(): void {
    const tryingToOpenLoginWhileAuthenticated =
      this.auth.isLoggedIn() && this.previousUrl?.includes('/admin/login');

    if (tryingToOpenLoginWhileAuthenticated) {
      const redirect = this.auth.isAdmin() ? '/admin' : '/';
      this.router.navigateByUrl(redirect, { replaceUrl: true });
      return;
    }

    if (this.previousUrl) {
      this.router.navigateByUrl(this.previousUrl);
    } else {
      history.back();
    }
  }
}
