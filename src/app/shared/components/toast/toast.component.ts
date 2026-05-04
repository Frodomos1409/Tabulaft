import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast" [class]="'toast--' + toast.type">
          @if (toast.icon) { <span class="toast__icon">{{ toast.icon }}</span> }
          <span class="toast__msg">{{ toast.message }}</span>
          <button class="toast__close" (click)="toastSvc.dismiss(toast.id)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 28px;
      right: 28px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 12px;
      background: #1A1A2A;
      border: 1px solid rgba(255,255,255,0.1);
      border-left: 3px solid #E91E8C;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      min-width: 220px;
      max-width: 340px;
      pointer-events: all;
      animation: slideInRight 0.25s ease;

      &--success { border-left-color: #34d399; }
      &--error   { border-left-color: #f87171; }
      &--info    { border-left-color: #8B7CFA; }
    }

    .toast__icon { font-size: 16px; flex-shrink: 0; }
    .toast__msg  { flex: 1; line-height: 1.35; }

    .toast__close {
      display: flex; align-items: center; justify-content: center;
      width: 20px; height: 20px;
      border-radius: 6px;
      background: rgba(255,255,255,0.06);
      border: none; cursor: pointer;
      color: rgba(255,255,255,0.4);
      flex-shrink: 0;
      transition: all 0.15s ease;
      &:hover { background: rgba(255,255,255,0.12); color: #fff; }
    }

    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(24px) scale(0.96); }
      to   { opacity: 1; transform: translateX(0) scale(1); }
    }

    @media (max-width: 480px) {
      .toast-container { left: 16px; right: 16px; bottom: 20px; }
      .toast { max-width: 100%; }
    }
  `]
})
export class ToastComponent {
  toastSvc = inject(ToastService);
}
