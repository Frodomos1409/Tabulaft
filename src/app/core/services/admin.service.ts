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

export interface DailyViewStat {
  date: string;
  views: number;
}

export interface AdminStats {
  users: number;
  projects: number;
  pendingProjects: number;
  activeProjects: number;
  rejectedProjects: number;
  pendingReports: number;
  totalViews: number;
  totalLikes: number;
  dailyViews: DailyViewStat[];
  newUsersThisWeek: number;
  newProjectsThisWeek: number;
}

@Injectable({ providedIn: 'root' })
export class AdminService {

  async getStats(): Promise<AdminStats> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: users },
      { count: projects },
      { count: pendingProjects },
      { count: activeProjects },
      { count: rejectedProjects },
      { count: pendingReports },
      { data: viewsData },
      { data: likesData },
      { data: dailyViewsData },
      { count: newUsers },
      { count: newProjects },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('resolved', false),
      supabase.from('projects').select('views'),
      supabase.from('projects').select('likes'),
      supabase.from('project_views_daily')
        .select('view_date, views_count')
        .gte('view_date', new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('view_date', { ascending: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
      supabase.from('projects').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo),
    ]);

    const totalViews = (viewsData ?? []).reduce((s: number, p: any) => s + (p.views ?? 0), 0);
    const totalLikes = (likesData ?? []).reduce((s: number, p: any) => s + (p.likes ?? 0), 0);

    // Agrupar views por día
    const viewsByDay: Record<string, number> = {};
    for (const row of dailyViewsData ?? []) {
      const d = (row as any).view_date;
      viewsByDay[d] = (viewsByDay[d] ?? 0) + (row as any).views_count;
    }

    // Generar los últimos 7 días con 0 si no hay datos
    const dailyViews: DailyViewStat[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyViews.push({ date: key, views: viewsByDay[key] ?? 0 });
    }

    return {
      users: users ?? 0,
      projects: projects ?? 0,
      pendingProjects: pendingProjects ?? 0,
      activeProjects: activeProjects ?? 0,
      rejectedProjects: rejectedProjects ?? 0,
      pendingReports: pendingReports ?? 0,
      totalViews,
      totalLikes,
      dailyViews,
      newUsersThisWeek: newUsers ?? 0,
      newProjectsThisWeek: newProjects ?? 0,
    };
  }

  async getAllUsers(search?: string): Promise<any[]> {
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    const { data } = await query;
    return data ?? [];
  }

  async banUser(userId: string): Promise<void> {
    await supabase.from('profiles').update({ banned: true }).eq('id', userId);
    await this.logAction('ban_user', 'user', userId);
  }

  async unbanUser(userId: string): Promise<void> {
    await supabase.from('profiles').update({ banned: false }).eq('id', userId);
    await this.logAction('unban_user', 'user', userId);
  }

  async makeAdmin(userId: string): Promise<void> {
    await supabase.from('profiles').update({ is_admin: true }).eq('id', userId);
    await this.logAction('make_admin', 'user', userId);
  }

  async removeAdmin(userId: string): Promise<void> {
    await supabase.from('profiles').update({ is_admin: false }).eq('id', userId);
    await this.logAction('remove_admin', 'user', userId);
  }

  async getAllProjects(filters?: { status?: string; search?: string; category?: string }): Promise<any[]> {
    let query = supabase
      .from('projects')
      .select('*, author:profiles!projects_author_id_fkey(*)')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const { data } = await query;
    return data ?? [];
  }

  async featureProject(id: string): Promise<void> {
    await supabase.from('projects').update({ featured: true }).eq('id', id);
    await this.logAction('feature_project', 'project', id);
  }

  async unfeatureProject(id: string): Promise<void> {
    await supabase.from('projects').update({ featured: false }).eq('id', id);
    await this.logAction('unfeature_project', 'project', id);
  }

  async approveProject(id: string): Promise<void> {
    await supabase.from('projects').update({ status: 'active', admin_note: null }).eq('id', id);
    await this.logAction('approve_project', 'project', id);
  }

  async rejectProject(id: string, note?: string): Promise<void> {
    await supabase.from('projects').update({ status: 'rejected', admin_note: note ?? null }).eq('id', id);
    await this.logAction('reject_project', 'project', id, { note });
  }

  async deleteProject(id: string): Promise<void> {
    await supabase.from('projects').delete().eq('id', id);
    await this.logAction('delete_project', 'project', id);
  }

  async getReports(includeResolved = false): Promise<any[]> {
    let query = supabase
      .from('reports')
      .select('*, project:projects(*), reporter:profiles!reports_reporter_id_fkey(*)')
      .order('created_at', { ascending: false });
    if (!includeResolved) {
      query = query.eq('resolved', false);
    }
    const { data } = await query;
    return data ?? [];
  }

  async resolveReport(id: string, action?: 'dismiss' | 'remove_project'): Promise<void> {
    await supabase.from('reports').update({ resolved: true }).eq('id', id);
    await this.logAction('resolve_report', 'report', id, { action });
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

  async getActivityLog(limit = 50): Promise<any[]> {
    const { data } = await supabase
      .from('admin_activity_log')
      .select('*, admin:profiles!admin_activity_log_admin_id_fkey(name, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data ?? [];
  }

  private async logAction(action: string, entityType: string, entityId: string, metadata?: object): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('admin_activity_log').insert({
      admin_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ?? null,
    });
  }
}
