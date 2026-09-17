import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import {
  RealtimeChannel
} from '@supabase/supabase-js';

import {
  LucideAngularModule,
  LayoutDashboard,
  ClipboardList,
  Bell,
  LogOut,
  History,
  MapPin,
  BookOpen
} from 'lucide-angular';

import {
  AuthService
} from '../../services/auth.service';

import {
  AgentWorkspaceService
} from '../services/agent-workspace.service';


@Component({
  selector: 'app-agent-layout',

  standalone: true,

  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule
  ],

  templateUrl: './agent-layout.html',

  styleUrl: './agent-layout.css'
})
export class AgentLayoutComponent
implements OnInit, OnDestroy {

  // =========================================================
  // USER
  // =========================================================

  currentUser: any = null;


  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  notifications: any[] = [];

  notificationsOpen = false;

  loading = true;


  private notificationChannel:
    RealtimeChannel | null =
      null;


  // =========================================================
  // ICONS
  // =========================================================

  readonly LayoutDashboard =
    LayoutDashboard;

  readonly ClipboardList =
    ClipboardList;

  readonly Bell =
    Bell;

  readonly LogOut =
    LogOut;

  readonly History =
    History;

  readonly MapPin =
    MapPin;

  readonly BookOpen =
    BookOpen;


  constructor(
    private authService:
      AuthService,

    private workspaceService:
      AgentWorkspaceService,

    private router:
      Router,

    private cdr:
      ChangeDetectorRef
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  async ngOnInit():
    Promise<void> {

    await this.loadLayout();

  }


  // =========================================================
  // DESTROY
  // =========================================================

  async ngOnDestroy():
    Promise<void> {

    await this.workspaceService
      .removeChannel(
        this.notificationChannel
      );

  }


  // =========================================================
  // LOAD LAYOUT
  // =========================================================

  async loadLayout():
    Promise<void> {

    this.loading = true;

    this.cdr.markForCheck();


    try {

      const user =
        await this.authService
          .getCurrentAdminUser();


      if (
        !user ||
        user.role !== 'agent' ||
        user.active !== true
      ) {

        await this.router.navigate([
          '/login'
        ]);

        return;

      }


      this.currentUser = user;


      // ===============================================
      // LOAD NOTIFICATIONS
      // ===============================================

      this.notifications =
        await this.workspaceService
          .getNotifications(
            user.id
          );


      // ===============================================
      // REALTIME
      // ===============================================

      await this.workspaceService
        .removeChannel(
          this.notificationChannel
        );


      this.notificationChannel =
        this.workspaceService
          .subscribeToNotifications(
            user.id,
            notification => {

              const alreadyExists =
                this.notifications.some(
                  item =>
                    item.id ===
                    notification.id
                );


              if (
                alreadyExists
              ) {

                return;

              }


              this.notifications = [

                notification,

                ...this.notifications

              ];


              this.cdr.detectChanges();

            }
          );


    } catch (error) {

      console.error(
        'Agent layout loading error:',
        error
      );


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // UNREAD
  // =========================================================

  get unreadNotifications():
    number {

    return this.notifications
      .filter(
        notification =>
          notification.read !== true
      )
      .length;

  }


  // =========================================================
  // TOGGLE NOTIFICATIONS
  // =========================================================

  toggleNotifications(
    event: MouseEvent
  ): void {

    event.stopPropagation();


    this.notificationsOpen =
      !this.notificationsOpen;

  }


  // =========================================================
  // STOP DROPDOWN CLICK
  // =========================================================

  stopDropdownClick(
    event: MouseEvent
  ): void {

    event.stopPropagation();

  }


  // =========================================================
  // OUTSIDE CLICK
  // =========================================================

  @HostListener(
    'document:click'
  )
  closeNotifications():
    void {

    this.notificationsOpen =
      false;

  }


  // =========================================================
  // OPEN NOTIFICATION
  // =========================================================

  async openNotification(
    notification: any
  ): Promise<void> {

    try {

      if (
        !notification.read
      ) {

        await this.workspaceService
          .markNotificationRead(
            notification.id
          );


        notification.read =
          true;

      }


      this.notificationsOpen =
        false;


      // ===============================================
      // REQUEST RELATED NOTIFICATION
      // ===============================================

      if (
        notification.request_id
      ) {

        await this.router.navigate(
          [
            '/agent/requests'
          ],
          {
            queryParams: {
              request:
                notification.request_id
            }
          }
        );


        this.cdr.markForCheck();

        return;

      }


      // ===============================================
      // DEFAULT
      // ===============================================

      await this.router.navigate([
        '/agent'
      ]);


    } catch (error) {

      console.error(
        'Open notification error:',
        error
      );

    }


    this.cdr.markForCheck();

  }


  // =========================================================
  // MARK ALL READ
  // =========================================================

  async markAllNotificationsRead():
    Promise<void> {

    if (
      !this.currentUser?.id
    ) {

      return;

    }


    try {

      await this.workspaceService
        .markAllNotificationsRead(
          this.currentUser.id
        );


      this.notifications =
        this.notifications.map(
          notification => ({
            ...notification,
            read: true
          })
        );


    } catch (error) {

      console.error(
        'Mark notifications read error:',
        error
      );

    }


    this.cdr.markForCheck();

  }


  // =========================================================
  // TIME LABEL
  // =========================================================

  getNotificationTime(
    value:
      string |
      null |
      undefined
  ): string {

    if (!value) {

      return '';

    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '';

    }


    const diff =
      Date.now() -
      date.getTime();


    const seconds =
      Math.floor(
        diff / 1000
      );


    if (
      seconds < 60
    ) {

      return 'الآن';

    }


    const minutes =
      Math.floor(
        seconds / 60
      );


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


    return date.toLocaleDateString(
      'ar-EG',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }
    );

  }


  // =========================================================
  // LOGOUT
  // =========================================================

  async logout():
    Promise<void> {

    try {

      await this.workspaceService
        .removeChannel(
          this.notificationChannel
        );


      this.notificationChannel =
        null;


      await this.authService
        .signOut();


      await this.router.navigate([
        '/login'
      ]);


    } catch (error) {

      console.error(
        'Agent logout error:',
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
  ):
    string | number {

    return (
      notification?.id ||
      index
    );

  }

}