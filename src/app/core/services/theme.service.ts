import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  isDark = signal(true);

  constructor() {
    const saved = localStorage.getItem('theme');
    if (saved) this.isDark.set(saved === 'dark');
    this.applyTheme(this.isDark());

    effect(() => {
      this.applyTheme(this.isDark());
      localStorage.setItem('theme', this.isDark() ? 'dark' : 'light');
    });
  }

  toggle() {
    this.isDark.update(v => !v);
  }

  private applyTheme(dark: boolean) {
    document.body.setAttribute('data-theme', dark ? 'dark' : 'light');
  }
}
