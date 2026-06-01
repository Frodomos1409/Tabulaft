import { Component, inject, signal, computed, OnInit, OnDestroy, HostListener, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SearchModalComponent } from '../search-modal/search-modal.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, SearchModalComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit, OnDestroy {
  theme = inject(ThemeService);
  auth = inject(AuthService);
  notifService = inject(NotificationService);
  private router = inject(Router);
  private el = inject(ElementRef);

  scrolled = signal(false);
  mobileMenuOpen = signal(false);
  notifOpen = signal(false);
  searchOpen = signal(false);

  notifications = this.notifService.notifications;
  unreadCount = this.notifService.unreadCount;

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.notifService.loadNotifications(user.id);
      this.notifService.subscribeToRealtime(user.id);
    }
  }

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 20); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (this.notifOpen() && !this.el.nativeElement.contains(e.target)) {
      this.notifOpen.set(false);
    }
    if (this.mobileMenuOpen() && !this.el.nativeElement.contains(e.target)) {
      this.mobileMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.searchOpen.set(true);
    }
  }

  toggleMobile() { this.mobileMenuOpen.update(v => !v); this.notifOpen.set(false); }
  toggleNotif(e: Event) {
    e.stopPropagation();
    this.notifOpen.update(v => !v);
    this.mobileMenuOpen.set(false);
  }
  openSearch() { this.searchOpen.set(true); }
  closeSearch() { this.searchOpen.set(false); }

  markAllRead() {
    const user = this.auth.currentUser();
    if (user) this.notifService.markAllAsRead(user.id);
  }

  markRead(id: string) { this.notifService.markAsRead(id); }

  ngOnDestroy() {
    this.notifService.unsubscribeRealtime();
  }

  async logout() {
    await this.auth.signOut();
    this.router.navigate(['/']);
  }
}
