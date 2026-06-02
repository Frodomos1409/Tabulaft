import {
  Component, inject, signal, computed, OnInit, OnDestroy, AfterViewInit,
  ViewChild, ElementRef, NgZone, ChangeDetectionStrategy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from '../../core/services/device.service';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';
import { ProjectCardSkeletonComponent } from '../../shared/components/skeleton/project-card-skeleton.component';
import { CATEGORIES } from '../../core/models/models';
import { ProjectService, ProjectRow } from '../../core/services/project.service';
import { AcademicService, AcademicSubject } from '../../core/services/academic.service';
import { ToastService } from '../../core/services/toast.service';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, ProjectCardComponent, ProjectCardSkeletonComponent],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly device = inject(DeviceService);
  private projectService  = inject(ProjectService);
  private academicService = inject(AcademicService);
  private toast           = inject(ToastService);
  private zone            = inject(NgZone);

  @ViewChild('sentinel') sentinelRef?: ElementRef<HTMLElement>;

  allCategories  = ['Todos', ...CATEGORIES] as const;
  allSemesters   = signal<string[]>(['Todos']);
  allSubjects    = signal<AcademicSubject[]>([]);
  activeCategory = signal<string>('Todos');
  activeSemester = signal<string>('Todos');
  activeSubject  = signal<string>('Todas');
  sortBy         = signal<'trending' | 'recent' | 'popular'>('trending');

  loading         = signal(true);
  loadingMore     = signal(false);
  page            = signal(0);
  hasMore         = signal(true);
  projects        = signal<ProjectRow[]>([]);

  skeletonItems     = Array(8).fill(0);
  skeletonMoreItems = Array(4).fill(0);

  private scrollObserver?: IntersectionObserver;

  availableSubjects = computed<string[]>(() => {
    const cat = this.activeCategory();
    if (cat === 'Todos') return [];
    return this.allSubjects()
      .filter(s => s.category === cat)
      .map(s => s.name);
  });

  async ngOnInit() {
    await Promise.all([this.loadAcademic(), this.loadProjects(true)]);
  }

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => this.initInfiniteScroll());
  }

  ngOnDestroy() {
    this.scrollObserver?.disconnect();
  }

  private initInfiniteScroll() {
    if (!('IntersectionObserver' in window) || !this.sentinelRef) return;
    this.scrollObserver = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && this.hasMore() && !this.loadingMore() && !this.loading()) {
          this.zone.run(() => this.loadMore());
        }
      },
      { rootMargin: '500px' }
    );
    this.scrollObserver.observe(this.sentinelRef.nativeElement);
  }

  private async loadAcademic() {
    const [sems, subs] = await Promise.all([
      this.academicService.getSemesters(true),
      this.academicService.getSubjects(true),
    ]);
    this.allSemesters.set(['Todos', ...sems.map(s => s.name)]);
    this.allSubjects.set(subs);
  }

  private async loadProjects(reset = false) {
    if (reset) {
      this.page.set(0);
      this.loading.set(true);
      this.projects.set([]);
    } else {
      this.loadingMore.set(true);
    }

    try {
      const data = await this.projectService.getProjects({
        category: this.activeCategory(),
        sort: this.sortBy(),
        semester: this.activeSemester() !== 'Todos' ? this.activeSemester() : undefined,
        subject:  this.activeSubject()  !== 'Todas' ? this.activeSubject()  : undefined,
        page: this.page(),
        limit: PAGE_SIZE,
      });

      if (reset) {
        this.projects.set(data);
      } else {
        this.projects.update(prev => [...prev, ...data]);
      }
      this.hasMore.set(data.length === PAGE_SIZE);
    } catch (e: any) {
      this.toast.show(e.message ?? 'Error al cargar proyectos', 'error');
      if (!reset) this.page.update(p => Math.max(0, p - 1));
    } finally {
      this.loading.set(false);
      this.loadingMore.set(false);
    }
  }

  async loadMore() {
    if (this.loadingMore() || !this.hasMore() || this.loading()) return;
    this.page.update(p => p + 1);
    await this.loadProjects(false);
  }

  async setCategory(cat: string) {
    this.activeCategory.set(cat);
    this.activeSubject.set('Todas');
    await this.loadProjects(true);
  }

  async setSemester(sem: string) {
    this.activeSemester.set(sem);
    await this.loadProjects(true);
  }

  async setSubject(sub: string) {
    this.activeSubject.set(sub);
    await this.loadProjects(true);
  }

  async setSort(s: 'trending' | 'recent' | 'popular') {
    this.sortBy.set(s);
    await this.loadProjects(true);
  }

  trackByProjectId(_: number, p: ProjectRow): string { return p.id; }
}
