import { Component, Input, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { ProjectService } from '../../../core/services/project.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCardComponent implements OnInit {
  @Input() project!: any;
  /** Pre-resolved by parent to avoid N+1 queries. Falls back to individual query if absent. */
  @Input() initialLiked?: boolean;
  @Input() initialSaved?: boolean;

  private toast          = inject(ToastService);
  private projectService = inject(ProjectService);
  private auth           = inject(AuthService);

  liked     = signal(false);
  saved     = signal(false);
  likeCount = signal(0);
  imgLoaded = signal(false);

  async ngOnInit() {
    this.likeCount.set(this.project?.likes ?? 0);

    if (this.initialLiked !== undefined) {
      this.liked.set(this.initialLiked);
    }
    if (this.initialSaved !== undefined) {
      this.saved.set(this.initialSaved);
    }

    // Only hit the DB when the parent didn't resolve state in batch
    if (this.initialLiked === undefined || this.initialSaved === undefined) {
      const userId = this.auth.currentUser()?.id;
      if (userId && this.project?.id) {
        const [isLiked, isSaved] = await Promise.all([
          this.initialLiked === undefined ? this.projectService.isLiked(this.project.id, userId) : Promise.resolve(this.initialLiked),
          this.initialSaved === undefined ? this.projectService.isSaved(this.project.id, userId) : Promise.resolve(this.initialSaved),
        ]);
        this.liked.set(isLiked);
        this.saved.set(isSaved);
      }
    }
  }

  async toggleLike(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    const userId = this.auth.currentUser()?.id;
    if (!userId) { this.toast.show('Inicia sesión para dar like', 'info'); return; }
    const nowLiked = await this.projectService.toggleLike(this.project.id);
    this.liked.set(nowLiked);
    this.likeCount.update(n => nowLiked ? n + 1 : Math.max(0, n - 1));
    nowLiked ? this.toast.like() : this.toast.unlike();
  }

  async toggleSave(e: Event) {
    e.preventDefault();
    e.stopPropagation();
    const userId = this.auth.currentUser()?.id;
    if (!userId) { this.toast.show('Inicia sesión para guardar', 'info'); return; }
    const nowSaved = await this.projectService.toggleSave(this.project.id);
    this.saved.set(nowSaved);
    nowSaved ? this.toast.save() : this.toast.unsave();
  }
}
