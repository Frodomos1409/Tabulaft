import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService, ProjectRow } from '../../core/services/project.service';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit, OnDestroy {
  auth    = inject(AuthService);
  private router = inject(Router);
  private projectService = inject(ProjectService);

  isLogin = signal(true);
  isLoading = signal(false);
  errorMsg = signal('');
  confirmationSent = signal(false);

  email = '';
  password = '';
  name = '';

  toggle() { this.isLogin.update(v => !v); this.errorMsg.set(''); }

  projects: ProjectRow[] = [];
  displayImages = signal<string[]>([]);
  isFading = signal(false);
  private allImages: string[] = [];
  private slotOffset = 0;
  private rotateInterval: any;

  readonly FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&q=80',
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&q=80',
    'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=400&q=80',
    'https://images.unsplash.com/photo-1545987796-200677ee1011?w=400&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  ];

  private buildPool(): string[] {
    const imgs = this.projects.filter(p => p.cover_image).map(p => p.cover_image as string);
    const pool = imgs.length >= 8 ? imgs : [...imgs, ...this.FALLBACK_IMAGES];
    return pool.slice(0, Math.max(8, pool.length));
  }

  private getSlice(): string[] {
    const pool = this.allImages;
    if (!pool.length) return [];
    return Array.from({ length: 4 }, (_, i) => pool[(this.slotOffset + i) % pool.length]);
  }

  private async rotate() {
    this.isFading.set(true);
    await new Promise(r => setTimeout(r, 400));
    this.slotOffset = (this.slotOffset + 4) % this.allImages.length;
    this.displayImages.set(this.getSlice());
    this.isFading.set(false);
  }

  async ngOnInit() {
    // Show fallback images immediately — no network wait
    this.allImages = this.buildPool();
    this.displayImages.set(this.getSlice());
    this.rotateInterval = setInterval(() => this.rotate(), 3500);

    // Swap in real project images once loaded
    try {
      this.projects = await this.projectService.getFeaturedProjects(8);
      this.allImages = this.buildPool();
      this.slotOffset = 0;
    } catch { /* silently keep fallback */ }
  }

  ngOnDestroy() {
    clearInterval(this.rotateInterval);
  }

  private translateError(msg: string): string {
    if (!msg) return 'Ocurrió un error. Intenta de nuevo.';
    if (msg.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.';
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) return 'Correo o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Confirma tu correo antes de entrar.';
    if (msg.includes('User already registered')) return 'Si los datos son correctos, revisa tu correo electrónico.';
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (msg.includes('Perfil no encontrado')) return 'Perfil no encontrado. Intenta de nuevo.';
    if (msg.includes('Cuenta suspendida')) return 'Tu cuenta ha sido suspendida.';
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
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.errorMsg.set('');
    try {
      if (this.isLogin()) {
        await this.auth.signIn(this.email, this.password);
        const dest = this.auth.isAdmin() ? '/admin' : '/inicio';
        this.router.navigate([dest]);
      } else {
        const { needsConfirmation } = await this.auth.signUp(this.email, this.password, this.name);
        if (needsConfirmation) {
          this.confirmationSent.set(true);
          this.isLoading.set(false);
        } else {
          this.router.navigate(['/inicio']);
        }
      }
    } catch (e: any) {
      this.errorMsg.set(this.translateError(e?.message ?? 'Error desconocido'));
      this.isLoading.set(false);
    }
  }
}
