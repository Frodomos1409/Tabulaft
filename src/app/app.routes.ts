import { Routes } from '@angular/router';
import { LandingComponent } from './features/landing/landing.component';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  {
    path: 'explorar',
    loadComponent: () => import('./features/feed/feed.component').then(m => m.FeedComponent)
  },
  {
    path: 'perfil/:id',
    loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'proyecto/:id',
    loadComponent: () => import('./features/project-detail/project-detail.component').then(m => m.ProjectDetailComponent)
  },
  {
    path: 'publicar',
    loadComponent: () => import('./features/upload/upload.component').then(m => m.UploadComponent)
  },
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
  },
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/auth.component').then(m => m.AuthComponent)
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
