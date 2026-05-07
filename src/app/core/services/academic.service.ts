import { Injectable } from '@angular/core';
import { supabase } from '../supabase.client';

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

  // ─── Semestres ──────────────────────────────────────────────────────────────

  async getSemesters(onlyActive = true): Promise<AcademicSemester[]> {
    let q = supabase.from('academic_semesters').select('*').order('sort_order');
    if (onlyActive) q = q.eq('active', true);
    const { data } = await q;
    return (data ?? []) as AcademicSemester[];
  }

  async createSemester(name: string, label: string, sort_order: number): Promise<void> {
    const { error } = await supabase
      .from('academic_semesters')
      .insert({ name: name.trim(), label: label.trim(), sort_order });
    if (error) throw error;
  }

  async updateSemester(id: number, data: Partial<AcademicSemester>): Promise<void> {
    const { error } = await supabase
      .from('academic_semesters')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteSemester(id: number): Promise<void> {
    const { error } = await supabase
      .from('academic_semesters')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  // ─── Materias ────────────────────────────────────────────────────────────────

  async getSubjects(onlyActive = true): Promise<AcademicSubject[]> {
    let q = supabase.from('academic_subjects').select('*').order('category').order('sort_order');
    if (onlyActive) q = q.eq('active', true);
    const { data } = await q;
    return (data ?? []) as AcademicSubject[];
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
  }

  async updateSubject(id: number, data: Partial<AcademicSubject>): Promise<void> {
    const { error } = await supabase
      .from('academic_subjects')
      .update(data)
      .eq('id', id);
    if (error) throw error;
  }

  async deleteSubject(id: number): Promise<void> {
    const { error } = await supabase
      .from('academic_subjects')
      .delete()
      .eq('id', id);
    if (error) throw error;
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
