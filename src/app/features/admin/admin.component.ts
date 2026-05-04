import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MOCK_USERS, MOCK_PROJECTS } from '../../core/models/models';

type AdminSection = 'dashboard' | 'usuarios' | 'proyectos' | 'reportes' | 'configuracion';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent {
  activeSection = signal<AdminSection>('dashboard');
  sidebarCollapsed = signal(false);

  users = MOCK_USERS;
  projects = MOCK_PROJECTS;

  stats = [
    { label: 'Usuarios', value: '1,247', change: '+12%', up: true, icon: 'users' },
    { label: 'Proyectos', value: '3,892', change: '+8%',  up: true, icon: 'grid' },
    { label: 'Visitas',   value: '45.2K', change: '+23%', up: true, icon: 'eye' },
    { label: 'Reportes',  value: '7',     change: '-3',   up: false, icon: 'flag' },
  ];

  chartBars = [
    { day: 'L', height: 45 },
    { day: 'M', height: 72 },
    { day: 'X', height: 58 },
    { day: 'J', height: 88 },
    { day: 'V', height: 95 },
    { day: 'S', height: 67 },
    { day: 'D', height: 40 },
  ];

  reports = [
    { project: MOCK_PROJECTS[0], reason: 'Contenido inapropiado', date: '2024-04-01' },
    { project: MOCK_PROJECTS[3], reason: 'Plagio detectado',       date: '2024-03-28' },
    { project: MOCK_PROJECTS[7], reason: 'Derechos de autor',      date: '2024-03-25' },
  ];

  // Config form
  platformName = signal('Tabulaft');
  platformUrl   = signal('tabulaft.univalle.edu.co');
  supportEmail  = signal('soporte@tabulaft.edu.co');

  navItems: { id: AdminSection; label: string; icon: string }[] = [
    { id: 'dashboard',     label: 'Dashboard',     icon: 'home' },
    { id: 'usuarios',      label: 'Usuarios',      icon: 'users' },
    { id: 'proyectos',     label: 'Proyectos',     icon: 'grid' },
    { id: 'reportes',      label: 'Reportes',      icon: 'flag' },
    { id: 'configuracion', label: 'Configuración', icon: 'settings' },
  ];

  setSection(s: AdminSection) { this.activeSection.set(s); }
  toggleSidebar() { this.sidebarCollapsed.update(v => !v); }

  approveProject(id: string) { console.log('Aprobar', id); }
  rejectProject(id: string)  { console.log('Rechazar', id); }
  dismissReport(i: number)   { this.reports.splice(i, 1); }
  saveConfig() { alert('Configuración guardada (Demo)'); }

  getStatusLabel(i: number): string {
    return i % 3 === 0 ? 'Pending' : 'Active';
  }
}
