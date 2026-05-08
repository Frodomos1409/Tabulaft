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
  confirmationSent = signal(false);

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

  private translateError(msg: string): string {
    if (!msg) return 'Ocurrió un error. Intenta de nuevo.';
    if (msg.includes('email rate limit') || msg.includes('rate limit'))
      return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
      return 'Correo o contraseña incorrectos.';
    if (msg.includes('Email not confirmed'))
      return 'Debes confirmar tu correo antes de entrar. Revisa tu bandeja de entrada.';
    if (msg.includes('User already registered'))
      return 'Ya existe una cuenta con ese correo. Inicia sesión.';
    if (msg.includes('Password should be at least'))
      return 'La contraseña debe tener al menos 6 caracteres.';
    if (msg.includes('email_address_invalid') || msg.includes('is invalid'))
      return 'El correo electrónico no es válido.';
    if (msg.includes('Perfil no encontrado'))
      return 'Perfil no encontrado. Intenta de nuevo.';
    if (msg.includes('Cuenta suspendida'))
      return 'Tu cuenta ha sido suspendida.';
    return msg;
  }

  async onGoogleSignIn(): Promise<void> {
    this.isLoading.set(true);
    this.errorMsg.set('');
    try {
      await this.auth.signInWithGoogle();
    } catch (e: any) {
      this.errorMsg.set(this.translateError(e.message));
      this.isLoading.set(false);
    }
  }

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
        const { needsConfirmation } = await this.auth.signUp(this.email, this.password, this.name);
        if (needsConfirmation) {
          this.confirmationSent.set(true);
        } else {
          this.router.navigate(['/explorar']);
        }
      }
    } catch (e: any) {
      this.errorMsg.set(this.translateError(e.message));
    } finally {
      this.isLoading.set(false);
    }
  }
}
