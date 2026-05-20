import { Injectable, computed, inject, signal } from '@angular/core';
import { supabase } from '../supabase.client';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';

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
  isLoggedIn  = computed(() => !!this.currentUser());
  isAdmin     = computed(() => this.currentUser()?.is_admin === true);

  // Resolves once we know the initial auth state (has session or not)
  sessionReady: Promise<void>;
  private _resolve!: () => void;
  private _resolved = false;

  constructor() {
    this.sessionReady = new Promise(r => this._resolve = r);

    // onAuthStateChange fires INITIAL_SESSION synchronously on subscribe
    // which covers both "has session" and "no session" cases
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth]', event, session?.user?.email ?? 'none');

      if (event === 'SIGNED_OUT') {
        this.currentUser.set(null);
        this._resolveOnce();
        return;
      }

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          this._fetchProfile(session.user.id).then(() => this._resolveOnce());
        } else {
          this._resolveOnce();
        }
        return;
      }

      // SIGNED_IN / TOKEN_REFRESHED — load profile in background, don't block
      if (session?.user) {
        this._fetchProfile(session.user.id);
      }
    });
  }

  private _resolveOnce() {
    if (!this._resolved) {
      this._resolved = true;
      this._resolve();
    }
  }

  private async _fetchProfile(userId: string): Promise<Profile | null> {
    console.log('[Auth] _fetchProfile start', userId);
    const timeout = new Promise<null>(r => setTimeout(() => r(null), 5000));
    const query = supabase.from('profiles').select('*').eq('id', userId).single()
      .then(({ data, error }) => {
        console.log('[Auth] _fetchProfile done', data?.name ?? null, error?.code ?? 'ok');
        return data as Profile | null;
      });
    const result = await Promise.race([query, timeout]);
    if (result) this.currentUser.set(result);
    return result;
  }

  async loadProfile(userId: string): Promise<void> {
    await this._fetchProfile(userId);
  }

  async signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${environment.appUrl}/auth/callback` }
    });
    if (error) throw error;
  }

  async signIn(email: string, password: string): Promise<void> {
    console.log('[signIn] calling signInWithPassword...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    console.log('[signIn] result:', data?.user?.email ?? null, 'error:', error?.message ?? null);
    if (error) throw error;

    console.log('[signIn] fetching profile for', data.user.id);
    for (let i = 0; i < 5; i++) {
      const profile = await this._fetchProfile(data.user.id);
      console.log('[signIn] attempt', i + 1, 'profile:', profile?.name ?? null);
      if (profile) {
        if (profile.banned) {
          await supabase.auth.signOut();
          throw new Error('Cuenta suspendida');
        }
        console.log('[signIn] success, navigating...');
        return;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Perfil no encontrado. Intenta de nuevo.');
  }

  async signUp(email: string, password: string, name: string): Promise<{ needsConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name } }
    });
    if (error) throw error;
    if (data.user && !data.session) return { needsConfirmation: true };
    if (data.user) {
      await new Promise(r => setTimeout(r, 800));
      await this._fetchProfile(data.user.id);
      this.toast.show('Cuenta creada', 'success', '🎉');
    }
    return { needsConfirmation: false };
  }

  async signOut(): Promise<void> {
    await supabase.auth.signOut();
    this.currentUser.set(null);
  }
}
