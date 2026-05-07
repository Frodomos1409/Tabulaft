import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  isLogin = signal(true);
  isLoading = signal(false);
  errorMsg = signal('');

  email = '';
  password = '';
  name = '';

  toggle() {
    this.isLogin.update(v => !v);
    this.errorMsg.set('');
  }

  heroImages = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80',
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=300&q=80',
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=300&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&q=80',
  ];

  async onSubmit(): Promise<void> {
    this.isLoading.set(true);
    this.errorMsg.set('');
    try {
      if (this.isLogin()) {
        await this.auth.signIn(this.email, this.password);
        if (this.auth.isAdmin()) {
          this.router.navigate(['/admin']);
        } else {
          this.router.navigate(['/explorar']);
        }
      } else {
        await this.auth.signUp(this.email, this.password, this.name);
        this.router.navigate(['/explorar']);
      }
    } catch (e: any) {
      this.errorMsg.set(e.message ?? 'Ocurrió un error');
    } finally {
      this.isLoading.set(false);
    }
  }
}
