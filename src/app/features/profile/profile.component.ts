import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';
import { ProfileService } from '../../core/services/profile.service';
import { ProjectService, ProjectRow } from '../../core/services/project.service';
import { AuthService, Profile } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectCardComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private profileService = inject(ProfileService);
  private projectService = inject(ProjectService);
  auth                   = inject(AuthService);
  private toast          = inject(ToastService);

  activeTab    = signal<'projects' | 'saved'>('projects');
  following    = signal(false);
  loading      = signal(true);
  savingEdit   = signal(false);
  showEditModal = signal(false);

  user          = signal<Profile | null>(null);
  projects      = signal<ProjectRow[]>([]);
  savedProjects = signal<ProjectRow[]>([]);

  editForm = { name: '', role: '', bio: '' };
  editAvatar: File | null = null;
  editAvatarPreview = signal<string | null>(null);

  isOwnProfile = computed(() => this.auth.currentUser()?.id === this.user()?.id);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    try {
      const [profile, userProjects] = await Promise.all([
        this.profileService.getProfile(id),
        this.projectService.getProjectsByUser(id),
      ]);
      this.user.set(profile);
      this.projects.set(userProjects);

      if (this.auth.isLoggedIn()) {
        const [isFollowing, saved] = await Promise.all([
          this.profileService.isFollowing(this.auth.currentUser()!.id, id),
          this.projectService.getSavedProjects(id),
        ]);
        this.following.set(isFollowing);
        this.savedProjects.set(saved);
      }
    } catch (e: any) {
      this.toast.show(e.message ?? 'Error al cargar perfil', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  openEditModal() {
    const u = this.user();
    if (!u) return;
    this.editForm = { name: u.name, role: u.role ?? '', bio: u.bio ?? '' };
    this.editAvatarPreview.set(u.avatar_url);
    this.editAvatar = null;
    this.showEditModal.set(true);
  }

  closeEditModal() { this.showEditModal.set(false); }

  onAvatarChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.editAvatar = file;
    const reader = new FileReader();
    reader.onload = () => this.editAvatarPreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  async saveProfile() {
    const u = this.user();
    if (!u || !this.editForm.name.trim()) return;
    this.savingEdit.set(true);
    try {
      const updated = await this.profileService.updateProfile(
        u.id,
        { name: this.editForm.name.trim(), role: this.editForm.role.trim(), bio: this.editForm.bio.trim() },
        this.editAvatar ?? undefined,
      );
      this.user.set(updated);
      // Sync auth signal si es el usuario propio
      if (this.auth.currentUser()?.id === u.id) {
        this.auth.currentUser.set(updated);
      }
      this.showEditModal.set(false);
      this.toast.show('Perfil actualizado', 'success', '✅');
    } catch (e: any) {
      this.toast.show(e.message ?? 'Error al guardar', 'error');
    } finally {
      this.savingEdit.set(false);
    }
  }

  async toggleFollow() {
    const user = this.user();
    if (!user || !this.auth.isLoggedIn()) return;
    const nowFollowing = await this.profileService.toggleFollow(this.auth.currentUser()!.id, user.id);
    this.following.set(nowFollowing);
    if (nowFollowing) {
      this.toast.follow();
      this.user.update(u => u ? { ...u, followers: u.followers + 1 } : u);
    } else {
      this.toast.show('Dejaste de seguir a ' + user.name, 'info', '👋');
      this.user.update(u => u ? { ...u, followers: Math.max(0, u.followers - 1) } : u);
    }
  }

  setTab(tab: 'projects' | 'saved') { this.activeTab.set(tab); }
}
