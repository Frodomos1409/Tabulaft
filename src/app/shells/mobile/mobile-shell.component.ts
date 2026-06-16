import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastComponent } from '../../shared/components/toast/toast.component';
import { SearchModalComponent } from '../../shared/components/search-modal/search-modal.component';

@Component({
  selector: 'app-mobile-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ToastComponent, SearchModalComponent],
  templateUrl: './mobile-shell.component.html',
  styleUrl: './mobile-shell.component.css',
})
export class MobileShellComponent {
  readonly theme = inject(ThemeService);
  readonly auth  = inject(AuthService);
  private router = inject(Router);

  searchOpen = signal(false);
  drawerOpen = signal(false);
  searchModalOpen = signal(false);

  toggleSearch() {
    this.searchOpen.update(v => !v);
  }

  toggleDrawer() {
    this.drawerOpen.update(v => !v);
  }

  closeDrawer() {
    this.drawerOpen.set(false);
  }

  openSearchModal() {
    this.searchModalOpen.set(true);
  }

  closeSearchModal() {
    this.searchModalOpen.set(false);
  }

  async signOut() {
    this.closeDrawer();
    await this.auth.signOut();
    this.router.navigate(['/']);
  }
}
