import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AdminDashboardService
} from '../services/admin-dashboard.service';


type AdminRole =
  | 'admin'
  | 'manager'
  | 'agent'
  | 'account';

type RoleFilter =
  | 'all'
  | AdminRole;

type StatusFilter =
  | 'all'
  | 'active'
  | 'inactive';


interface AdminUser {

  id: string;

  auth_user_id?: string | null;

  full_name: string;

  email: string;

  phone?: string | null;

  role: AdminRole;

  active: boolean;

  max_active_requests: number;

  created_at?: string;

  updated_at?: string;

}


interface TeamForm {

  full_name: string;

  email: string;

  phone: string;

  role: AdminRole;

  active: boolean;

  max_active_requests: number;

}


@Component({
  selector: 'app-admin-team',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './team.html',

  styleUrl: './team.css'
})
export class AdminTeamComponent implements OnInit {

  // =========================================================
  // DATA
  // =========================================================

  users: AdminUser[] = [];

  loading = true;

  saving = false;

  errorMessage = '';

  saveError = '';


  // =========================================================
  // FILTERS
  // =========================================================

  searchTerm = '';

  roleFilter: RoleFilter = 'all';

  statusFilter: StatusFilter = 'all';


  readonly roles: {
    value: AdminRole;
    label: string;
    description: string;
  }[] = [

    {
      value: 'admin',
      label: 'مسؤول النظام',
      description: 'صلاحيات كاملة لإدارة النظام'
    },

    {
      value: 'manager',
      label: 'مدير',
      description: 'متابعة الفريق وتوزيع الطلبات'
    },

    {
      value: 'agent',
      label: 'موظف خدمة العملاء',
      description: 'متابعة العملاء والطلبات المسندة'
    },

    {
      value: 'account',
      label: 'الحسابات',
      description: 'مراجعة الحسابات والمدفوعات'
    }

  ];


  // =========================================================
  // PAGINATION
  // =========================================================

  currentPage = 1;

  readonly pageSize = 10;


  // =========================================================
  // DRAWER
  // =========================================================

  drawerOpen = false;

  editingUser: AdminUser | null = null;


  form: TeamForm =
    this.createEmptyForm();


  constructor(
    private adminService:
      AdminDashboardService,

    private cdr:
      ChangeDetectorRef
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  async ngOnInit(): Promise<void> {

    await this.loadUsers();

  }


  // =========================================================
  // LOAD USERS
  // =========================================================

  async loadUsers(): Promise<void> {

    this.loading = true;

    this.errorMessage = '';

    this.cdr.markForCheck();


    try {

      const result =
        await this.adminService
          .getAdminUsers();


      this.users =
        Array.isArray(result)
          ? [...result]
          : [];


      this.currentPage = 1;


    } catch (error) {

      console.error(
        'Team loading error:',
        error
      );


      this.users = [];


      this.errorMessage =
        'تعذر تحميل بيانات فريق العمل. يرجى المحاولة مرة أخرى.';


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // FILTERED USERS
  // =========================================================

  get filteredUsers(): AdminUser[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.users.filter(
      user => {

        const fullName =
          String(
            user.full_name || ''
          ).toLowerCase();


        const email =
          String(
            user.email || ''
          ).toLowerCase();


        const phone =
          String(
            user.phone || ''
          ).toLowerCase();


        const role =
          String(
            user.role || ''
          ).toLowerCase();


        const matchesSearch =
          !search ||
          fullName.includes(search) ||
          email.includes(search) ||
          phone.includes(search) ||
          role.includes(search);


        const matchesRole =
          this.roleFilter === 'all'
            ? true
            : user.role ===
              this.roleFilter;


        let matchesStatus = true;


        if (
          this.statusFilter === 'active'
        ) {

          matchesStatus =
            user.active === true;

        }


        if (
          this.statusFilter === 'inactive'
        ) {

          matchesStatus =
            user.active === false;

        }


        return (
          matchesSearch &&
          matchesRole &&
          matchesStatus
        );

      }
    );

  }


  // =========================================================
  // PAGINATION
  // =========================================================

  get paginatedUsers(): AdminUser[] {

    const start =
      (
        this.currentPage - 1
      ) * this.pageSize;


    return this.filteredUsers.slice(
      start,
      start + this.pageSize
    );

  }


  get totalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.filteredUsers.length /
        this.pageSize
      )
    );

  }


  get pageStart(): number {

    if (
      this.filteredUsers.length === 0
    ) {

      return 0;

    }


    return (
      (
        this.currentPage - 1
      ) * this.pageSize
    ) + 1;

  }


  get pageEnd(): number {

    return Math.min(
      this.currentPage *
      this.pageSize,

      this.filteredUsers.length
    );

  }


  previousPage(): void {

    if (
      this.currentPage > 1
    ) {

      this.currentPage--;

    }

  }


