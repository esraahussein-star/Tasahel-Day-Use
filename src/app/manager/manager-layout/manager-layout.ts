import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import {
  LucideAngularModule,
  LayoutDashboard,
  Users,
  ClipboardList,
  Bell,
  Activity,
  LogOut
} from 'lucide-angular';

import {
  AuthService
} from '../../services/auth.service';

import {
  AdminDashboardService
} from '../../admin/services/admin-dashboard.service';


@Component({
  selector: 'app-manager-layout',

  standalone: true,

  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule
  ],

  templateUrl: './manager-layout.html',

  styleUrl: './manager-layout.css'
})
export class ManagerLayoutComponent implements OnInit {

  currentUser: any = null;

  notifications: any[] = [];

  unreadNotifications = 0;

  notificationsOpen = false;

  loading = true;


  readonly LayoutDashboard =
    LayoutDashboard;

  readonly Users =
    Users;

  readonly ClipboardList =
    ClipboardList;

  readonly Bell =
    Bell;

  readonly Activity =
    Activity;

  readonly LogOut =
    LogOut;


  constructor(
    private authService: AuthService,
    private adminService: AdminDashboardService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  async ngOnInit(): Promise<void> {

    await this.loadLayout();

  }


  // =========================================================
  // LOAD
  // =========================================================

  async loadLayout(): Promise<void> {

    this.loading = true;


    try {

      const user =
        await this.authService
          .getCurrentAdminUser();


      if (
        !user ||
        user.role !== 'manager' ||
        user.active !== true
      ) {

        await this.router.navigate([
          '/login'
        ]);

        return;

      }


      this.currentUser = user;


      const notifications =
        await this.adminService
          .getUserNotifications(
            user.id
          );


      this.notifications =
        notifications || [];


      this.unreadNotifications =
        this.notifications.filter(
          notification =>
            notification.read === false
        ).length;


    } catch (error) {

      console.error(
        'Manager layout loading error:',
        error
      );


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  toggleNotifications(
    event: MouseEvent
  ): void {

    event.stopPropagation();

    this.notificationsOpen =
      !this.notificationsOpen;

  }


  closeNotifications(): void {

    this.notificationsOpen = false;

  }


  stopDropdownClick(
    event: MouseEvent
  ): void {

    event.stopPropagation();

  }


  @HostListener(
    'document:click'
  )
  onDocumentClick(): void {

    this.notificationsOpen = false;

  }


  async openNotification(
    notification: any
  ): Promise<void> {

    try {

      if (
        notification &&
        notification.read === false
      ) {

        await this.adminService
          .markNotificationAsRead(
            notification.id
          );


        notification.read = true;


        this.unreadNotifications =
          Math.max(
            0,
            this.unreadNotifications - 1
          );

      }


      this.notificationsOpen = false;


      if (
        notification?.request_id
      ) {

        await this.router.navigate([
          '/manager/assignments'
        ]);

      }


    } catch (error) {

      console.error(
        'Manager notification error:',
        error
      );

    }

  }


  async markAllNotificationsRead():
    Promise<void> {

    if (
      !this.currentUser?.id ||
      this.unreadNotifications === 0
    ) {

      return;

    }


    try {

      await this.adminService
        .markAllNotificationsAsRead(
          this.currentUser.id
        );


      this.notifications =
        this.notifications.map(
          notification => ({
            ...notification,
            read: true
          })
        );


      this.unreadNotifications = 0;

      this.cdr.markForCheck();


    } catch (error) {

      console.error(
        'Manager mark notifications error:',
        error
      );

    }

  }


  // =========================================================
  // DATE
  // =========================================================

  getNotificationTime(
    createdAt: string
  ): string {

    if (!createdAt) {
      return '';
    }


    const created =
      new Date(createdAt);

    const now =
      new Date();


    const difference =
      now.getTime() -
      created.getTime();


    const minutes =
      Math.floor(
        difference / 60000
      );


    if (
      minutes < 1
    ) {

      return 'الآن';

    }


    if (
      minutes < 60
    ) {

      return `منذ ${minutes} دقيقة`;

    }


    const hours =
      Math.floor(
        minutes / 60
      );


    if (
      hours < 24
    ) {

      return `منذ ${hours} ساعة`;

    }


    const days =
      Math.floor(
        hours / 24
      );


    if (
      days < 7
    ) {

      return `منذ ${days} يوم`;

    }


    return created.toLocaleDateString(
      'ar-EG'
    );

  }


  // =========================================================
  // LOGOUT
  // =========================================================

  async logout(): Promise<void> {

    try {

      await this.authService
        .signOut();


      await this.router.navigate([
        '/login'
      ]);


    } catch (error) {

      console.error(
        'Manager logout error:',
        error
      );

    }

  }


  // =========================================================
  // TRACK BY
  // =========================================================

  trackByNotificationId(
    index: number,
    notification: any
  ): string | number {

    return (
      notification?.id ||
      index
    );

  }

}