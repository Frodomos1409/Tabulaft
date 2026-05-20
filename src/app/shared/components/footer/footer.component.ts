import { Component, AfterViewInit, ElementRef, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent implements AfterViewInit {
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;

    const logoEl = this.el.nativeElement.querySelector('.footer__logo');
    if (!logoEl) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          logoEl.classList.add('is-visible');
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    obs.observe(logoEl);
  }
}
