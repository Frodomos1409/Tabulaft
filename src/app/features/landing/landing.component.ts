import {
  Component, OnInit, inject, signal, NgZone,
  PLATFORM_ID, AfterViewInit, OnDestroy, ElementRef, ViewChild
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';
import { ProjectRow, ProjectService } from '../../core/services/project.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, CommonModule, ProjectCardComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingComponent implements OnInit, AfterViewInit, OnDestroy {
  private zone           = inject(NgZone);
  private platformId     = inject(PLATFORM_ID);
  private projectService = inject(ProjectService);

  carouselProjects = signal<ProjectRow[]>([]);
  recentProjects   = signal<ProjectRow[]>([]);
  featuredProjects = signal<ProjectRow[]>([]);

  stats = signal([
    { value: '–', label: 'Proyectos' },
    { value: '–', label: 'Diseñadores' },
    { value: '15K', label: 'Visitas mensuales' },
    { value: '8',   label: 'Categorías' },
  ]);

  heroImages = [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80',
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=400&q=80',
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
  ];

  carouselIndex = signal(0);
  private carouselTimer: ReturnType<typeof setInterval> | null = null;
  private destroyFns: (() => void)[] = [];

  @ViewChild('heroCard') heroCardRef?: ElementRef<HTMLElement>;
  @ViewChild('sparkOne') sparkOneRef?: ElementRef<HTMLElement>;
  @ViewChild('sparkTwo') sparkTwoRef?: ElementRef<HTMLElement>;

  get visibleSlides(): { project: ProjectRow; offset: number }[] {
    const projects = this.carouselProjects();
    const len = projects.length;
    if (!len) return [];
    const cur = this.carouselIndex();
    const result = [];
    for (let d = -2; d <= 2; d++) {
      result.push({ project: projects[(cur + d + len) % len], offset: d });
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

  onHeroMouseMove(e: MouseEvent) {
    if (!isPlatformBrowser(this.platformId)) return;
    const card = this.heroCardRef?.nativeElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rx = ((e.clientY - cy) / rect.height) * 14;
    const ry = -((e.clientX - cx) / rect.width) * 14;
    card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
    const s1 = this.sparkOneRef?.nativeElement;
    const s2 = this.sparkTwoRef?.nativeElement;
    if (s1) s1.style.transform = `translate(${(e.clientX - cx) * 0.04}px, ${(e.clientY - cy) * 0.04}px)`;
    if (s2) s2.style.transform = `translate(${(e.clientX - cx) * -0.06}px, ${(e.clientY - cy) * -0.06}px)`;
  }

  onHeroMouseLeave() {
    const card = this.heroCardRef?.nativeElement;
    if (card) card.style.transform = '';
    const s1 = this.sparkOneRef?.nativeElement;
    const s2 = this.sparkTwoRef?.nativeElement;
    if (s1) s1.style.transform = '';
    if (s2) s2.style.transform = '';
  }

  async ngOnInit() {
    await Promise.all([this.loadCarousel(), this.loadRecent(), this.loadFeatured(), this.loadStats()]);
  }

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.zone.runOutsideAngular(() => {
      this.initScrollReveal();
      this.initWordJump();
    });
    this.startCarousel();
  }

  ngOnDestroy() {
    this.destroyFns.forEach(fn => fn());
    if (this.carouselTimer) clearInterval(this.carouselTimer);
  }

  private initScrollReveal() {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('is-visible'); obs.unobserve(e.target); }
      }),
      { threshold: 0.08 }
    );
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    this.destroyFns.push(() => obs.disconnect());
  }

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
        entries.forEach(e => {
          if (e.isIntersecting) { el.classList.add('start-jump'); obs.unobserve(e.target); }
        });
      }, { threshold: 0.1 });
      obs.observe(el);
      this.destroyFns.push(() => obs.disconnect());
    });
  }

  private async loadCarousel() {
    const data = await this.projectService.getFeaturedProjects(8);
    this.carouselProjects.set(data);
  }

  private async loadRecent() {
    const data = await this.projectService.getProjects({ sort: 'recent', limit: 10 });
    this.recentProjects.set(data);
  }

  private async loadStats() {
    const stats = await this.projectService.getLandingStats();
    this.stats.set([
      { value: stats.projectCount ? `${stats.projectCount}+` : '0', label: 'Proyectos' },
      { value: stats.userCount    ? `${stats.userCount}+`    : '0', label: 'Diseñadores' },
      { value: '15K', label: 'Visitas mensuales' },
      { value: '8',   label: 'Categorías' },
    ]);
  }

  private async loadFeatured() {
    const data = await this.projectService.getProjects({ sort: 'popular', limit: 6 });
    this.featuredProjects.set(data);
  }
}
