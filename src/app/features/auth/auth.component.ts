import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProjectService, ProjectRow } from '../../core/services/project.service';
import { ToastService } from '../../core/services/toast.service';

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
  private route  = inject(ActivatedRoute);
  private projectService = inject(ProjectService);
  private toast  = inject(ToastService);

  // ─── View state ───────────────────────────────────────────────────────────
  isLogin          = signal(true);
  isLoading        = signal(false);
  errorMsg         = signal('');
  confirmationSent = signal(false);
  isForgotPassword = signal(false);
  isUpdatePassword = signal(false);
  resetSent        = signal(false);
  magicLinkSent    = signal(false);
  showTerms        = signal(false);

  // ─── Form fields ──────────────────────────────────────────────────────────
  email              = '';
  password           = '';
  confirmPassword    = '';
  name               = '';
  username           = '';
  resetEmail         = '';
  newPassword        = '';
  confirmNewPassword = '';

  // ─── UI state ─────────────────────────────────────────────────────────────
  showPassword           = signal(false);
  showConfirmPassword    = signal(false);
  showNewPassword        = signal(false);
  showConfirmNewPassword = signal(false);
  emailTouched           = false;
  loginMode              = signal<'password' | 'magic'>('password');
  keepSession            = true;
  termsAccepted          = false;
  resendCooldown         = signal(0);
  usernameStatus         = signal<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle');
  avatarFile: File | null = null;
  avatarPreview          = signal<string | null>(null);
  animDir                = signal<'right' | 'left'>('right');

  private usernameTimer: any;
  private cooldownTimer: any;

  // ─── Password strength (register) ────────────────────────────────────────
  get passwordStrength(): number {
    const p = this.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  get passwordStrengthLabel(): string {
    if (!this.password) return '';
    const s = this.passwordStrength;
    if (s <= 1) return 'Débil';
    if (s === 2) return 'Regular';
    if (s === 3) return 'Buena';
    return 'Fuerte';
  }

  get passwordStrengthClass(): string {
    const s = this.passwordStrength;
    if (s <= 1) return 'weak';
    if (s === 2) return 'fair';
    if (s === 3) return 'good';
    return 'strong';
  }

  get hasUppercase(): boolean { return /[A-Z]/.test(this.password); }
  get hasNumber(): boolean    { return /[0-9]/.test(this.password); }
  get hasSymbol(): boolean    { return /[^A-Za-z0-9]/.test(this.password); }
  get emailValid(): boolean   { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email); }

  // ─── New password strength (update password) ─────────────────────────────
  get newPasswordStrength(): number {
    const p = this.newPassword;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }

  get newPasswordStrengthLabel(): string {
    if (!this.newPassword) return '';
    const s = this.newPasswordStrength;
    if (s <= 1) return 'Débil';
    if (s === 2) return 'Regular';
    if (s === 3) return 'Buena';
    return 'Fuerte';
  }

  get newPasswordStrengthClass(): string {
    const s = this.newPasswordStrength;
    if (s <= 1) return 'weak';
    if (s === 2) return 'fair';
    if (s === 3) return 'good';
    return 'strong';
  }

  get usernameInputValid(): boolean {
    return /^[a-z0-9_.-]{3,20}$/.test(this.username.toLowerCase());
  }

  // ─── Animation direction ──────────────────────────────────────────────────
  toggle() {
    const toLogin = !this.isLogin();
    this.animDir.set(toLogin ? 'left' : 'right');
    this.isLogin.update(v => !v);
    this.clearForm();
  }

  switchToLogin() {
    this.animDir.set('left');
    this.isLogin.set(true);
    this.isForgotPassword.set(false);
    this.loginMode.set('password');
    this.magicLinkSent.set(false);
    this.clearForm();
  }

  switchToRegister() {
    this.animDir.set('right');
    this.isLogin.set(false);
    this.clearForm();
  }

  showForgotPassword() {
    this.isForgotPassword.set(true);
    this.errorMsg.set('');
    this.resetEmail = this.email;
  }

  private clearForm() {
    this.errorMsg.set('');
    this.password = '';
    this.confirmPassword = '';
    this.username = '';
    this.usernameStatus.set('idle');
    this.avatarFile = null;
    this.avatarPreview.set(null);
    this.termsAccepted = false;
    this.emailTouched = false;
    this.showPassword.set(false);
    this.showConfirmPassword.set(false);
    clearTimeout(this.usernameTimer);
  }

  // ─── Username availability ────────────────────────────────────────────────
  onUsernameInput() {
    const raw = this.username.toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (raw !== this.username) this.username = raw;
    clearTimeout(this.usernameTimer);
    if (!raw || raw.length < 3) { this.usernameStatus.set('idle'); return; }
    if (raw.length > 20) { this.usernameStatus.set('invalid'); return; }
    this.usernameStatus.set('checking');
    this.usernameTimer = setTimeout(async () => {
      const ok = await this.auth.checkUsernameAvailable(raw);
      this.usernameStatus.set(ok ? 'available' : 'taken');
    }, 500);
  }

  // ─── Avatar upload ────────────────────────────────────────────────────────
  onAvatarChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.errorMsg.set('Solo se aceptan JPG, PNG y WEBP.'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMsg.set('La imagen no puede superar 5MB.'); return;
    }
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = e => this.avatarPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.errorMsg.set('');
  }

  removeAvatar() {
    this.avatarFile = null;
    this.avatarPreview.set(null);
  }

  // ─── Magic link ───────────────────────────────────────────────────────────
  async onMagicLink(): Promise<void> {
    if (this.isLoading()) return;
    this.emailTouched = true;
    if (!this.emailValid) { this.errorMsg.set('Ingresa un correo válido.'); return; }
    this.isLoading.set(true);
    this.errorMsg.set('');
    try {
      await this.auth.signInWithMagicLink(this.email);
      this.magicLinkSent.set(true);
      this.startResendCooldown();
    } catch (e: any) {
      this.errorMsg.set(this.translateError(e?.message ?? 'Error'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async onResendMagicLink(): Promise<void> {
    if (this.resendCooldown() > 0 || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      await this.auth.signInWithMagicLink(this.email);
      this.startResendCooldown();
      this.toast.show('Enlace reenviado', 'success', '✉️');
    } catch (e: any) {
      this.errorMsg.set(this.translateError(e?.message ?? 'Error'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async onResendConfirmation(): Promise<void> {
    if (this.resendCooldown() > 0 || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      await this.auth.resendConfirmation(this.email);
      this.startResendCooldown();
      this.toast.show('Correo reenviado', 'success', '📧');
    } catch (e: any) {
      this.errorMsg.set(this.translateError(e?.message ?? 'Error'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async onResendResetEmail(): Promise<void> {
    if (this.resendCooldown() > 0 || this.isLoading()) return;
    this.isLoading.set(true);
    try {
      await this.auth.resetPassword(this.resetEmail);
      this.startResendCooldown();
      this.toast.show('Correo reenviado', 'success', '📧');
    } catch (e: any) {
      this.errorMsg.set(this.translateError(e?.message ?? 'Error'));
    } finally {
      this.isLoading.set(false);
    }
  }

  startResendCooldown() {
    clearInterval(this.cooldownTimer);
    this.resendCooldown.set(60);
    this.cooldownTimer = setInterval(() => {
      const v = this.resendCooldown() - 1;
      if (v <= 0) { clearInterval(this.cooldownTimer); this.resendCooldown.set(0); }
      else this.resendCooldown.set(v);
    }, 1000);
  }

  // ─── Visual panel carousel ────────────────────────────────────────────────
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
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (mode === 'update-password') {
      this.isUpdatePassword.set(true);
    }

    this.allImages = this.buildPool();
    this.displayImages.set(this.getSlice());
    this.rotateInterval = setInterval(() => this.rotate(), 3500);

    try {
      this.projects = await this.projectService.getFeaturedProjects(8);
      this.allImages = this.buildPool();
      this.slotOffset = 0;
    } catch { /* silently keep fallback */ }
  }

  ngOnDestroy() {
    clearInterval(this.rotateInterval);
    clearInterval(this.cooldownTimer);
    clearTimeout(this.usernameTimer);
  }

  // ─── Error translation ────────────────────────────────────────────────────
  private translateError(msg: string): string {
    if (!msg) return 'Ocurrió un error. Intenta de nuevo.';
    if (msg.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.';
    if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) return 'Correo o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Confirma tu correo antes de entrar.';
    if (msg.includes('User already registered')) return 'Si los datos son correctos, revisa tu correo electrónico.';
    if (msg.includes('Password should be at least') || msg.includes('password')) return 'La contraseña debe tener al menos 8 caracteres.';
    if (msg.includes('Perfil no encontrado')) return 'Perfil no encontrado. Intenta de nuevo.';
    if (msg.includes('Cuenta suspendida')) return 'Tu cuenta ha sido suspendida.';
    if (msg.includes('For security purposes')) return 'Por seguridad, espera unos segundos antes de reenviar.';
    if (msg.includes('Unable to validate email')) return 'El correo no es válido.';
    return msg;
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
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
    this.errorMsg.set('');

    if (!this.isLogin()) {
      if (!this.name.trim()) {
        this.errorMsg.set('Ingresa tu nombre completo.');
        return;
      }
      if (this.username && !this.usernameInputValid) {
        this.errorMsg.set('El usuario solo puede tener letras, números, puntos, guiones y _ (3-20 caracteres).');
        return;
      }
      if (this.username && this.usernameStatus() === 'taken') {
        this.errorMsg.set('El nombre de usuario ya está en uso.');
        return;
      }
      if (this.username && this.usernameStatus() === 'checking') {
        this.errorMsg.set('Espera mientras verificamos la disponibilidad del usuario.');
        return;
      }
      if (this.password.length < 8) {
        this.errorMsg.set('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (this.passwordStrength < 2) {
        this.errorMsg.set('La contraseña es muy débil. Agrega mayúsculas, números o símbolos.');
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.errorMsg.set('Las contraseñas no coinciden.');
        return;
      }
      if (!this.termsAccepted) {
        this.errorMsg.set('Debes aceptar los términos y condiciones.');
        return;
      }
    }

    this.isLoading.set(true);
    try {
      if (this.isLogin()) {
        await this.auth.signIn(this.email, this.password);
        if (!this.keepSession) this.auth.registerSessionOnlyUnload();
        const dest = this.auth.isAdmin() ? '/admin' : '/inicio';
        this.toast.show('¡Bienvenido de vuelta!', 'success', '👋');
        this.router.navigate([dest]);
      } else {
        const { needsConfirmation } = await this.auth.signUp(
          this.email, this.password, this.name,
          this.username || undefined,
          this.avatarFile || undefined
        );
        if (needsConfirmation) {
          this.confirmationSent.set(true);
          this.startResendCooldown();
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

  async onForgotPassword(): Promise<void> {
    if (this.isLoading()) return;
    if (!this.resetEmail.trim()) {
      this.errorMsg.set('Ingresa tu correo electrónico.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.resetEmail)) {
      this.errorMsg.set('Ingresa un correo válido.');
      return;
    }
    this.isLoading.set(true);
    this.errorMsg.set('');
    try {
      await this.auth.resetPassword(this.resetEmail);
      this.resetSent.set(true);
      this.startResendCooldown();
    } catch (e: any) {
      this.errorMsg.set(this.translateError(e?.message ?? 'Error al enviar el correo'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async onUpdatePassword(): Promise<void> {
    if (this.isLoading()) return;
    this.errorMsg.set('');

    if (this.newPassword.length < 8) {
      this.errorMsg.set('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (this.newPasswordStrength < 2) {
      this.errorMsg.set('La contraseña es muy débil. Agrega mayúsculas, números o símbolos.');
      return;
    }
    if (this.newPassword !== this.confirmNewPassword) {
      this.errorMsg.set('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);
    try {
      await this.auth.updatePassword(this.newPassword);
      this.toast.show('Contraseña actualizada correctamente', 'success', '🔐');
      this.router.navigate(['/inicio']);
    } catch (e: any) {
      this.errorMsg.set(this.translateError(e?.message ?? 'Error al actualizar la contraseña'));
      this.isLoading.set(false);
    }
  }
}
