import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton" [class]="'skeleton--' + variant" [style.width]="width" [style.height]="height"></div>
  `,
  styles: [`
    .skeleton {
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.6s infinite;
      border-radius: 10px;

      &--card  { width: 100%; aspect-ratio: 3/4; border-radius: 16px; }
      &--text  { height: 14px; border-radius: 6px; }
      &--title { height: 22px; border-radius: 8px; }
      &--avatar { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; }
      &--rect  { border-radius: 10px; }
    }
  `]
})
export class SkeletonComponent {
  @Input() variant: 'card' | 'text' | 'title' | 'avatar' | 'rect' = 'rect';
  @Input() width  = 'auto';
  @Input() height = 'auto';
}
