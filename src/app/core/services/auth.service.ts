import { Injectable, computed, inject, signal } from '@angular/core';
import { supabase } from '../supabase.client';
import { ToastService } from './toast.service';
import { NotificationService } from './notification.service';
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
  private notifService = inject(NotificationService);

  private _log(...args: unknown[]): void {
    if (!environment.production) console.log(...args);
  }

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
      this._log('[Auth]', event, session?.user?.email ?? 'none');

      if (event === 'SIGNED_OUT') {
        this.currentUser.set(null);
        this._resolveOnce();
        return;
      }

      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          const providerAvatar =
            session.user.user_metadata?.['avatar_url'] ||
            session.user.user_metadata?.['picture'] ||
            null;
          this._fetchProfile(session.user.id, providerAvatar).then(() => this._resolveOnce());
        } else {
          this._resolveOnce();
        }
        return;
      }

      // SIGNED_IN / TOKEN_REFRESHED — load profile and sync avatar from provider
      if (session?.user) {
        const providerAvatar =
          session.user.user_metadata?.['avatar_url'] ||
          session.user.user_metadata?.['picture'] ||
          null;
        this._fetchProfile(session.user.id, providerAvatar);
      }
    });
  }

  private _resolveOnce() {
    if (!this._resolved) {
      this._resolved = true;
      this._resolve();
    }
  }

  private async _fetchProfile(userId: string, providerAvatar?: string | null): Promise<Profile | null> {
    this._log('[Auth] _fetchProfile start', userId);
    const timeout = new Promise<null>(r => setTimeout(() => r(null), 5000));
    const query = supabase
      .from('profiles')
      .select('id, name, avatar_url, role, bio, is_admin, banned, followers, following, created_at')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        this._log('[Auth] _fetchProfile done', data?.name ?? null, error?.code ?? 'ok');
        return data as Profile | null;
      });
    const result = await Promise.race([query, timeout]);
    if (!result) return null;

    // Si el perfil no tiene avatar pero el provider (Google) sí, sincronizarlo
    if (providerAvatar && !result.avatar_url) {
      const { data: updated } = await supabase
        .from('profiles')
        .update({ avatar_url: providerAvatar })
        .eq('id', userId)
        .select('id, name, avatar_url, role, bio, is_admin, banned, followers, following, created_at')
        .single();
      const profile = (updated ?? result) as Profile;
      this.currentUser.set(profile);
      return profile;
    }

    this.currentUser.set(result);
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
    this._log('[signIn] calling signInWithPassword...');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    this._log('[signIn] result:', data?.user?.email ?? null, 'error:', error?.message ?? null);
    if (error) throw error;

    this._log('[signIn] fetching profile for', data.user.id);
    for (let i = 0; i < 5; i++) {
      const profile = await this._fetchProfile(data.user.id);
      this._log('[signIn] attempt', i + 1, 'profile:', profile?.name ?? null);
      if (profile) {
        if (profile.banned) {
          await supabase.auth.signOut();
          throw new Error('Cuenta suspendida');
        }
        this._log('[signIn] success, navigating...');
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
    this.notifService.unsubscribeRealtime();
    await supabase.auth.signOut();
    this.currentUser.set(null);
  }
}
