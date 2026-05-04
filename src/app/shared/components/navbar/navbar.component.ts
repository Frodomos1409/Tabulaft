import { Component, inject, signal, HostListener, ElementRef } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../../core/services/theme.service';
import { SearchModalComponent } from '../search-modal/search-modal.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, SearchModalComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  theme = inject(ThemeService);
  private el = inject(ElementRef);

  scrolled      = signal(false);
  mobileMenuOpen = signal(false);
  notifOpen     = signal(false);
  searchOpen    = signal(false);

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 20); }

  // Close notif panel when clicking outside the navbar
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
    e.stopPropagation(); // prevent document:click from immediately closing
    this.notifOpen.update(v => !v);
    this.mobileMenuOpen.set(false);
  }
  openSearch()  { this.searchOpen.set(true); }
  closeSearch() { this.searchOpen.set(false); }

  notifications = signal([
    { text: 'Valentina Ríos le dio like a tu proyecto', time: '2m',  read: false },
    { text: 'Sebastián Mora comenzó a seguirte',        time: '15m', read: false },
    { text: 'Tu proyecto fue destacado esta semana',    time: '1h',  read: true  },
    { text: 'Camila Vargas comentó en tu proyecto',     time: '3h',  read: true  },
  ]);

  get unreadCount() { return this.notifications().filter(n => !n.read).length; }

  markAllRead() {
    this.notifications.update(ns => ns.map(n => ({ ...n, read: true })));
  }
}
