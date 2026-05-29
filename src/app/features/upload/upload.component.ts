import { Component, inject, signal, ElementRef, ViewChild, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CATEGORIES, Category } from '../../core/models/models';
import { ProjectService } from '../../core/services/project.service';
import { AcademicService, AcademicSemester, AcademicSubject } from '../../core/services/academic.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

interface ImagePreview {
  url: string;
  file: File;
  isCover: boolean;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss'
})
export class UploadComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private projectService  = inject(ProjectService);
  private academicService = inject(AcademicService);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  step = signal(1);
  isDragOver = signal(false);
  isLoading = signal(false);

  images = signal<ImagePreview[]>([]);
  title = signal('');
  description = signal('');
  category = signal<Category | ''>('');
  tagInput    = signal('');
  tags        = signal<string[]>([]);
  semester    = signal('');
  subject     = signal('');
  categories  = CATEGORIES;
  semesters   = signal<string[]>([]);
  allSubjects = signal<AcademicSubject[]>([]);

  get availableSubjects(): string[] {
    const cat = this.category();
    if (!cat) return [];
    return this.allSubjects().filter(s => s.category === cat).map(s => s.name);
  }

  async ngOnInit() {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/auth']);
      return;
    }
    const [sems, subs]: [AcademicSemester[], AcademicSubject[]] = await Promise.all([
      this.academicService.getSemesters(true),
      this.academicService.getSubjects(true),
    ]);
    this.semesters.set(sems.map(s => s.name));
    this.allSubjects.set(subs);
  }

  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragOver.set(true); }
  onDragLeave() { this.isDragOver.set(false); }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragOver.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []).filter(f => f.type.startsWith('image/'));
    this.addFiles(files);
  }
  openFilePicker() { this.fileInput.nativeElement.click(); }
  onFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.addFiles(files);
    input.value = '';
  }
  private addFiles(files: File[]) {
    const current = this.images();
    const newPreviews: ImagePreview[] = files.map((file, i) => ({
      file,
      url: URL.createObjectURL(file),
      isCover: current.length === 0 && i === 0
    }));
    this.images.update(prev => [...prev, ...newPreviews]);
  }
  setCover(index: number) {
    this.images.update(imgs => imgs.map((img, i) => ({ ...img, isCover: i === index })));
  }
  removeImage(index: number) {
    this.images.update(imgs => {
      const updated = imgs.filter((_, i) => i !== index);
      if (updated.length > 0 && !updated.some(i => i.isCover)) updated[0].isCover = true;
      return updated;
    });
  }

  addTag(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = this.tagInput().trim().toLowerCase().replace(/,/g, '');
      if (val && !this.tags().includes(val) && this.tags().length < 8) {
        this.tags.update(t => [...t, val]);
      }
      this.tagInput.set('');
    }
  }
  removeTag(tag: string) { this.tags.update(t => t.filter(x => x !== tag)); }

  nextStep() { if (this.step() < 3) this.step.update(s => s + 1); }
  prevStep() { if (this.step() > 1) this.step.update(s => s - 1); }
  canGoNext(): boolean {
    if (this.step() === 1) return this.images().length > 0;
    if (this.step() === 2) return !!this.title().trim() && !!this.category();
    return true;
  }
  get coverImage(): string {
    return this.images().find(i => i.isCover)?.url ?? this.images()[0]?.url ?? '';
  }

  async publish() {
    this.isLoading.set(true);
    try {
      const project = await this.projectService.createProject(
        {
          title:       this.title(),
          description: this.description(),
          category:    this.category() as string,
          tags:        this.tags(),
          semester:    this.semester() || undefined,
          subject:     this.subject()  || undefined,
        },
        this.images().map(i => i.file)
      );
      this.toast.show('Proyecto enviado. Pendiente de revisión por el admin.', 'success');
      this.router.navigate(['/explorar']);
    } catch (e: any) {
      this.toast.show(e.message ?? 'Error al publicar', 'error');
    } finally {
      this.isLoading.set(false);
    }
  }
}
