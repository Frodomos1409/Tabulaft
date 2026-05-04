import { Component, Input, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Project } from '../../../core/models/models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.scss'
})
export class ProjectCardComponent {
  @Input() project!: Project;
  private toast = inject(ToastService);

  liked = signal(false);
  saved = signal(false);

  toggleLike(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.liked.update(v => !v);
    this.liked() ? this.toast.like() : this.toast.unlike();
  }

  toggleSave(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    this.saved.update(v => !v);
    this.saved() ? this.toast.save() : this.toast.unsave();
  }
}
