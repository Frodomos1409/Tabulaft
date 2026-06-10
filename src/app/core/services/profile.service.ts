import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';
import { Profile } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data as Profile;
  }

  private sanitizeFileName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.\./g, '_')
      .slice(0, 80);
  }

  async updateProfile(userId: string, data: Partial<Profile>, avatarFile?: File): Promise<Profile> {
    let avatarUrl = data.avatar_url;

    if (avatarFile) {
      const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      if (!ALLOWED_AVATAR_TYPES.includes(avatarFile.type)) {
        throw new Error('Solo se permiten imágenes JPEG, PNG o WEBP para el avatar.');
      }
      if (avatarFile.size > 5 * 1024 * 1024) {
        throw new Error('El avatar no puede superar los 5MB.');
      }
      const safeName = this.sanitizeFileName(avatarFile.name);
      const path = `${userId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, avatarFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      avatarUrl = urlData.publicUrl;
    }

    const { data: updated, error } = await supabase
      .from('profiles')
      .update({ ...data, avatar_url: avatarUrl })
      .eq('id', userId)
      .select('*')
      .single();
    if (error) throw error;
    return updated as Profile;
  }

  async isFollowing(followerId: string, targetId: string): Promise<boolean> {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', targetId)
      .maybeSingle();
    return !!data;
  }

  async toggleFollow(followerId: string, targetId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('toggle_follow', { p_target_id: targetId });
    if (error) throw error;
    return data as boolean;
  }
}
