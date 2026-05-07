import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';
import { ProjectRow } from '../../core/services/project.service';
import { supabase } from '../../core/supabase.client';
import { DeviceService } from '../../core/services/device.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, CommonModule, ProjectCardComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit {
  readonly device = inject(DeviceService);

  featuredProjects = signal<ProjectRow[]>([]);
  featuredCreators = signal<any[]>([]);
  stats = signal([
    { value: '–', label: 'Proyectos' },
    { value: '–', label: 'Diseñadores' },
    { value: '15K', label: 'Visitas mensuales' },
    { value: '8',   label: 'Categorías' },
  ]);

  categories = signal([
    { name: 'Diseño Gráfico', icon: '✦', count: 0 },
    { name: 'Ilustración',    icon: '◈', count: 0 },
    { name: 'Fotografía',     icon: '⬡', count: 0 },
    { name: 'Editorial',      icon: '▣', count: 0 },
    { name: 'Branding',       icon: '◉', count: 0 },
    { name: 'UI/UX',          icon: '⬢', count: 0 },
    { name: 'Tipografía',     icon: '◈', count: 0 },
    { name: 'Motion',         icon: '▷', count: 0 },
  ]);

  heroImages = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&q=80',
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  ];

  async ngOnInit() {
    await Promise.all([
      this.loadFeaturedProjects(),
      this.loadFeaturedCreators(),
      this.loadStats(),
      this.loadCategoryCounts(),
    ]);
  }

  private async loadFeaturedProjects() {
    const { data } = await supabase
      .from('projects')
      .select('*, author:profiles(*)')
      .eq('status', 'active')
      .eq('featured', true)
      .order('views', { ascending: false })
      .limit(6);
    this.featuredProjects.set((data ?? []) as ProjectRow[]);
  }

  private async loadFeaturedCreators() {
    const { data } = await supabase
      .from('profiles')
      .select('*, projects(count)')
      .order('followers', { ascending: false })
      .limit(3);
    const creators = (data ?? []).map((p: any) => ({
      ...p,
      project_count: p.projects?.[0]?.count ?? 0,
    }));
    this.featuredCreators.set(creators);
  }

  private async loadCategoryCounts() {
    const { data } = await supabase.rpc('get_category_counts');
    if (!data) return;
    const countsMap: Record<string, number> = {};
    for (const row of data as { category: string; count: number }[]) {
      countsMap[row.category] = Number(row.count);
    }
    this.categories.update(cats =>
      cats.map(c => ({ ...c, count: countsMap[c.name] ?? 0 }))
    );
  }

  private async loadStats() {
    const [{ count: projectCount }, { count: userCount }] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
    ]);
    this.stats.set([
      { value: projectCount ? `${projectCount}+` : '0', label: 'Proyectos' },
      { value: userCount   ? `${userCount}+`   : '0', label: 'Diseñadores' },
      { value: '15K', label: 'Visitas mensuales' },
      { value: '8',   label: 'Categorías' },
    ]);
  }
}
