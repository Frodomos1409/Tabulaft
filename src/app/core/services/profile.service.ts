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

  async updateProfile(userId: string, data: Partial<Profile>, avatarFile?: File): Promise<Profile> {
    let avatarUrl = data.avatar_url;

    if (avatarFile) {
      const path = `${userId}/${Date.now()}-${avatarFile.name}`;
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
    const following = await this.isFollowing(followerId, targetId);

    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_id', followerId).eq('following_id', targetId);
      // Decrement counts
      const [{ data: f }, { data: t }] = await Promise.all([
        supabase.from('profiles').select('following').eq('id', followerId).single(),
        supabase.from('profiles').select('followers').eq('id', targetId).single(),
      ]);
      await Promise.all([
        supabase.from('profiles').update({ following: Math.max(0, (f?.following ?? 1) - 1) }).eq('id', followerId),
        supabase.from('profiles').update({ followers: Math.max(0, (t?.followers ?? 1) - 1) }).eq('id', targetId),
      ]);
      return false;
    } else {
      await supabase.from('follows').insert({ follower_id: followerId, following_id: targetId });
      const [{ data: f }, { data: t }] = await Promise.all([
        supabase.from('profiles').select('following').eq('id', followerId).single(),
        supabase.from('profiles').select('followers').eq('id', targetId).single(),
      ]);
      await Promise.all([
        supabase.from('profiles').update({ following: (f?.following ?? 0) + 1 }).eq('id', followerId),
        supabase.from('profiles').update({ followers: (t?.followers ?? 0) + 1 }).eq('id', targetId),
      ]);
      return true;
    }
  }
}