  nextPage(): void {

    if (
      this.currentPage <
      this.totalPages
    ) {

      this.currentPage++;

    }

  }


  // =========================================================
  // SEARCH / FILTER
  // =========================================================

  onSearchChange(
    value: string
  ): void {

    this.searchTerm = value;

    this.currentPage = 1;

  }


  setRoleFilter(
    role: RoleFilter
  ): void {

    this.roleFilter = role;

    this.currentPage = 1;

  }


  setStatusFilter(
    status: StatusFilter
  ): void {

    this.statusFilter = status;

    this.currentPage = 1;

  }


  clearFilters(): void {

    this.searchTerm = '';

    this.roleFilter = 'all';

    this.statusFilter = 'all';

    this.currentPage = 1;

  }


  // =========================================================
  // COUNTS
  // =========================================================

  get totalUsers(): number {

    return this.users.length;

  }


  get activeUsers(): number {

    return this.users.filter(
      user => user.active
    ).length;

  }


  get inactiveUsers(): number {

    return this.users.filter(
      user => !user.active
    ).length;

  }


  get agentsCount(): number {

    return this.users.filter(
      user =>
        user.role === 'agent'
    ).length;

  }


  get managersCount(): number {

    return this.users.filter(
      user =>
        user.role === 'manager'
    ).length;

  }


  getRoleCount(
    role: RoleFilter
  ): number {

    if (
      role === 'all'
    ) {

      return this.users.length;

    }


    return this.users.filter(
      user =>
        user.role === role
    ).length;

  }


  // =========================================================
  // CREATE
  // =========================================================

  openCreate(): void {

    this.editingUser = null;

    this.saveError = '';

    this.form =
      this.createEmptyForm();

    this.drawerOpen = true;

  }


  // =========================================================
  // EDIT
  // =========================================================

  openEdit(
    user: AdminUser
  ): void {

    this.editingUser = user;

    this.saveError = '';


    this.form = {

      full_name:
        user.full_name || '',

      email:
        user.email || '',

      phone:
        user.phone || '',

      role:
        user.role || 'agent',

      active:
        user.active !== false,

      max_active_requests:
        Number(
          user.max_active_requests ||
          10
        )

    };


    this.drawerOpen = true;

  }


  // =========================================================
  // CLOSE
  // =========================================================

  closeDrawer(): void {

    if (
      this.saving
    ) {

      return;

    }


    this.drawerOpen = false;

    this.editingUser = null;

    this.saveError = '';

  }


  // =========================================================
  // SAVE
  // =========================================================

  async saveUser(): Promise<void> {

    this.saveError = '';


    const fullName =
      this.form.full_name
        .trim();


    const email =
      this.form.email
        .trim()
        .toLowerCase();


    if (
      !fullName
    ) {

      this.saveError =
        'يرجى إدخال اسم المستخدم.';

      return;

    }


    if (
      !email
    ) {

      this.saveError =
        'يرجى إدخال البريد الإلكتروني.';

      return;

    }


    const payload = {

      full_name:
        fullName,

      email,

      phone:
        this.form.phone
          .trim() || null,

      role:
        this.form.role,

      active:
        this.form.active,

      max_active_requests:
        Math.max(
          0,
          Number(
            this.form.max_active_requests ||
            0
          )
        )

    };


    this.saving = true;

    this.cdr.markForCheck();


    try {

      if (
        this.editingUser
      ) {

        await this.adminService
          .updateAdminUser(
            this.editingUser.id,
            payload
          );

      } else {

        await this.adminService
          .createAdminUser(
            payload
          );

      }


      this.drawerOpen = false;

      this.editingUser = null;


      await this.loadUsers();


    } catch (error) {

      console.error(
        'Team save error:',
        error
      );


      this.saveError =
        'تعذر حفظ بيانات المستخدم. يرجى المحاولة مرة أخرى.';


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // ROLE LABEL
  // =========================================================

  getRoleLabel(
    role:
      string |
      null |
      undefined
  ): string {

    const found =
      this.roles.find(
        item =>
          item.value === role
      );


    return (
      found?.label ||
      'غير محدد'
    );

  }


  getRoleDescription(
    role:
      string |
      null |
      undefined
  ): string {

    const found =
      this.roles.find(
        item =>
          item.value === role
      );


    return (
      found?.description ||
      'لا يوجد وصف للدور'
    );

  }


  // =========================================================
  // TRACK BY
  // =========================================================

  trackByUserId(
    index: number,
    user: AdminUser
  ): string | number {

    return (
      user?.id ||
      index
    );

  }


  // =========================================================
  // EMPTY FORM
  // =========================================================

  private createEmptyForm():
    TeamForm {

    return {

      full_name: '',

      email: '',

      phone: '',

      role: 'agent',

      active: true,

      max_active_requests: 10

    };

  }

}