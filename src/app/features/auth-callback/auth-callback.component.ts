import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  template: `
    <div style="
      display:flex;align-items:center;justify-content:center;
      height:100vh;flex-direction:column;gap:1.5rem;
      background:#2830eb;
    ">
      <svg style="width:64px;height:auto;opacity:0.9"
           viewBox="0 0 812.3 469.21" xmlns="http://www.w3.org/2000/svg">
        <ellipse fill="#ee41ba" cx="776.85" cy="433.44" rx="35.45" ry="35.77"/>
        <polygon fill="white" points="206.28 469.21 55.38 469.21 55.38 61.55 0 61.55 0 .5 203.77 .5 181.82 61.55 124.24 61.55 124.24 408.15 185.9 408.15 206.28 469.21"/>
        <path fill="white" d="M298.46.61l-.16.05v-.16h-74.47l-70.52,237.85.27.08-.36.11,70.52,230.67h74.47v-.16l.16.05,70.51-230.61.11-.03L298.46.61ZM261.13,117.12l9.91,33.45h-19.82l9.91-33.45ZM261.03,356.11l-10.22-33.45h20.44l-10.22,33.45ZM261.03,275.54c-20,0-36.21-16.66-36.21-37.21s16.21-37.21,36.21-37.21,36.21,16.66,36.21,37.21-16.21,37.21-36.21,37.21Z"/>
        <path fill="white" d="M741.24,156.38l.16-156.38h-68.74l-.16,163.53c0,16.36-6.55,21.8-14.74,21.8s-14.72-5.44-14.72-21.8l.16-163.53h-68.74l-.16,156.38c0,41.65,15.3,63.56,36.92,74.3h-87.57c26.43-10.95,40.37-33.28,40.37-62.2,0-25.53-11.95-44.78-34.2-55.27,18.92-10.85,28.88-28.33,28.88-51.43,0-37.78-29.21-61.22-82.66-61.22h-87.61v468.65h68.85v-74.03h92.71v-69.48h-92.71v-25.55h166.04v169.05s68.86,0,68.86,0v-169.05h49.04v-69.48h-36.92c21.62-10.74,36.92-32.65,36.92-74.3ZM458.13,56.53h11.29c11.96,0,17.94,8.75,17.94,17.5s-5.97,17.84-17.94,17.84h-11.29v-35.34ZM475.07,182.13h-16.93v-44.78h16.93c11.96,0,17.94,11.2,17.94,22.38s-5.97,22.4-17.94,22.4Z"/>
      </svg>
      <div style="width:120px;height:3px;background:rgba(255,255,255,0.15);border-radius:99px;overflow:hidden">
        <div style="height:100%;background:#ee41ba;border-radius:99px;animation:lb 2s ease infinite;"></div>
      </div>
      <p style="font-family:'Inter',sans-serif;font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.55);">Verificando sesión...</p>
      <style>@keyframes lb{0%{width:0%;margin-left:0%}50%{width:70%;margin-left:15%}100%{width:0%;margin-left:100%}}</style>
    </div>
  `
})
export class AuthCallbackComponent implements OnInit {
  private router = inject(Router);
  private auth   = inject(AuthService);

  async ngOnInit() {
    await this.auth.sessionReady;

    if (this.auth.isLoggedIn()) {
      this.router.navigate([this.auth.isAdmin() ? '/admin' : '/explorar']);
    } else {
      this.router.navigate(['/auth']);
    }
  }
}
