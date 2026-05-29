import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal(false);

  constructor() {
    const saved = localStorage.getItem('theme');
    const dark = saved === 'dark';
    this.isDark.set(dark);
    this.applyTheme(dark);
  }

  toggle() {
    const next = !this.isDark();
    this.isDark.set(next);
    this.applyTheme(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  }

  private applyTheme(dark: boolean) {
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
}
