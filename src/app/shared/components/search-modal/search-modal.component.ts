import {
  Component, signal, computed, Output, EventEmitter,
  HostListener, ElementRef, ViewChild, OnInit, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { MOCK_PROJECTS, CATEGORIES, Project } from '../../../core/models/models';

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

  query         = signal('');
  activeFilter  = signal<string>('Todos');
  isSearching   = signal(false);

  categories = ['Todos', ...CATEGORIES];

  private querySubject = new Subject<string>();
  private destroy$     = new Subject<void>();

  results = computed<Project[]>(() => {
    const q   = this.query().toLowerCase().trim();
    const cat = this.activeFilter();
    let list  = [...MOCK_PROJECTS];

    if (cat !== 'Todos') list = list.filter(p => p.category === cat);

    if (q.length < 1) return list.slice(0, 6);

    return list.filter(p =>
      p.title.toLowerCase().includes(q)       ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)) ||
      p.author.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    ).slice(0, 8);
  });

  ngOnInit() {
    setTimeout(() => this.searchInput?.nativeElement.focus(), 60);

    this.querySubject.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(val => {
      this.query.set(val);
      this.isSearching.set(false);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInput(e: Event) {
    this.isSearching.set(true);
    this.querySubject.next((e.target as HTMLInputElement).value);
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.close.emit(); }

  onBackdropClick(e: MouseEvent) {
    if ((e.target as HTMLElement).classList.contains('search-modal')) {
      this.close.emit();
    }
  }

  setFilter(f: string) { this.activeFilter.set(f); }

  clearQuery() {
    this.query.set('');
    if (this.searchInput) this.searchInput.nativeElement.value = '';
    this.searchInput?.nativeElement.focus();
  }

  onResultClick() { this.close.emit(); }
}
