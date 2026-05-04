import { Component, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { ProjectCardComponent } from '../../shared/components/project-card/project-card.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { MOCK_PROJECTS } from '../../core/models/models';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [RouterLink, CommonModule, NavbarComponent, ProjectCardComponent, FooterComponent],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.scss'
})
export class ProjectDetailComponent {
  private toast = inject(ToastService);

  project = MOCK_PROJECTS[0];
  related = MOCK_PROJECTS.slice(1, 4);
  liked   = signal(false);
  saved   = signal(false);

  toggleLike() {
    this.liked.update(v => !v);
    this.liked() ? this.toast.like() : this.toast.unlike();
  }

  toggleSave() {
    this.saved.update(v => !v);
    this.saved() ? this.toast.save() : this.toast.unsave();
  }
}
