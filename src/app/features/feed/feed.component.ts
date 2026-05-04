import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { ProjectCardSkeletonComponent } from '../../shared/components/skeleton/project-card-skeleton.component';
import { MOCK_PROJECTS, CATEGORIES } from '../../core/models/models';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, NavbarComponent, ProjectCardComponent, FooterComponent, ProjectCardSkeletonComponent],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss'
})
export class FeedComponent {
  allCategories = ['Todos', ...CATEGORIES] as const;
  activeCategory = signal<string>('Todos');
  sortBy = signal<'trending' | 'recent' | 'popular'>('trending');
  loading = signal(true);

  skeletonItems = Array(8).fill(0);

  constructor() {
    // Simulate initial load
    setTimeout(() => this.loading.set(false), 900);
  }

  projects = computed(() => {
    let list = [...MOCK_PROJECTS];
    if (this.activeCategory() !== 'Todos') {
      list = list.filter(p => p.category === this.activeCategory());
    }
    if (this.sortBy() === 'recent')  list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    else if (this.sortBy() === 'popular') list.sort((a, b) => b.views - a.views);
    else list.sort((a, b) => b.likes - a.likes);
    return list;
  });

  setCategory(cat: string) {
    this.loading.set(true);
    this.activeCategory.set(cat);
    setTimeout(() => this.loading.set(false), 400);
  }

  setSort(s: 'trending' | 'recent' | 'popular') {
    this.sortBy.set(s);
  }
}
