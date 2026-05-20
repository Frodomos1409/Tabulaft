import {
  Component, signal, Output, EventEmitter,
  HostListener, ElementRef, ViewChild, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CATEGORIES } from '../../../core/models/models';
import { ProjectRow, ProjectService } from '../../../core/services/project.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-search-modal',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './search-modal.component.html',
  styleUrl: './search-modal.component.scss'
})
export class SearchModalComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private projectService = inject(ProjectService);

  query        = signal('');
  activeFilter = signal<string>('Todos');
  isSearching  = signal(false);
  results      = signal<ProjectRow[]>([]);

  categories = ['Todos', ...CATEGORIES];

  private querySubject = new Subject<string>();
  private destroy$     = new Subject<void>();

  ngOnInit() {
    setTimeout(() => this.searchInput?.nativeElement.focus(), 60);

    this.querySubject.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(val => {
      this.query.set(val);
      this.search(val, this.activeFilter());
    });

    this.search('', 'Todos');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async search(q: string, cat: string) {
    this.isSearching.set(true);
    try {
      const data = await this.projectService.getProjects({
        search: q || undefined,
        category: cat !== 'Todos' ? cat : undefined,
        sort: 'recent',
      });
      this.results.set(data.slice(0, 8));
    } finally {
      this.isSearching.set(false);
    }
  }

  onInput(e: Event) {
    this.isSearching.set(true);
    this.querySubject.next((e.target as HTMLInputElement).value);
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.close.emit(); }

  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('sm-backdrop')) {
      this.close.emit();
    }
  }

  setFilter(f: string) {
    this.activeFilter.set(f);
    this.search(this.query(), f);
  }

  clearQuery() {
    this.query.set('');
    if (this.searchInput) this.searchInput.nativeElement.value = '';
    this.searchInput?.nativeElement.focus();
    this.search('', this.activeFilter());
  }

  onResultClick() { this.close.emit(); }
}
