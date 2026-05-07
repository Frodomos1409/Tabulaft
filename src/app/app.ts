import { Component, inject } from '@angular/core';
import { ThemeService } from './core/services/theme.service';
import { DeviceService } from './core/services/device.service';
import { DesktopShellComponent } from './shells/desktop/desktop-shell.component';
import { MobileShellComponent } from './shells/mobile/mobile-shell.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DesktopShellComponent, MobileShellComponent],
  template: `
    @if (device.isMobile()) {
      <app-mobile-shell />
    } @else {
      <app-desktop-shell />
    }
  `
})
export class App {
  private theme = inject(ThemeService);
  readonly device = inject(DeviceService);
}
