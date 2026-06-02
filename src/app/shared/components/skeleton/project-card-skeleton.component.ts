import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonComponent } from './skeleton.component';

@Component({
  selector: 'app-project-card-skeleton',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  template: `
    <div class="card-skeleton">
      <app-skeleton variant="card" />
      <div class="card-skeleton__body">
        <app-skeleton variant="title" width="75%" />
        <div class="card-skeleton__author">
          <app-skeleton variant="avatar" />
          <div class="card-skeleton__lines">
            <app-skeleton variant="text" width="60%" />
            <app-skeleton variant="text" width="40%" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card-skeleton {
      background: var(--bg-card);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      overflow: hidden;
      break-inside: avoid;
      margin-bottom: 20px;

      &__body {
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      &__author {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      &__lines {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
    }
  `]
})
export class ProjectCardSkeletonComponent {
  @Input() count = 6;
  get items() { return Array(this.count).fill(0); }
}
