import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  LucideAngularModule,
  Plus,
  Search,
  Pencil,
  Power,
  X,
  Eye,
  EyeOff,
  Copy,
  RefreshCw
} from 'lucide-angular';

import {
  SupabaseService
} from '../../services/supabase.service';


type StaffRole =
  | 'admin'
  | 'manager'
  | 'agent'
  | 'account';

type StatusFilter =
  | 'all'
  | 'active'
  | 'inactive';


@Component({
  selector: 'app-admin-users',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],

  templateUrl:
    './admin-users.html',

  styleUrl:
    './admin-users.css'
})
export class AdminUsersComponent
implements OnInit {

  readonly Plus = Plus;
  readonly Search = Search;
  readonly Pencil = Pencil;
  readonly Power = Power;
  readonly X = X;
  readonly Eye = Eye;
  readonly EyeOff = EyeOff;
  readonly Copy = Copy;
  readonly RefreshCw = RefreshCw;


  users: any[] = [];

  loading = true;
  saving = false;

  errorMessage = '';
  successMessage = '';

  showUserModal = false;
  showPassword = false;
  copiedPassword = false;

  modalMode:
    'create' | 'edit' =
      'create';

  editingUser: any | null = null;


  searchTerm = '';
  roleFilter = 'all';

  statusFilter:
    StatusFilter =
      'all';


  form = {
    full_name: '',
    email: '',
    password: '',
    role: 'agent' as StaffRole,
    max_open_requests: 10,
    max_active_requests: 10
  };


  constructor(
    private supabaseService:
      SupabaseService,

    private cdr:
      ChangeDetectorRef
  ) {}


  async ngOnInit():
  Promise<void> {

    await this.loadUsers();

  }


  // =========================================================
  // LOAD USERS
  // =========================================================

  async loadUsers():
  Promise<void> {

    this.loading = true;
    this.errorMessage = '';

    try {

      const {
        data,
        error
      } =
        await this.supabaseService
          .client
          .from('admin_users')
          .select('*')
          .order(
            'created_at',
            {
              ascending: false
            }
          );


      if (error) {
        throw error;
      }


      this.users =
        data || [];


    } catch (error) {

      console.error(
        'Load users error:',
        error
      );

      this.errorMessage =
        'تعذر تحميل المستخدمين.';

    } finally {

      this.loading = false;

      this.cdr
        .markForCheck();

    }

  }


  // =========================================================
  // FILTERS
  // =========================================================

  get filteredUsers():
  any[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.users.filter(
      user => {

        const matchesSearch =
          !search
          ||
          String(
            user.full_name || ''
          )
            .toLowerCase()
            .includes(search)
          ||
          String(
            user.email || ''
          )
            .toLowerCase()
            .includes(search);


        const matchesRole =
          this.roleFilter === 'all'
          ||
          user.role ===
            this.roleFilter;


        const matchesStatus =
          this.statusFilter === 'all'
          ||
          (
            this.statusFilter === 'active'
            &&
            user.active === true
          )
          ||
          (
            this.statusFilter === 'inactive'
            &&
            user.active !== true
          );


        return (
          matchesSearch
          &&
          matchesRole
          &&
          matchesStatus
        );

      }
    );

  }


  // =========================================================
  // CREATE MODAL
  // =========================================================

  openCreateModal():
  void {

    this.modalMode =
      'create';

    this.editingUser =
      null;

    this.errorMessage =
      '';

    this.successMessage =
      '';

    this.showPassword =
      true;

    this.copiedPassword =
      false;


    this.form = {
      full_name: '',
      email: '',
      password:
        this.generatePasswordValue(),
      role: 'agent',
      max_open_requests: 10,
      max_active_requests: 10
    };


    this.showUserModal =
      true;

  }


  // =========================================================
  // EDIT MODAL
  // =========================================================

  editUser(
    user: any
  ):
  void {

    this.modalMode =
      'edit';

    this.editingUser =
      user;

    this.errorMessage =
      '';

    this.successMessage =
      '';

    this.showPassword =
      false;

    this.copiedPassword =
      false;


    this.form = {
      full_name:
        user.full_name || '',
      email:
        user.email || '',
      password: '',
      role:
        user.role || 'agent',
      max_open_requests:
        Number(
          user.max_open_requests || 10
        ),
      max_active_requests:
        Number(
          user.max_active_requests || 10
        )
    };


    this.showUserModal =
      true;

  }


  closeUserModal():
  void {

    if (this.saving) {
      return;
    }

    this.showUserModal =
      false;

    this.errorMessage =
      '';

    this.copiedPassword =
      false;

  }


  // =========================================================
  // SAVE USER
  // =========================================================

  async saveUser():
  Promise<void> {

    if (this.saving) {
      return;
    }


    if (
      this.modalMode === 'create'
    ) {

      await this.createUser();
      return;

    }


    await this.updateUser();

  }


  // =========================================================
  // CREATE USER
  // =========================================================

  private async createUser():
  Promise<void> {

    const validationError =
      this.validateForm(true);

    if (validationError) {
      this.errorMessage =
        validationError;
      return;
    }


    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';


    try {

      const payload: any = {
        full_name:
          this.form.full_name.trim(),
        email:
          this.form.email
            .trim()
            .toLowerCase(),
        password:
          this.form.password,
        role:
          this.form.role
      };


      if (
        this.form.role === 'agent'
      ) {

        payload.max_open_requests =
          Number(
            this.form.max_open_requests || 10
          );

        payload.max_active_requests =
          Number(
            this.form.max_active_requests || 10
          );

      }


      const {
        data,
        error
      } =
        await this.supabaseService
          .client
          .functions
          .invoke(
            'create-staff-user',
            {
              body: payload
            }
          );


      if (error) {
        throw error;
      }


      if (!data?.success) {

        throw new Error(
          data?.error ||
          'CREATE_USER_FAILED'
        );

      }


      await this.loadUsers();

      this.showUserModal =
        false;

      this.successMessage =
        'تم إنشاء المستخدم بنجاح.';


    } catch (error: any) {

      console.error(
        'Create user error:',
        error
      );

      const message =
        String(
          error?.message || ''
        );


      if (
        message.includes(
          'EMAIL_ALREADY_EXISTS'
        )
      ) {

        this.errorMessage =
          'البريد الإلكتروني مستخدم بالفعل.';

      } else if (
        message.includes(
          'PASSWORD_TOO_SHORT'
        )
      ) {

        this.errorMessage =
          'كلمة المرور يجب ألا تقل عن 8 أحرف.';

      } else if (
        message.includes(
          'ADMIN_ONLY'
        )
      ) {

        this.errorMessage =
          'ليس لديك صلاحية لإنشاء مستخدم.';

      } else {

        this.errorMessage =
          'تعذر إنشاء المستخدم.';

      }


    } finally {

      this.saving = false;

      this.cdr
        .markForCheck();

    }

  }


  // =========================================================
  // UPDATE USER
  // =========================================================

  private async updateUser():
  Promise<void> {

    if (!this.editingUser) {
      return;
    }


    const validationError =
      this.validateForm(false);

    if (validationError) {
      this.errorMessage =
        validationError;
      return;
    }


    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';


    try {

      const payload: any = {
        user_id:
          this.editingUser.id,

        auth_user_id:
          this.editingUser.auth_user_id
          ||
          this.editingUser.id,

        full_name:
          this.form.full_name.trim(),

        role:
          this.form.role,

        active:
          this.editingUser.active !== false,

        max_open_requests:
          Number(
            this.form.max_open_requests || 10
          ),

        max_active_requests:
          Number(
            this.form.max_active_requests || 10
          )
      };


      if (
        this.form.password.trim()
      ) {

        payload.password =
          this.form.password;

      }


      const {
        data,
        error
      } =
        await this.supabaseService
          .client
          .functions
          .invoke(
            'update-staff-user',
            {
              body: payload
            }
          );


      if (error) {
        throw error;
      }


      if (!data?.success) {

        throw new Error(
          data?.error ||
          'UPDATE_USER_FAILED'
        );

      }


      await this.loadUsers();

      this.showUserModal =
        false;

      this.successMessage =
        'تم تعديل المستخدم بنجاح.';


    } catch (error: any) {

      console.error(
        'Update user error:',
        error
      );

      const message =
        String(
          error?.message || ''
        );


      if (
        message.includes(
          'PASSWORD_TOO_SHORT'
        )
      ) {

        this.errorMessage =
          'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.';

      } else if (
        message.includes(
          'ADMIN_ONLY'
        )
      ) {

        this.errorMessage =
          'ليس لديك صلاحية لتعديل المستخدم.';

      } else {

        this.errorMessage =
          'تعذر تعديل المستخدم.';

      }


    } finally {

      this.saving = false;

      this.cdr
        .markForCheck();

    }

  }


  // =========================================================
  // VALIDATION
  // =========================================================

  private validateForm(
    requirePassword: boolean
  ):
  string {

    if (
      !this.form.full_name.trim()
    ) {
      return 'اكتبي اسم المستخدم.';
    }


    if (
      !this.form.email.trim()
    ) {
      return 'اكتبي البريد الإلكتروني.';
    }


    if (
      requirePassword
      &&
      this.form.password.length < 8
    ) {
      return 'كلمة المرور يجب ألا تقل عن 8 أحرف.';
    }


    if (
      !requirePassword
      &&
      this.form.password
      &&
      this.form.password.length < 8
    ) {
      return 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف.';
    }


    return '';

  }


  // =========================================================
  // PASSWORD
  // =========================================================

  togglePasswordVisibility():
  void {

    this.showPassword =
      !this.showPassword;

  }


  generatePassword():
  void {

    this.form.password =
      this.generatePasswordValue();

    this.showPassword =
      true;

    this.copiedPassword =
      false;

  }


  private generatePasswordValue():
  string {

    const upper =
      'ABCDEFGHJKLMNPQRSTUVWXYZ';

    const lower =
      'abcdefghijkmnopqrstuvwxyz';

    const numbers =
      '23456789';

    const symbols =
      '@#$!%*?';

    const all =
      upper +
      lower +
      numbers +
      symbols;


    const chars = [
      this.pickRandom(upper),
      this.pickRandom(lower),
      this.pickRandom(numbers),
      this.pickRandom(symbols)
    ];


    while (
      chars.length < 12
    ) {

      chars.push(
        this.pickRandom(all)
      );

    }


    for (
      let i = chars.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() *
          (i + 1)
        );

      [
        chars[i],
        chars[j]
      ] = [
        chars[j],
        chars[i]
      ];

    }


    return chars.join('');

  }


  private pickRandom(
    source: string
  ):
  string {

    return source[
      Math.floor(
        Math.random() *
        source.length
      )
    ];

  }


  async copyPassword():
  Promise<void> {

    if (!this.form.password) {
      return;
    }


    try {

      await navigator
        .clipboard
        .writeText(
          this.form.password
        );

      this.copiedPassword =
        true;


      window.setTimeout(
        () => {

          this.copiedPassword =
            false;

          this.cdr
            .markForCheck();

        },
        1500
      );


    } catch (error) {

      console.error(
        'Copy password error:',
        error
      );

    }

  }


  // =========================================================
  // TOGGLE ACTIVE
  // =========================================================

  async toggleActive(
    user: any
  ):
  Promise<void> {

    const nextActive =
      !user.active;


    const {
      error
    } =
      await this.supabaseService
        .client
        .from('admin_users')
        .update({
          active:
            nextActive,
          updated_at:
            new Date()
              .toISOString()
        })
        .eq(
          'id',
          user.id
        );


    if (error) {

      console.error(
        'Toggle user error:',
        error
      );

      this.errorMessage =
        'تعذر تحديث حالة المستخدم.';

      return;

    }


    user.active =
      nextActive;

    user.updated_at =
      new Date()
        .toISOString();

  }


  // =========================================================
  // HELPERS
  // =========================================================

  getRoleLabel(
    role:
      string |
      null |
      undefined
  ):
  string {

    if (role === 'admin') {
      return 'Admin';
    }

    if (role === 'manager') {
      return 'Manager';
    }

    if (role === 'agent') {
      return 'Agent';
    }

    if (role === 'account') {
      return 'Account';
    }

    return role || '-';

  }


  formatDate(
    value:
      string |
      null |
      undefined
  ):
  string {

    if (!value) {
      return '-';
    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '-';
    }


    return date
      .toLocaleDateString(
        'ar-EG',
        {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }
      );

  }


  trackByUserId(
    index: number,
    user: any
  ):
  string | number {

    return (
      user?.id ||
      index
    );

  }

}
