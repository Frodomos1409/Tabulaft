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
    const [{ data: stats }, { data: dailyViewsData }] = await Promise.all([
      supabase.rpc('get_admin_stats'),
      supabase.from('project_views_daily')
        .select('view_date, views_count')
        .gte('view_date', new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('view_date', { ascending: true }),
    ]);

    const viewsByDay: Record<string, number> = {};
    for (const row of dailyViewsData ?? []) {
      const d = (row as any).view_date;
      viewsByDay[d] = (viewsByDay[d] ?? 0) + (row as any).views_count;
    }

    const dailyViews: DailyViewStat[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dailyViews.push({ date: key, views: viewsByDay[key] ?? 0 });
    }

    const s = stats as any;
    return {
      users:               s.total_users       ?? 0,
      projects:            s.total_projects    ?? 0,
      pendingProjects:     s.pending_projects  ?? 0,
      activeProjects:      s.active_projects   ?? 0,
      rejectedProjects:    s.rejected_projects ?? 0,
      pendingReports:      s.pending_reports   ?? 0,
      totalViews:          s.total_views       ?? 0,
      totalLikes:          s.total_likes       ?? 0,
      newUsersThisWeek:    s.new_users_week    ?? 0,
      newProjectsThisWeek: s.new_projects_week ?? 0,
      dailyViews,
    };
  }

  async getAllUsers(search?: string, page = 0, limit = 100): Promise<{ data: any[]; count: number }> {
    let query = supabase
      .from('profiles')
      .select('id, name, email, avatar_url, role, bio, is_admin, banned, followers, following, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);
    if (search) {
      query = query.or(`name.ilike.%${search}%`);
    }
    const { data, count, error } = await query;
    if (error) throw error;
    return { data: data ?? [], count: count ?? 0 };
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

  async updateProjectAuthor(projectId: string, authorId: string | null): Promise<void> {
    const { error } = await supabase.from('projects').update({ author_id: authorId }).eq('id', projectId);
    if (error) throw error;
    await this.logAction('change_project_author', 'project', projectId, { authorId });
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
