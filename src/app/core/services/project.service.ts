import { Injectable, inject } from '@angular/core';
import { supabase } from '../supabase.client';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

export interface ProjectRow {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  cover_image: string | null;
  images: string[];
  category: string;
  tags: string[];
  likes: number;
  views: number;
  featured: boolean;
  status: string;
  semester: string | null;
  subject: string | null;
  created_at: string;
  author?: any;
  comments?: any[];
  liked?: boolean;
  saved?: boolean;
}

export interface ProjectInsert {
  title: string;
  description: string;
  category: string;
  tags: string[];
  semester?: string;
  subject?: string;
}

export const SEMESTERS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'] as const;

export const SUBJECTS: Record<string, string[]> = {
  'Diseño Gráfico': ['Diseño Tipográfico', 'Diseño Editorial', 'Diseño de Identidad', 'Ilustración Aplicada', 'Diseño Publicitario'],
  'Ilustración':    ['Ilustración Digital', 'Ilustración Editorial', 'Narrativa Visual', 'Concept Art'],
  'Fotografía':     ['Fotografía Documental', 'Fotografía Publicitaria', 'Fotografía de Moda', 'Retrato'],
  'Editorial':      ['Diseño Editorial', 'Maquetación', 'Publicaciones Digitales'],
  'Branding':       ['Identidad Corporativa', 'Branding Personal', 'Packaging'],
  'UI/UX':          ['Diseño de Interfaces', 'Experiencia de Usuario', 'Prototipado', 'Diseño de Servicios'],
  'Tipografía':     ['Diseño Tipográfico', 'Lettering', 'Caligrafía'],
  'Motion':         ['Motion Graphics', 'Animación 2D', 'Video y Edición'],
};

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  async getProjects(filters?: {
    category?: string;
    sort?: string;
    search?: string;
    semester?: string;
    subject?: string;
    page?: number;
    limit?: number;
  }): Promise<ProjectRow[]> {
    const limit = filters?.limit ?? 12;
    const page  = filters?.page  ?? 0;

    let query = supabase
      .from('projects')
      .select('*, author:profiles!projects_author_id_fkey(*)')
      .eq('status', 'active');

    if (filters?.category && filters.category !== 'Todos') {
      query = query.eq('category', filters.category);
    }
    if (filters?.semester) {
      query = query.eq('semester', filters.semester);
    }
    if (filters?.subject) {
      query = query.eq('subject', filters.subject);
    }
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }
    if (filters?.sort === 'recent') {
      query = query.order('created_at', { ascending: false });
    } else if (filters?.sort === 'popular') {
      query = query.order('likes', { ascending: false });
    } else {
      query = query.order('views', { ascending: false });
    }

    query = query.range(page * limit, (page + 1) * limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as ProjectRow[];
  }

  async getProjectById(id: string): Promise<ProjectRow | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*, author:profiles!projects_author_id_fkey(*), comments(*, user:profiles!comments_user_id_fkey(*))')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as ProjectRow;
  }

  async getProjectsByUser(userId: string): Promise<ProjectRow[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*, author:profiles!projects_author_id_fkey(*)')
      .eq('author_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []) as ProjectRow[];
  }

  async createProject(data: ProjectInsert, imageFiles: File[]): Promise<ProjectRow> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) throw new Error('No autenticado');

    const imageUrls: string[] = [];
    for (const file of imageFiles) {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('projects')
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('projects').getPublicUrl(path);
      imageUrls.push(urlData.publicUrl);
    }

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        title: data.title,
        description: data.description,
        category: data.category,
        tags: data.tags,
        semester: data.semester ?? null,
        subject: data.subject ?? null,
        author_id: userId,
        images: imageUrls,
        cover_image: imageUrls[0] ?? null,
        status: 'pending',
      })
      .select('*, author:profiles!projects_author_id_fkey(*)')
      .single();

    if (error) throw error;
    return project as ProjectRow;
  }

  async toggleLike(projectId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (existing) {
      await supabase.from('likes').delete().eq('user_id', userId).eq('project_id', projectId);
      const { data: proj } = await supabase.from('projects').select('likes').eq('id', projectId).single();
      if (proj) await supabase.from('projects').update({ likes: Math.max(0, proj.likes - 1) }).eq('id', projectId);
      return false;
    } else {
      await supabase.from('likes').insert({ user_id: userId, project_id: projectId });
      const { data: proj } = await supabase.from('projects').select('likes').eq('id', projectId).single();
      if (proj) await supabase.from('projects').update({ likes: proj.likes + 1 }).eq('id', projectId);
      return true;
    }
  }

  async toggleSave(projectId: string, userId: string): Promise<boolean> {
    const { data: existing } = await supabase
      .from('saves')
      .select('user_id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .maybeSingle();

    if (existing) {
      await supabase.from('saves').delete().eq('user_id', userId).eq('project_id', projectId);
      return false;
    } else {
      await supabase.from('saves').insert({ user_id: userId, project_id: projectId });
      return true;
    }
  }

  async isLiked(projectId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('likes')
      .select('user_id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .maybeSingle();
    return !!data;
  }

  async isSaved(projectId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
      .from('saves')
      .select('user_id')
      .eq('user_id', userId)
      .eq('project_id', projectId)
      .maybeSingle();
    return !!data;
  }

  async incrementView(projectId: string): Promise<void> {
    await supabase.rpc('increment_project_view', { p_project_id: projectId });
  }

  async reportProject(projectId: string, reason: string): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) throw new Error('No autenticado');
    const { error } = await supabase.from('reports').insert({
      project_id: projectId,
      reporter_id: userId,
      reason,
    });
    if (error) throw error;
  }

  async getLikedProjects(userId: string): Promise<ProjectRow[]> {
    const { data: likeRows } = await supabase
      .from('likes')
      .select('project_id')
      .eq('user_id', userId);
    if (!likeRows?.length) return [];
    const ids = likeRows.map((r: any) => r.project_id);
    const { data } = await supabase
      .from('projects')
      .select('*, author:profiles!projects_author_id_fkey(*)')
      .in('id', ids)
      .eq('status', 'active');
    return (data ?? []) as ProjectRow[];
  }

  async getSavedProjects(userId: string): Promise<ProjectRow[]> {
    const { data: saveRows } = await supabase
      .from('saves')
      .select('project_id')
      .eq('user_id', userId);
    if (!saveRows?.length) return [];
    const ids = saveRows.map((r: any) => r.project_id);
    const { data } = await supabase
      .from('projects')
      .select('*, author:profiles!projects_author_id_fkey(*)')
      .in('id', ids)
      .eq('status', 'active');
    return (data ?? []) as ProjectRow[];
  }

  async addComment(projectId: string, text: string): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) throw new Error('No autenticado');
    const { error } = await supabase.from('comments').insert({ project_id: projectId, user_id: userId, text });
    if (error) throw error;
  }

  async getComments(projectId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('comments')
      .select('*, user:profiles(*)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
}
