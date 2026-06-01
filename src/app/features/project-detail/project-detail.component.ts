import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DeviceService } from '../../core/services/device.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';
import { ProjectService, ProjectRow } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, ProjectCardComponent],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailComponent implements OnInit {
  readonly device = inject(DeviceService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectService = inject(ProjectService);
  auth = inject(AuthService);
  private toast = inject(ToastService);

  project = signal<ProjectRow | null>(null);
  related = signal<ProjectRow[]>([]);
  comments = signal<any[]>([]);
  liked = signal(false);
  saved = signal(false);
  commentText = '';
  loading = signal(true);

  showReportModal  = signal(false);
  reportReason     = '';
  sendingReport    = signal(false);
  lightboxOpen     = signal(false);
  isOwnProject     = computed(() =>
    !!this.auth.currentUser() && this.auth.currentUser()!.id === this.project()?.author_id
  );

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigate(['/explorar']); return; }

    try {
      const p = await this.projectService.getProjectById(id);
      if (!p) { this.router.navigate(['/explorar']); return; }
      this.project.set(p);
      this.projectService.incrementView(id);

      const [relatedProjects, commentsData] = await Promise.all([
        this.projectService.getProjects({ category: p.category }),
        this.projectService.getComments(id),
      ]);
      this.related.set(relatedProjects.filter(r => r.id !== id).slice(0, 3));
      this.comments.set(commentsData);

      const user = this.auth.currentUser();
      if (user) {
        const [isLiked, isSaved] = await Promise.all([
          this.projectService.isLiked(id, user.id),
          this.projectService.isSaved(id, user.id),
        ]);
        this.liked.set(isLiked);
        this.saved.set(isSaved);
      }
    } catch (e: any) {
      this.toast.show(e.message ?? 'Error al cargar proyecto', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  async toggleLike() {
    if (!this.auth.isLoggedIn()) {
      this.toast.show('Inicia sesión para dar like', 'info', '👋');
      return;
    }
    const p = this.project();
    if (!p) return;
    const nowLiked = await this.projectService.toggleLike(p.id);
    this.liked.set(nowLiked);
    nowLiked ? this.toast.like() : this.toast.unlike();
    // Update count locally
    this.project.update(proj => proj ? { ...proj, likes: proj.likes + (nowLiked ? 1 : -1) } : proj);
  }

  async toggleSave() {
    if (!this.auth.isLoggedIn()) {
      this.toast.show('Inicia sesión para guardar', 'info', '👋');
      return;
    }
    const p = this.project();
    if (!p) return;
    const nowSaved = await this.projectService.toggleSave(p.id);
    this.saved.set(nowSaved);
    nowSaved ? this.toast.save() : this.toast.unsave();
  }

  async submitReport() {
    if (!this.reportReason.trim()) return;
    const p = this.project();
    if (!p) return;
    this.sendingReport.set(true);
    try {
      await this.projectService.reportProject(p.id, this.reportReason.trim());
      this.reportReason = '';
      this.showReportModal.set(false);
      this.toast.show('Reporte enviado, lo revisaremos pronto', 'success', '🚩');
    } catch (e: any) {
      this.toast.show(e.message ?? 'Error al enviar reporte', 'error');
    } finally {
      this.sendingReport.set(false);
    }
  }

  trackByProjectId(_: number, p: ProjectRow): string { return p.id; }
  trackByCommentId(_: number, c: any): string { return c.id; }

  async submitComment() {
    if (!this.commentText.trim()) return;
    const p = this.project();
    if (!p) return;
    try {
      await this.projectService.addComment(p.id, this.commentText.trim());
      this.commentText = '';
      const updated = await this.projectService.getComments(p.id);
      this.comments.set(updated);
    } catch (e: any) {
      this.toast.show(e.message ?? 'Error al comentar', 'error');
    }
  }
}
