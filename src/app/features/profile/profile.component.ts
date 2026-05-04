import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { MOCK_USERS, MOCK_PROJECTS } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, NavbarComponent, ProjectCardComponent, FooterComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent {
  private toast = inject(ToastService);

  activeTab  = signal<'projects' | 'saved'>('projects');
  following  = signal(false);

  user     = MOCK_USERS[0];
  projects = MOCK_PROJECTS.filter(p => p.author.id === this.user.id);

  toggleFollow() {
    this.following.update(v => !v);
    if (this.following()) this.toast.follow();
    else this.toast.show('Dejaste de seguir a ' + this.user.name, 'info', '👋');
  }
}
