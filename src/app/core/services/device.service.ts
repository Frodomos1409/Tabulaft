import { Injectable, signal, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class DeviceService implements OnDestroy {
  private readonly query = window.matchMedia('(max-width: 768px)');
  readonly isMobile = signal<boolean>(this.query.matches);

  private readonly listener = (e: MediaQueryListEvent) => {
    this.isMobile.set(e.matches);
  };

  constructor() {
    this.query.addEventListener('change', this.listener);
  }

  ngOnDestroy() {
    this.query.removeEventListener('change', this.listener);
  }
}
