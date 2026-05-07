import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, PlatformConfig } from '../../core/services/admin.service';
import { AcademicService, AcademicSemester, AcademicSubject } from '../../core/services/academic.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { CATEGORIES } from '../../core/models/models';

type AdminSection = 'dashboard' | 'usuarios' | 'proyectos' | 'reportes' | 'academico' | 'configuracion';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  private adminService   = inject(AdminService);
  private academicService = inject(AcademicService);
  auth = inject(AuthService);
  private toast = inject(ToastService);

  activeSection    = signal<AdminSection>('dashboard');
  sidebarCollapsed = signal(false);
  loading          = signal(true);

  users    = signal<any[]>([]);
  projects = signal<any[]>([]);
  reports  = signal<any[]>([]);
  config   = signal<PlatformConfig | null>(null);

  // ─── Académico ──────────────────────────────────────────────────────────────
  semesters        = signal<AcademicSemester[]>([]);
  subjects         = signal<AcademicSubject[]>([]);
  academicLoading  = signal(false);
  categories       = CATEGORIES;

  // Semestre form
  newSemName   = '';
  newSemLabel  = '';
  newSemOrder  = 0;
  editSem      = signal<AcademicSemester | null>(null);

  // Materia form
  newSubCat    = '';
  newSubName   = '';
  newSubOrder  = 0;
  editSub      = signal<AcademicSubject | null>(null);

  subjectsByCategory = computed(() => this.academicService.groupByCategory(this.subjects()));

  // ─── Editar proyecto ────────────────────────────────────────────────────────
  editingProject   = signal<any | null>(null);
  projectSemesters = computed(() => this.semesters().map(s => s.name));
  projectSubjects  = computed(() => {
    const cat = this.editingProject()?.category;
    if (!cat) return [];
    return (this.subjectsByCategory()[cat] ?? []).map((s: AcademicSubject) => s.name);
  });

  stats = signal([
    { label: 'Usuarios',  value: '0', change: '', up: true,  icon: 'users' },
    { label: 'Proyectos', value: '0', change: '', up: true,  icon: 'grid'  },
    { label: 'Visitas',   value: '0', change: '', up: true,  icon: 'eye'   },
    { label: 'Reportes',  value: '0', change: '', up: false, icon: 'flag'  },
  ]);

  chartBars = [
    { day: 'L', height: 45 }, { day: 'M', height: 72 }, { day: 'X', height: 58 },
    { day: 'J', height: 88 }, { day: 'V', height: 95 }, { day: 'S', height: 67 },
    { day: 'D', height: 40 },
  ];

  navItems: { id: AdminSection; label: string; icon: string }[] = [
    { id: 'dashboard',     label: 'Dashboard',     icon: 'home'     },
    { id: 'usuarios',      label: 'Usuarios',      icon: 'users'    },
    { id: 'proyectos',     label: 'Proyectos',     icon: 'grid'     },
    { id: 'reportes',      label: 'Reportes',      icon: 'flag'     },
    { id: 'academico',     label: 'Académico',     icon: 'book'     },
    { id: 'configuracion', label: 'Configuración', icon: 'settings' },
  ];

  async ngOnInit() {
    await Promise.all([this.loadAll(), this.loadAcademic()]);
  }

  private async loadAll() {
    this.loading.set(true);
    try {
      const [statsData, users, projects, reports, config] = await Promise.all([
        this.adminService.getStats(),
        this.adminService.getAllUsers(),
        this.adminService.getAllProjects(),
        this.adminService.getReports(),
        this.adminService.getConfig(),
      ]);
      this.stats.set([
        { label: 'Usuarios',  value: String(statsData.users),          change: '', up: true,  icon: 'users' },
        { label: 'Proyectos', value: String(statsData.projects),       change: '', up: true,  icon: 'grid'  },
        { label: 'Visitas',   value: String(statsData.totalViews),     change: '', up: true,  icon: 'eye'   },
        { label: 'Reportes',  value: String(statsData.pendingReports), change: '', up: false, icon: 'flag'  },
      ]);
      this.users.set(users);
      this.projects.set(projects);
      this.reports.set(reports);
      this.config.set(config);
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

  setSection(s: AdminSection) { this.activeSection.set(s); }
  toggleSidebar() { this.sidebarCollapsed.update(v => !v); }

  // ─── Usuarios ───────────────────────────────────────────────────────────────
  async banUser(id: string) {
    await this.adminService.banUser(id);
    this.toast.show('Usuario suspendido', 'success');
    await this.loadAll();
  }
  async unbanUser(id: string) {
    await this.adminService.unbanUser(id);
    this.toast.show('Usuario reactivado', 'success');
    await this.loadAll();
  }

  // ─── Proyectos ───────────────────────────────────────────────────────────────
  async approveProject(id: string) {
    await this.adminService.approveProject(id);
    this.toast.show('Proyecto aprobado', 'success');
    await this.loadAll();
  }
  async rejectProject(id: string) {
    await this.adminService.rejectProject(id);
    this.toast.show('Proyecto rechazado', 'info');
    await this.loadAll();
  }
  async featureProject(id: string, featured: boolean) {
    if (featured) {
      await this.adminService.unfeatureProject(id);
      this.toast.show('Proyecto quitado de destacados', 'info');
    } else {
      await this.adminService.featureProject(id);
      this.toast.show('Proyecto destacado', 'success', '⭐');
    }
    await this.loadAll();
  }
  async deleteProject(id: string) {
    if (!confirm('¿Eliminar este proyecto permanentemente?')) return;
    await this.adminService.deleteProject(id);
    this.toast.show('Proyecto eliminado', 'success');
    await this.loadAll();
  }

  openEditProject(project: any) {
    this.editingProject.set({ ...project });
  }
  closeEditProject() { this.editingProject.set(null); }

  async saveProjectAcademic() {
    const p = this.editingProject();
    if (!p) return;
    const { error } = await (await import('../../core/supabase.client')).supabase
      .from('projects')
      .update({ semester: p.semester || null, subject: p.subject || null })
      .eq('id', p.id);
    if (error) { this.toast.show('Error al guardar', 'error'); return; }
    this.toast.show('Proyecto actualizado', 'success');
    this.editingProject.set(null);
    await this.loadAll();
  }

  // ─── Reportes ────────────────────────────────────────────────────────────────
  async resolveReport(id: string) {
    await this.adminService.resolveReport(id);
    this.toast.show('Reporte resuelto', 'success');
    await this.loadAll();
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
    return status === 'active' ? 'Activo' : status === 'rejected' ? 'Rechazado' : 'Pendiente';
  }
}
