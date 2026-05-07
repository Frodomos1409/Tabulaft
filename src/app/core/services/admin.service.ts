import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';

export interface PlatformConfig {
  id: number;
  platform_name: string;
  platform_url: string;
  support_email: string;
  allow_register: boolean;
  max_images: number;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  async getStats(): Promise<{ users: number; projects: number; pendingReports: number; totalViews: number }> {
    const [
      { count: users },
      { count: projects },
      { count: pendingReports },
      { data: viewsData },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('resolved', false),
      supabase.from('projects').select('views'),
    ]);

    const totalViews = (viewsData ?? []).reduce((sum: number, p: any) => sum + (p.views ?? 0), 0);
    return {
      users: users ?? 0,
      projects: projects ?? 0,
      pendingReports: pendingReports ?? 0,
      totalViews,
    };
  }

  async getAllUsers(): Promise<any[]> {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async banUser(userId: string): Promise<void> {
    await supabase.from('profiles').update({ banned: true }).eq('id', userId);
  }

  async unbanUser(userId: string): Promise<void> {
    await supabase.from('profiles').update({ banned: false }).eq('id', userId);
  }

  async getAllProjects(): Promise<any[]> {
    const { data } = await supabase
      .from('projects')
      .select('*, author:profiles(*)')
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async featureProject(id: string): Promise<void> {
    await supabase.from('projects').update({ featured: true }).eq('id', id);
  }

  async unfeatureProject(id: string): Promise<void> {
    await supabase.from('projects').update({ featured: false }).eq('id', id);
  }

  async approveProject(id: string): Promise<void> {
    await supabase.from('projects').update({ status: 'active' }).eq('id', id);
  }

  async rejectProject(id: string): Promise<void> {
    await supabase.from('projects').update({ status: 'rejected' }).eq('id', id);
  }

  async deleteProject(id: string): Promise<void> {
    await supabase.from('projects').delete().eq('id', id);
  }

  async getReports(): Promise<any[]> {
    const { data } = await supabase
      .from('reports')
      .select('*, project:projects(*), reporter:profiles(*)')
      .eq('resolved', false)
      .order('created_at', { ascending: false });
    return data ?? [];
  }

  async resolveReport(id: string): Promise<void> {
    await supabase.from('reports').update({ resolved: true }).eq('id', id);
  }

  async getConfig(): Promise<PlatformConfig | null> {
    const { data } = await supabase
      .from('platform_config')
      .select('*')
      .eq('id', 1)
      .single();
    return data as PlatformConfig | null;
  }

  async saveConfig(data: Partial<PlatformConfig>): Promise<void> {
    await supabase
      .from('platform_config')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', 1);
  }
}
