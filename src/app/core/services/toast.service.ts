import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  icon?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, type: ToastType = 'success', icon?: string, duration = 2800) {
    const id = ++this.nextId;
    this.toasts.update(t => [...t, { id, message, type, icon }]);
    setTimeout(() => this.dismiss(id), duration);
  }

  dismiss(id: number) {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }

  like()   { this.show('¡Te gustó este proyecto!',  'success', '❤️'); }
  unlike() { this.show('Like eliminado',             'info',    '🤍'); }
  save()   { this.show('Guardado en tu colección',   'success', '🔖'); }
  unsave() { this.show('Eliminado de guardados',     'info',    '📌'); }
  follow() { this.show('Ahora sigues a este creador','success', '✨'); }
}
