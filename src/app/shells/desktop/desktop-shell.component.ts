import {
  Component, OnInit, OnDestroy, AfterViewInit,
  signal, PLATFORM_ID, inject, NgZone
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { ToastComponent } from '../../shared/components/toast/toast.component';

@Component({
  selector: 'app-desktop-shell',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ToastComponent],
  template: `
    <!-- Loader -->
    @if (!loaderHidden()) {
      <div class="shell-loader" [class.hidden]="loaderDone()">
        <div class="shell-loader__content">
          <h1 class="shell-loader__title"
              [style]="'--progress:' + loaderProgress() + '%'">TABULAFT</h1>
          <p class="shell-loader__counter">{{ loaderProgress() }}</p>
        </div>
      </div>
    }

    <!-- Custom cursor dot -->
    <div class="shell-cursor"
         [style.left.px]="cursorX()"
         [style.top.px]="cursorY()"
         [class.hover]="cursorHover()"
         [class.on-image]="cursorOnImage()"></div>

    <!-- Cursor trail ring -->
    <div class="shell-cursor-trail"
         [style.left.px]="trailX()"
         [style.top.px]="trailY()"
         [class.on-image]="cursorOnImage()">
    </div>

    <!-- Orbit tooltip "VER →" — solo visible sobre imágenes de proyecto -->
    @if (cursorOnImage()) {
      <div class="shell-cursor-orbit"
           [style.left.px]="cursorX()"
           [style.top.px]="cursorY()">
        <span class="shell-cursor-orbit__label">VER →</span>
      </div>
    }

    <app-navbar />
    <router-outlet />
    <app-footer />
    <app-toast />
  `,
  styles: [`
    /* ── Loader ── */
    .shell-loader {
      position: fixed; inset: 0; z-index: 9999;
      background: #2830eb;
      display: grid;
      place-items: center;
      transition: transform 1s cubic-bezier(0.77, 0, 0.175, 1);
      will-change: transform;
    }
    .shell-loader.hidden {
      transform: translateY(-100%);
      pointer-events: none;
    }
    .shell-loader.hidden .shell-loader__content {
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .shell-loader__content {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      color: #fff;
      opacity: 1;
      transition: opacity 0.3s ease;
    }
    .shell-loader__title {
      font-family: 'Impact', 'Inter', sans-serif;
      font-size: clamp(60px, 12vw, 140px);
      font-weight: 900;
      letter-spacing: 0.12em;
      padding-left: 0.12em;
      margin: 0;
      text-align: center;
      color: transparent;
      -webkit-text-stroke: 2px rgba(255,255,255,0.2);
      background-image: linear-gradient(
        to right,
        #fff var(--progress, 0%),
        transparent var(--progress, 0%)
      );
      -webkit-background-clip: text;
      background-clip: text;
      background-repeat: no-repeat;
      background-origin: content-box;
    }
    .shell-loader__counter {
      position: absolute;
      top: 100%;
      margin-top: 20px;
      font-family: 'Inter', sans-serif;
      font-size: clamp(16px, 2vw, 24px);
      font-weight: 500;
      letter-spacing: 0.18em;
      padding-left: 0.18em;
      margin-bottom: 0; margin-left: 0; margin-right: 0;
      text-align: center;
      color: rgba(255,255,255,0.7);
    }
    .shell-loader__counter::after { content: '%'; }

    /* ── Cursor dot ── */
    .shell-cursor {
      position: fixed; z-index: 10000;
      width: 12px; height: 12px;
      background: #2830eb;
      border-radius: 50%;
      pointer-events: none;
      transform: translate(-50%, -50%);
      transition: width 0.2s, height 0.2s, background 0.2s, opacity 0.2s;
    }
    .shell-cursor.hover {
      width: 28px; height: 28px;
      background: rgba(40,48,235,0.35);
    }
    .shell-cursor.on-image {
      opacity: 0;
      width: 6px; height: 6px;
    }

    /* ── Cursor trail ring ── */
    .shell-cursor-trail {
      position: fixed; z-index: 9999;
      width: 36px; height: 36px;
      border: 2px solid rgba(40,48,235,0.5);
      border-radius: 50%;
      pointer-events: none;
      transform: translate(-50%, -50%);
      transition: left 0.12s ease, top 0.12s ease, border-color 0.2s, opacity 0.2s;
    }
    .shell-cursor-trail.on-image {
      opacity: 0;
    }

    /* ── Orbit tooltip ── */
    .shell-cursor-orbit {
      position: fixed;
      z-index: 10001;
      pointer-events: none;
      transform: translate(-50%, -50%);
      width: 0; height: 0;
    }
    .shell-cursor-orbit__label {
      position: absolute;
      top: 0; left: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 52px; height: 52px;
      background: #2830eb;
      color: #fff;
      font-family: 'Inter', sans-serif;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-radius: 50%;
      white-space: nowrap;
      box-shadow: 0 4px 16px rgba(40,48,235,0.5);
      animation: orbit 2s linear infinite;
      transform-origin: center;
    }

    @keyframes orbit {
      from { transform: rotate(0deg) translateX(52px) rotate(0deg); }
      to   { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
    }

    /* ── View transition flip 3D ── */
    @keyframes pageFlipIn {
      from {
        opacity: 0;
        transform: perspective(1200px) rotateY(-15deg) translateX(40px);
      }
      to {
        opacity: 1;
        transform: perspective(1200px) rotateY(0deg) translateX(0);
      }
    }
    @keyframes pageFlipOut {
      from {
        opacity: 1;
        transform: perspective(1200px) rotateY(0deg) translateX(0);
      }
      to {
        opacity: 0;
        transform: perspective(1200px) rotateY(15deg) translateX(-40px);
      }
    }

    ::view-transition-old(root) {
      animation: pageFlipOut 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
    }
    ::view-transition-new(root) {
      animation: pageFlipIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @media (pointer: coarse), (max-width: 820px) {
      .shell-cursor,
      .shell-cursor-trail,
      .shell-cursor-orbit { display: none; }
      .shell-loader { display: none; }
    }
  `],
})
export class DesktopShellComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private zone = inject(NgZone);

  loaderHidden   = signal(false);
  loaderDone     = signal(false);
  loaderProgress = signal(0);

  cursorX = signal(0);
  cursorY = signal(0);
  trailX  = signal(0);
  trailY  = signal(0);
  cursorHover   = signal(false);
  cursorOnImage = signal(false);

  private destroyFns: (() => void)[] = [];

  ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.zone.runOutsideAngular(() => {
      this.initLoader();
      this.initCursor();
    });
  }

  ngOnDestroy() {
    this.destroyFns.forEach(fn => fn());
  }

  private initLoader() {
    let progress = 0;
    const timer = setInterval(() => {
      progress += 1;
      // Batch UI updates: only trigger change detection every 5% to reduce zone.run() calls
      if (progress % 5 === 0 || progress >= 100) {
        this.zone.run(() => this.loaderProgress.set(progress));
      }

      if (progress >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          this.zone.run(() => this.loaderDone.set(true));
          setTimeout(() => this.zone.run(() => this.loaderHidden.set(true)), 1050);
        }, 300);
      }
    }, 15);
  }

  private initCursor() {
    let trailRafId = 0;
    let pendingTrailX = 0;
    let pendingTrailY = 0;

    const onMove = (e: MouseEvent) => {
      this.zone.run(() => {
        this.cursorX.set(e.clientX);
        this.cursorY.set(e.clientY);
      });

      pendingTrailX = e.clientX;
      pendingTrailY = e.clientY;

      if (!trailRafId) {
        trailRafId = requestAnimationFrame(() => {
          this.zone.run(() => {
            this.trailX.set(pendingTrailX);
            this.trailY.set(pendingTrailY);
          });
          trailRafId = 0;
        });
      }
    };

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const isInteractive = !!el.closest('a, button, [role="button"], input, select, label');
      const isProjectImg = !!el.closest(
        'app-project-card img, .work, .gallery__marquee-img, [data-cursor="project"]'
      );

      this.zone.run(() => {
        this.cursorHover.set(isInteractive && !isProjectImg);
        this.cursorOnImage.set(isProjectImg);
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', onOver);
    this.destroyFns.push(
      () => document.removeEventListener('mousemove', onMove),
      () => document.removeEventListener('mouseover', onOver),
      () => { if (trailRafId) cancelAnimationFrame(trailRafId); },
    );
  }
}
