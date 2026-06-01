import { Injectable, inject } from '@angular/core';
import { supabase } from '../supabase.client';
import { CacheService } from './cache.service';

export interface AcademicSemester {
  id: number;
  name: string;
  label: string;
  sort_order: number;
  active: boolean;
}

export interface AcademicSubject {
  id: number;
  category: string;
  name: string;
  sort_order: number;
  active: boolean;
}

@Injectable({ providedIn: 'root' })
export class AcademicService {
  private cache = inject(CacheService);

  // ─── Semestres ──────────────────────────────────────────────────────────────

  async getSemesters(onlyActive = true): Promise<AcademicSemester[]> {
    const cacheKey = 'semesters:' + onlyActive;
    const cached = this.cache.get<AcademicSemester[]>(cacheKey);
    if (cached) return cached;
    let q = supabase.from('academic_semesters').select('*').order('sort_order');
    if (onlyActive) q = q.eq('active', true);
    const { data } = await q;
    const result = (data ?? []) as AcademicSemester[];
    this.cache.set(cacheKey, result, 300_000);
    return result;
  }

  async createSemester(name: string, label: string, sort_order: number): Promise<void> {
    const { error } = await supabase
      .from('academic_semesters')
      .insert({ name: name.trim(), label: label.trim(), sort_order });
    if (error) throw error;
    this.cache.invalidate('semesters');
  }

  async updateSemester(id: number, data: Partial<AcademicSemester>): Promise<void> {
    const { error } = await supabase
      .from('academic_semesters')
      .update(data)
      .eq('id', id);
    if (error) throw error;
    this.cache.invalidate('semesters');
  }

  async deleteSemester(id: number): Promise<void> {
    const { error } = await supabase
      .from('academic_semesters')
      .delete()
      .eq('id', id);
    if (error) throw error;
    this.cache.invalidate('semesters');
  }

  // ─── Materias ────────────────────────────────────────────────────────────────

  async getSubjects(onlyActive = true): Promise<AcademicSubject[]> {
    const cacheKey = 'subjects:' + onlyActive;
    const cached = this.cache.get<AcademicSubject[]>(cacheKey);
    if (cached) return cached;
    let q = supabase.from('academic_subjects').select('*').order('category').order('sort_order');
    if (onlyActive) q = q.eq('active', true);
    const { data } = await q;
    const result = (data ?? []) as AcademicSubject[];
    this.cache.set(cacheKey, result, 300_000);
    return result;
  }

  async getSubjectsByCategory(category: string): Promise<AcademicSubject[]> {
    const { data } = await supabase
      .from('academic_subjects')
      .select('*')
      .eq('category', category)
      .eq('active', true)
      .order('sort_order');
    return (data ?? []) as AcademicSubject[];
  }

  async createSubject(category: string, name: string, sort_order: number): Promise<void> {
    const { error } = await supabase
      .from('academic_subjects')
      .insert({ category: category.trim(), name: name.trim(), sort_order });
    if (error) throw error;
    this.cache.invalidate('subjects');
  }

  async updateSubject(id: number, data: Partial<AcademicSubject>): Promise<void> {
    const { error } = await supabase
      .from('academic_subjects')
      .update(data)
      .eq('id', id);
    if (error) throw error;
    this.cache.invalidate('subjects');
  }

  async deleteSubject(id: number): Promise<void> {
    const { error } = await supabase
      .from('academic_subjects')
      .delete()
      .eq('id', id);
    if (error) throw error;
    this.cache.invalidate('subjects');
  }

  // Agrupa materias por categoría (útil para el admin)
  groupByCategory(subjects: AcademicSubject[]): Record<string, AcademicSubject[]> {
    return subjects.reduce((acc, s) => {
      if (!acc[s.category]) acc[s.category] = [];
      acc[s.category].push(s);
      return acc;
    }, {} as Record<string, AcademicSubject[]>);
  }
}
