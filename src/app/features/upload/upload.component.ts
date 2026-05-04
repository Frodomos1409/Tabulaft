import { Component, signal, ElementRef, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { CATEGORIES, Category } from '../../core/models/models';

interface ImagePreview {
  url: string;
  file: File;
  isCover: boolean;
}

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, NavbarComponent],
  templateUrl: './upload.component.html',
  styleUrl: './upload.component.scss'
})
export class UploadComponent {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  step = signal(1);
  isDragOver = signal(false);

  images = signal<ImagePreview[]>([]);

  title = signal('');
  description = signal('');
  category = signal<Category | ''>('');
  tagInput = signal('');
  tags = signal<string[]>([]);

  categories = CATEGORIES;

  // ─── Step 1 ────────────────────────────────────────────────────────────
  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragOver.set(true);
  }

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
      if (updated.length > 0 && !updated.some(i => i.isCover)) {
        updated[0].isCover = true;
      }
      return updated;
    });
  }

  // ─── Step 2 ────────────────────────────────────────────────────────────
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

  // ─── Navigation ────────────────────────────────────────────────────────
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

  publish() {
    console.log('Publicando...', {
      title: this.title(),
      description: this.description(),
      category: this.category(),
      tags: this.tags(),
      images: this.images().map(i => i.file.name)
    });
    alert('¡Proyecto publicado exitosamente! (Demo)');
  }
}
