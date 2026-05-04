import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="avatar" [class]="'avatar--' + size" [style.background]="imgLoaded() !== true ? gradient : null">
      @if (src) {
        <img
          [src]="src"
          [alt]="name"
          (load)="imgLoaded.set(true)"
          (error)="imgLoaded.set(false)"
          [style.display]="imgLoaded() === true ? 'block' : 'none'"
        />
      }
      @if (imgLoaded() !== true) {
        <span class="avatar__initial">{{ initial }}</span>
      }
    </div>
  `,
  styles: [`
    .avatar {
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      border: 1px solid var(--border);

      &--sm  { width: 28px;  height: 28px;  border-radius: 8px; }
      &--md  { width: 40px;  height: 40px;  border-radius: 10px; }
      &--lg  { width: 52px;  height: 52px;  border-radius: 12px; }
      &--xl  { width: 80px;  height: 80px;  border-radius: 16px; }
      &--2xl { width: 120px; height: 120px; border-radius: 20px; }

      img { width: 100%; height: 100%; object-fit: cover; display: block; }

      &__initial {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 800;
        color: white;
        text-transform: uppercase;
        line-height: 1;
      }
    }

    .avatar--sm  .avatar__initial { font-size: 11px; }
    .avatar--md  .avatar__initial { font-size: 14px; }
    .avatar--lg  .avatar__initial { font-size: 18px; }
    .avatar--xl  .avatar__initial { font-size: 28px; }
    .avatar--2xl .avatar__initial { font-size: 44px; }
  `]
})
export class UserAvatarComponent {
  @Input() src?: string;
  @Input() name = '';
  @Input() size: 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'md';

  imgLoaded = signal<boolean | null>(null);

  get initial(): string {
    return this.name.charAt(0) || '?';
  }

  get gradient(): string {
    const gradients = [
      'linear-gradient(135deg, #6754F8, #8014C4)',
      'linear-gradient(135deg, #8014C4, #E91E8C)',
      'linear-gradient(135deg, #E91E8C, #6754F8)',
      'linear-gradient(135deg, #6754F8, #4338CA)',
      'linear-gradient(135deg, #059669, #6754F8)',
    ];
    const idx = (this.name.charCodeAt(0) || 0) % gradients.length;
    return gradients[idx];
  }
}
