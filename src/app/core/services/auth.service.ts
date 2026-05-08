import { Injectable, computed, inject, signal } from '@angular/core';
import { supabase } from '../supabase.client';
import { ToastService } from './toast.service';

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
  bio: string;
  is_admin: boolean;
  banned: boolean;
  followers: number;
  following: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private toast = inject(ToastService);

  currentUser = signal<Profile | null>(null);
  isLoggedIn = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.is_admin === true);

  // Promesa que se resuelve cuando la sesión inicial fue verificada
  sessionReady: Promise<void>;
  private sessionReadyResolve!: () => void;

  constructor() {
    this.sessionReady = new Promise(resolve => {
      this.sessionReadyResolve = resolve;
    });
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        this.currentUser.set(null);
      } else if (
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') &&
        session?.user
      ) {
        await this.loadProfile(session.user.id);
      }
      // Resolver sessionReady en el primer evento recibido
      this.sessionReadyResolve();
    });
  }

  async loadSession(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await this.loadProfile(session.user.id);
    }
    this.sessionReadyResolve();
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) this.currentUser.set(data as Profile);
  }

  async signUp(email: string, password: string, name: string): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw error;
    // Si la sesión es null pero el usuario existe, Supabase requiere confirmación de email
    if (data.user && !data.session) {
      return { needsConfirmation: true };
    }
    if (data.user && data.session) {
      await new Promise(r => setTimeout(r, 800));
      await this.loadProfile(data.user.id);
      this.toast.show('Cuenta creada', 'success', '🎉');
    }
    return { needsConfirmation: false };
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    });
    if (error) throw error;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    // Reintentar hasta 3 veces si el perfil aún no fue creado por el trigger
    let profile = null;
    for (let i = 0; i < 3; i++) {
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      if (p) { profile = p; break; }
      await new Promise(r => setTimeout(r, 600));
    }
    if (!profile) throw new Error('Perfil no encontrado. Intenta de nuevo.');
    if ((profile as Profile).banned) {
      await supabase.auth.signOut();
      throw new Error('Cuenta suspendida');
    }
    this.currentUser.set(profile as Profile);
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.currentUser.set(null);
  }
}
