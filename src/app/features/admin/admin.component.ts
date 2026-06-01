import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, AdminStats, PlatformConfig } from '../../core/services/admin.service';
import { AcademicService, AcademicSemester, AcademicSubject } from '../../core/services/academic.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CATEGORIES } from '../../core/models/models';

type AdminSection = 'dashboard' | 'usuarios' | 'proyectos' | 'reportes' | 'academico' | 'actividad' | 'configuracion';
type ProjectStatusFilter = 'all' | 'pending' | 'active' | 'rejected';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule, DatePipe],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private adminService    = inject(AdminService);
  private academicService = inject(AcademicService);
  auth = inject(AuthService);
  private toast = inject(ToastService);

  activeSection    = signal<AdminSection>('dashboard');
  sidebarCollapsed = signal(false);
  loading          = signal(true);

  users    = signal<any[]>([]);
  projects = signal<any[]>([]);
  reports  = signal<any[]>([]);
  allReports = signal<any[]>([]);
  config   = signal<PlatformConfig | null>(null);
  stats    = signal<AdminStats | null>(null);
  activityLog = signal<any[]>([]);

  // ─── Filtros usuarios ────────────────────────────────────────────────────────
  userSearch = signal('');

  // ─── Filtros proyectos ───────────────────────────────────────────────────────
  projectStatusFilter = signal<ProjectStatusFilter>('pending');
  projectSearch       = signal('');
  projectCategoryFilter = signal('all');

  filteredProjects = computed(() => {
    const status = this.projectStatusFilter();
    const search = this.projectSearch().toLowerCase();
    const cat    = this.projectCategoryFilter();
    return this.projects().filter(p => {
      const matchStatus = status === 'all' || p.status === status;
      const matchSearch = !search || p.title?.toLowerCase().includes(search) ||
        p.author?.name?.toLowerCase().includes(search);
      const matchCat = cat === 'all' || p.category === cat;
      return matchStatus && matchSearch && matchCat;
    });
  });

  filteredUsers = computed(() => {
    const q = this.userSearch().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(u =>
      u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
    );
  });

  pendingCount  = computed(() => this.projects().filter(p => p.status === 'pending').length);
  activeCount   = computed(() => this.projects().filter(p => p.status === 'active').length);
  rejectedCount = computed(() => this.projects().filter(p => p.status === 'rejected').length);

  // ─── Académico ───────────────────────────────────────────────────────────────
  semesters       = signal<AcademicSemester[]>([]);
  subjects        = signal<AcademicSubject[]>([]);
  academicLoading = signal(false);
  categories      = CATEGORIES;
  allCategories   = ['all', ...CATEGORIES];

  newSemName  = '';
  newSemLabel = '';
  newSemOrder = 0;
  editSem     = signal<AcademicSemester | null>(null);

  newSubCat   = '';
  newSubName  = '';
  newSubOrder = 0;
  editSub     = signal<AcademicSubject | null>(null);

  subjectsByCategory = computed(() => this.academicService.groupByCategory(this.subjects()));

  // ─── Editar proyecto académico ───────────────────────────────────────────────
  editingProject   = signal<any | null>(null);
  projectSemesters = computed(() => this.semesters().map(s => s.name));
  projectSubjects  = computed(() => {
    const cat = this.editingProject()?.category;
    if (!cat) return [];
    return (this.subjectsByCategory()[cat] ?? []).map((s: AcademicSubject) => s.name);
  });

  // ─── Modal rechazo ───────────────────────────────────────────────────────────
  rejectingProject = signal<any | null>(null);
  rejectNote       = signal('');

  // ─── Modal detalle proyecto ──────────────────────────────────────────────────
  viewingProject = signal<any | null>(null);

  // ─── Reportes ────────────────────────────────────────────────────────────────
  showResolvedReports = signal(false);

  today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  navItems: { id: AdminSection; label: string; icon: string }[] = [
    { id: 'dashboard',     label: 'Dashboard',     icon: 'home'     },
    { id: 'proyectos',     label: 'Proyectos',     icon: 'grid'     },
    { id: 'usuarios',      label: 'Usuarios',      icon: 'users'    },
    { id: 'reportes',      label: 'Reportes',      icon: 'flag'     },
    { id: 'academico',     label: 'Académico',     icon: 'book'     },
    { id: 'actividad',     label: 'Actividad',     icon: 'activity' },
    { id: 'configuracion', label: 'Configuración', icon: 'settings' },
  ];

  // Para la gráfica de barras
  chartMax = computed(() => {
    const views = this.stats()?.dailyViews ?? [];
    return Math.max(...views.map(v => v.views), 1);
  });

  chartBarHeight(views: number): number {
    const max = this.chartMax();
    return max > 0 ? Math.round((views / max) * 80) : 0;
  }

  dayLabel(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00');
    return ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d.getDay()];
  }

  async ngOnInit() {
    await Promise.all([this.loadAll(), this.loadAcademic()]);
  }

  async loadAll() {
    this.loading.set(true);
    try {
      const [statsData, users, projects, reports, config, log] = await Promise.all([
        this.adminService.getStats(),
        this.adminService.getAllUsers(),
        this.adminService.getAllProjects(),
        this.adminService.getReports(false),
        this.adminService.getConfig(),
        this.adminService.getActivityLog(30),
      ]);
      this.stats.set(statsData);
      this.users.set(users.data);
      this.projects.set(projects);
      this.reports.set(reports);
      this.config.set(config);
      this.activityLog.set(log);
    } catch (e: any) {
      this.toast.show(e.message ?? 'Error al cargar datos', 'error');
    } finally {
      this.loading.set(false);
    }
  }

  async loadAcademic() {
    this.academicLoading.set(true);
    try {
      const [sems, subs] = await Promise.all([
        this.academicService.getSemesters(false),
        this.academicService.getSubjects(false),
      ]);
      this.semesters.set(sems);
      this.subjects.set(subs);
    } finally {
      this.academicLoading.set(false);
    }
  }

  async reloadReports() {
    const reports = await this.adminService.getReports(this.showResolvedReports());
    this.reports.set(reports);
  }

  setSection(s: AdminSection) { this.activeSection.set(s); }
  toggleSidebar() { this.sidebarCollapsed.update(v => !v); }

  // ─── Usuarios ────────────────────────────────────────────────────────────────
  async banUser(id: string) {
    await this.adminService.banUser(id);
    this.toast.show('Usuario suspendido', 'success');
    this.users.update(list => list.map(u => u.id === id ? { ...u, banned: true } : u));
  }

  async unbanUser(id: string) {
    await this.adminService.unbanUser(id);
    this.toast.show('Usuario reactivado', 'success');
    this.users.update(list => list.map(u => u.id === id ? { ...u, banned: false } : u));
  }

  async makeAdmin(id: string) {
    if (!confirm('¿Dar permisos de administrador a este usuario?')) return;
    await this.adminService.makeAdmin(id);
    this.toast.show('Permisos de admin asignados', 'success');
    this.users.update(list => list.map(u => u.id === id ? { ...u, is_admin: true } : u));
  }

  async removeAdmin(id: string) {
    if (!confirm('¿Revocar permisos de administrador?')) return;
    await this.adminService.removeAdmin(id);
    this.toast.show('Permisos de admin revocados', 'info');
    this.users.update(list => list.map(u => u.id === id ? { ...u, is_admin: false } : u));
  }

  // ─── Proyectos ───────────────────────────────────────────────────────────────
  async approveProject(id: string) {
    await this.adminService.approveProject(id);
    this.toast.show('Proyecto aprobado y publicado', 'success');
    this.projects.update(list => list.map(p => p.id === id ? { ...p, status: 'active', admin_note: null } : p));
    this.stats.update(s => s ? { ...s, pendingProjects: s.pendingProjects - 1, activeProjects: s.activeProjects + 1 } : s);
  }

  openRejectModal(project: any) {
    this.rejectingProject.set(project);
    this.rejectNote.set('');
  }

  closeRejectModal() {
    this.rejectingProject.set(null);
    this.rejectNote.set('');
  }

  async confirmReject() {
    const p = this.rejectingProject();
    if (!p) return;
    await this.adminService.rejectProject(p.id, this.rejectNote() || undefined);
    this.toast.show('Proyecto rechazado', 'info');
    this.projects.update(list => list.map(proj => proj.id === p.id
      ? { ...proj, status: 'rejected', admin_note: this.rejectNote() || null }
      : proj
    ));
    this.stats.update(s => s ? { ...s, pendingProjects: s.pendingProjects - 1, rejectedProjects: s.rejectedProjects + 1 } : s);
    this.closeRejectModal();
  }

  async featureProject(id: string, featured: boolean) {
    if (featured) {
      await this.adminService.unfeatureProject(id);
      this.toast.show('Quitado de destacados', 'info');
    } else {
      await this.adminService.featureProject(id);
      this.toast.show('Proyecto destacado', 'success');
    }
    this.projects.update(list => list.map(p => p.id === id ? { ...p, featured: !featured } : p));
  }

  async deleteProject(id: string) {
    if (!confirm('¿Eliminar este proyecto permanentemente?')) return;
    await this.adminService.deleteProject(id);
    this.toast.show('Proyecto eliminado', 'success');
    this.projects.update(list => list.filter(p => p.id !== id));
    this.stats.update(s => s ? { ...s, projects: s.projects - 1 } : s);
  }

  openEditProject(project: any) { this.editingProject.set({ ...project }); }
  closeEditProject() { this.editingProject.set(null); }

  viewProject(project: any) { this.viewingProject.set(project); }
  closeViewProject() { this.viewingProject.set(null); }

  async saveProjectAcademic() {
    const p = this.editingProject();
    if (!p) return;
    const { supabase } = await import('../../core/supabase.client');
    const { error } = await supabase
      .from('projects')
      .update({ semester: p.semester || null, subject: p.subject || null })
      .eq('id', p.id);
    if (error) { this.toast.show('Error al guardar', 'error'); return; }
    this.toast.show('Clasificación académica actualizada', 'success');
    this.projects.update(list => list.map(proj => proj.id === p.id ? { ...proj, semester: p.semester, subject: p.subject } : proj));
    this.editingProject.set(null);
  }

  // ─── Reportes ────────────────────────────────────────────────────────────────
  async resolveReport(id: string, action: 'dismiss' | 'remove_project' = 'dismiss') {
    if (action === 'remove_project') {
      const report = this.reports().find(r => r.id === id);
      if (report?.project?.id) {
        await this.adminService.deleteProject(report.project.id);
      }
    }
    await this.adminService.resolveReport(id, action);
    this.toast.show(action === 'remove_project' ? 'Proyecto eliminado y reporte cerrado' : 'Reporte resuelto', 'success');
    this.reports.update(list => list.filter(r => r.id !== id));
    this.stats.update(s => s ? { ...s, pendingReports: Math.max(0, s.pendingReports - 1) } : s);
  }

  async toggleShowResolved() {
    this.showResolvedReports.update(v => !v);
    await this.reloadReports();
  }

  // ─── Configuración ───────────────────────────────────────────────────────────
  async saveConfig() {
    const cfg = this.config();
    if (!cfg) return;
    await this.adminService.saveConfig(cfg);
    this.toast.show('Configuración guardada', 'success');
  }

  // ─── Semestres CRUD ──────────────────────────────────────────────────────────
  async addSemester() {
    if (!this.newSemName.trim() || !this.newSemLabel.trim()) return;
    try {
      await this.academicService.createSemester(this.newSemName, this.newSemLabel, this.newSemOrder);
      this.newSemName = ''; this.newSemLabel = ''; this.newSemOrder = 0;
      await this.loadAcademic();
      this.toast.show('Semestre creado', 'success');
    } catch (e: any) { this.toast.show(e.message, 'error'); }
  }

  startEditSem(s: AcademicSemester) { this.editSem.set({ ...s }); }
  cancelEditSem() { this.editSem.set(null); }

  async saveSemester() {
    const s = this.editSem();
    if (!s) return;
    await this.academicService.updateSemester(s.id, { name: s.name, label: s.label, sort_order: s.sort_order, active: s.active });
    this.editSem.set(null);
    await this.loadAcademic();
    this.toast.show('Semestre actualizado', 'success');
  }

  async deleteSemester(id: number) {
    if (!confirm('¿Eliminar este semestre?')) return;
    await this.academicService.deleteSemester(id);
    await this.loadAcademic();
    this.toast.show('Semestre eliminado', 'info');
  }

  async toggleSemesterActive(s: AcademicSemester) {
    await this.academicService.updateSemester(s.id, { active: !s.active });
    await this.loadAcademic();
  }

  // ─── Materias CRUD ───────────────────────────────────────────────────────────
  async addSubject() {
    if (!this.newSubCat || !this.newSubName.trim()) return;
    try {
      await this.academicService.createSubject(this.newSubCat, this.newSubName, this.newSubOrder);
      this.newSubName = ''; this.newSubOrder = 0;
      await this.loadAcademic();
      this.toast.show('Materia creada', 'success');
    } catch (e: any) { this.toast.show(e.message, 'error'); }
  }

  startEditSub(s: AcademicSubject) { this.editSub.set({ ...s }); }
  cancelEditSub() { this.editSub.set(null); }

  async saveSubject() {
    const s = this.editSub();
    if (!s) return;
    await this.academicService.updateSubject(s.id, { name: s.name, category: s.category, sort_order: s.sort_order, active: s.active });
    this.editSub.set(null);
    await this.loadAcademic();
    this.toast.show('Materia actualizada', 'success');
  }

  async deleteSubject(id: number) {
    if (!confirm('¿Eliminar esta materia?')) return;
    await this.academicService.deleteSubject(id);
    await this.loadAcademic();
    this.toast.show('Materia eliminada', 'info');
  }

  async toggleSubjectActive(s: AcademicSubject) {
    await this.academicService.updateSubject(s.id, { active: !s.active });
    await this.loadAcademic();
  }

  getStatusLabel(status: string | undefined): string {
    if (status === 'active')   return 'Aprobado';
    if (status === 'rejected') return 'Rechazado';
    return 'Pendiente';
  }

  actionLabel(action: string): string {
    const map: Record<string, string> = {
      approve_project:   'Aprobó proyecto',
      reject_project:    'Rechazó proyecto',
      delete_project:    'Eliminó proyecto',
      feature_project:   'Destacó proyecto',
      unfeature_project: 'Quitó destacado',
      ban_user:          'Suspendió usuario',
      unban_user:        'Reactivó usuario',
      make_admin:        'Asignó admin',
      remove_admin:      'Revocó admin',
      resolve_report:    'Resolvió reporte',
    };
    return map[action] ?? action;
  }
}
