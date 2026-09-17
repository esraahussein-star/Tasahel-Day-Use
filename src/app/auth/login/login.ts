import {
  ChangeDetectorRef,
  Component
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  AuthService
} from '../../services/auth.service';


@Component({
  selector: 'app-login',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './login.html',

  styleUrl: './login.css'
})
export class LoginComponent {

  email = '';

  password = '';

  loading = false;

  errorMessage = '';

  showPassword = false;


  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================================================
  // LOGIN
  // =========================================================

  async login(): Promise<void> {

    this.errorMessage = '';


    const email =
      this.email
        .trim()
        .toLowerCase();


    const password =
      this.password;


    if (!email) {

      this.errorMessage =
        'يرجى إدخال البريد الإلكتروني.';

      return;

    }


    if (!password) {

      this.errorMessage =
        'يرجى إدخال كلمة المرور.';

      return;

    }


    this.loading = true;

    this.cdr.markForCheck();


    try {

      await this.authService.signIn(
        email,
        password
      );


      const adminUser =
        await this.authService
          .getCurrentAdminUser();


      if (!adminUser) {

        await this.authService.signOut();

        this.errorMessage =
          'هذا الحساب غير مسجل ضمن مستخدمي النظام.';

        return;

      }


      if (adminUser.active !== true) {

        await this.authService.signOut();

        this.errorMessage =
          'هذا الحساب غير نشط. يرجى التواصل مع مسؤول النظام.';

        return;

      }


      await this.redirectByRole(
        adminUser.role
      );


    } catch (error: any) {

      console.error(
        'Login error:',
        error
      );


      const message =
        String(
          error?.message || ''
        ).toLowerCase();


      if (
        message.includes(
          'invalid login credentials'
        )
      ) {

        this.errorMessage =
          'البريد الإلكتروني أو كلمة المرور غير صحيحة.';

      } else if (
        message.includes(
          'email not confirmed'
        )
      ) {

        this.errorMessage =
          'البريد الإلكتروني غير مؤكد.';

      } else {

        this.errorMessage =
          'تعذر تسجيل الدخول. يرجى المحاولة مرة أخرى.';

      }


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // ROLE ROUTING
  // =========================================================

  private async redirectByRole(
    role: string | null
  ): Promise<void> {

    switch (role) {

      case 'admin':

        await this.router.navigate([
          '/admin'
        ]);

        return;


      case 'manager':

        await this.router.navigate([
          '/manager'
        ]);

        return;


      case 'agent':

        await this.router.navigate([
          '/agent'
        ]);

        return;


      case 'account':

        await this.router.navigate([
          '/account'
        ]);

        return;


      default:

        await this.authService.signOut();

        this.errorMessage =
          'لا توجد صلاحية دخول محددة لهذا الحساب.';

    }

  }


  // =========================================================
  // PASSWORD VISIBILITY
  // =========================================================

  togglePassword(): void {

    this.showPassword =
      !this.showPassword;

  }

}