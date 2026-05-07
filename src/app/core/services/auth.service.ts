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

  constructor() {
    this.loadSession();
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        this.currentUser.set(null);
      } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        // Sincroniza si el perfil aún no está cargado (p.ej. otra pestaña)
        if (!this.currentUser()) {
          await this.loadProfile(session.user.id);
        }
      }
    });
  }

  async loadSession(): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      await this.loadProfile(session.user.id);
    }
  }

  private async loadProfile(userId: string): Promise<void> {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) this.currentUser.set(data as Profile);
  }

  async signUp(email: string, password: string, name: string): Promise<void> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } }
    });
    if (error) throw error;
    if (data.user) {
      // Esperar a que el trigger cree el perfil
      await new Promise(r => setTimeout(r, 800));
      await this.loadProfile(data.user.id);
    }
    this.toast.show('Cuenta creada', 'success', '🎉');
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/explorar` }
    });
    if (error) throw error;
  }


  async signIn(email: string, password: string): Promise<void> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    if (!profile) throw new Error('Perfil no encontrado');
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
