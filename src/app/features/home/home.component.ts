import {
  Component, OnInit, inject, signal, computed, effect,
  NgZone, PLATFORM_ID, AfterViewInit, OnDestroy, ChangeDetectionStrategy
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ProjectRow, ProjectService } from '../../core/services/project.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly auth           = inject(AuthService);
  private projectService  = inject(ProjectService);
  private zone            = inject(NgZone);
  private platformId      = inject(PLATFORM_ID);

  // Data
  carouselProjects = signal<ProjectRow[]>([]);
  recentProjects   = signal<ProjectRow[]>([]);
  popularProjects  = signal<ProjectRow[]>([]);
  loadingCarousel  = signal(true);
  loadingRecent    = signal(true);
  loadingPopular   = signal(true);

  // Carrusel 3D
  carouselIndex = signal(0);
  private carouselTimer: ReturnType<typeof setInterval> | null = null;

  skeletonItems = Array(6).fill(0);

  greeting = computed(() => {
    const name = this.auth.currentUser()?.name ?? '';
    const h = new Date().getHours();
    const s = h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches';
    return `${s}, ${name.split(' ')[0]}`;
  });

  private destroyFns: (() => void)[] = [];

  constructor() {
    // Re-observe reveal elements whenever any data signal changes
    effect(() => {
      this.carouselProjects(); this.recentProjects(); this.popularProjects();
      if (isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.zone.runOutsideAngular(() => this.initScrollReveal()), 50);
      }
    });
  }

  // ── Carrusel ────────────────────────────────────────────────────────────────
  get visibleSlides(): { project: ProjectRow; offset: number }[] {
    const projects = this.carouselProjects();
    const len = projects.length;
    if (!len) return [];
    const cur = this.carouselIndex();
    const result = [];
    for (let d = -2; d <= 2; d++) {
      const idx = (cur + d + len) % len;
      result.push({ project: projects[idx], offset: d });
    }
    return result;
  }

  nextSlide() {
    const len = this.carouselProjects().length;
    if (!len) return;
    this.carouselIndex.update(i => (i + 1) % len);
  }

  prevSlide() {
    const len = this.carouselProjects().length;
    if (!len) return;
    this.carouselIndex.update(i => (i - 1 + len) % len);
  }

  goToSlide(i: number) {
    this.carouselIndex.set(i);
    if (this.carouselTimer) clearInterval(this.carouselTimer);
    this.startCarousel();
  }

  private startCarousel() {
    this.carouselTimer = setInterval(() => {
      this.zone.run(() => this.nextSlide());
    }, 3800);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  ngOnInit() {
    Promise.all([
      this.loadCarousel(),
      this.loadRecent(),
      this.loadPopular(),
    ]);
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.zone.runOutsideAngular(() => {
      this.initScrollReveal();
      this.initWordJump();
    });
    this.startCarousel();
    const onVisibility = () => {
      if (document.hidden) {
        if (this.carouselTimer) clearInterval(this.carouselTimer);
      } else {
        this.startCarousel();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.destroyFns.push(() => document.removeEventListener('visibilitychange', onVisibility));
  }

  ngOnDestroy() {
    this.destroyFns.forEach(fn => fn());
    if (this.carouselTimer) clearInterval(this.carouselTimer);
  }

  // ── Scroll reveal ────────────────────────────────────────────────────────────
  private revealObserver: IntersectionObserver | null = null;

  private initScrollReveal() {
    if (this.revealObserver) this.revealObserver.disconnect();
    this.revealObserver = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          this.revealObserver?.unobserve(e.target);
        }
      }),
      { threshold: 0.06, rootMargin: '0px 0px 0px 0px' }
    );
    document.querySelectorAll('.reveal').forEach(el => {
      this.revealObserver!.observe(el);
    });
    this.destroyFns.push(() => this.revealObserver?.disconnect());
  }

  // ── Word jump ────────────────────────────────────────────────────────────────
  private initWordJump() {
    document.querySelectorAll<HTMLElement>('.animate-text').forEach(el => {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if ((node as Text).nodeValue?.trim()) nodes.push(node as Text);
      }
      let idx = 0;
      nodes.forEach(textNode => {
        const frag = document.createDocumentFragment();
        (textNode.nodeValue ?? '').split(/(\s+)/).forEach(part => {
          if (part.trim()) {
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = part;
            span.style.animationDelay = `${idx++ * 0.06}s`;
            frag.appendChild(span);
          } else {
            frag.appendChild(document.createTextNode(part));
          }
        });
        textNode.parentNode!.replaceChild(frag, textNode);
      });
      const obs = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { el.classList.add('start-jump'); obs.unobserve(e.target); } });
      }, { threshold: 0.1 });
      obs.observe(el);
      this.destroyFns.push(() => obs.disconnect());
    });
  }

  trackByProjectId(_: number, p: ProjectRow): string { return p.id; }

  // ── Data ─────────────────────────────────────────────────────────────────────
  private async loadCarousel() {
    try {
      this.carouselProjects.set(await this.projectService.getFeaturedProjects(8));
    } finally {
      this.loadingCarousel.set(false);
    }
  }

  private async loadRecent() {
    try {
      this.recentProjects.set((await this.projectService.getProjects({ sort: 'recent', limit: 10 })).data);
    } finally {
      this.loadingRecent.set(false);
    }
  }

  private async loadPopular() {
    try {
      this.popularProjects.set((await this.projectService.getProjects({ sort: 'popular', limit: 6 })).data);
    } finally {
      this.loadingPopular.set(false);
    }
  }
}
