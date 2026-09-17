import {
  ChangeDetectorRef,
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  inject
} from '@angular/core';

import {
  CommonModule,
  isPlatformBrowser
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
  ReceiptText,
  History,
  Bell,
  LogOut,
  WalletCards,
  BadgeDollarSign,
  CreditCard
} from 'lucide-angular';

import {
  AuthService
} from '../../services/auth.service';

import {
  AccountWorkspaceService
} from '../services/account-workspace';


@Component({
  selector: 'app-account-layout',

  standalone: true,

  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LucideAngularModule
  ],

  templateUrl: './account-layout.html',

  styleUrl: './account-layout.css'
})
export class AccountLayoutComponent
implements OnInit, OnDestroy {

  private readonly platformId =
    inject(PLATFORM_ID);


  currentUser: any = null;

  notificationsOpen = false;

  pendingCount = 0;

  reviewCount = 0;


  private requestChannel:
    RealtimeChannel | null =
      null;


  readonly LayoutDashboard =
    LayoutDashboard;

  readonly ReceiptText =
    ReceiptText;

  readonly History =
    History;

  readonly Bell =
    Bell;

  readonly LogOut =
    LogOut;

  readonly WalletCards =
    WalletCards;

  readonly BadgeDollarSign =
    BadgeDollarSign;

  readonly CreditCard =
    CreditCard;


  constructor(
    private authService:
      AuthService,

    private accountService:
      AccountWorkspaceService,

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

    /*
     * IMPORTANT
     *
     * During SSR there is no browser localStorage session.
     * Do not run account authentication/loading here.
     *
     * The route guards handle access once the browser runs.
     */

    if (
      !isPlatformBrowser(
        this.platformId
      )
    ) {

      return;

    }


    await this.loadLayout();

  }


  // =========================================================
  // DESTROY
  // =========================================================

  async ngOnDestroy():
    Promise<void> {

    if (
      !isPlatformBrowser(
        this.platformId
      )
    ) {

      return;

    }


    await this.accountService
      .removeChannel(
        this.requestChannel
      );

  }


  // =========================================================
  // LOAD LAYOUT
  // =========================================================

  async loadLayout():
    Promise<void> {

    /*
     * No redirect here.
     *
     * accountRoleGuard + authGuard are responsible
     * for deciding whether access is allowed.
     */

    try {

      const user =
        await this.authService
          .getCurrentAdminUser();


      if (
        !user
        ||
        user.active !== true
        ||
        user.role !== 'account'
      ) {

        console.warn(
          'Account profile unavailable in layout.'
        );

        return;

      }


      this.currentUser =
        user;


      await this.loadCounts();


      /*
       * Prevent duplicate realtime subscription.
       */

      if (
        this.requestChannel
      ) {

        await this.accountService
          .removeChannel(
            this.requestChannel
          );

      }


      this.requestChannel =
        this.accountService
          .subscribeToAccountRequests(
            async () => {

              await this.loadCounts();

            }
          );


      this.cdr.markForCheck();


    } catch (error) {

      console.error(
        'Account layout error:',
        error
      );

    }

  }


  // =========================================================
  // COUNTS
  // =========================================================

  async loadCounts():
    Promise<void> {

    try {

      const stats =
        await this.accountService
          .getDashboardStats();


      this.pendingCount =
        stats.pending;


      this.reviewCount =
        stats.underReview;


    } catch (error) {

      console.error(
        'Account layout counts error:',
        error
      );

    }


    this.cdr.markForCheck();

  }


  // =========================================================
  // ATTENTION COUNT
  // =========================================================

  get totalAttentionCount():
    number {

    return (
      this.pendingCount
      +
      this.reviewCount
    );

  }


  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  toggleNotifications(
    event: MouseEvent
  ):
    void {

    event.stopPropagation();

    this.notificationsOpen =
      !this.notificationsOpen;

  }


  stopDropdownClick(
    event: MouseEvent
  ):
    void {

    event.stopPropagation();

  }


  @HostListener(
    'document:click'
  )
  closeNotifications():
    void {

    this.notificationsOpen =
      false;

  }


  // =========================================================
  // OPEN PENDING
  // =========================================================

  async openPendingRequests():
    Promise<void> {

    this.notificationsOpen =
      false;


    await this.router.navigate(
      [
        '/account/requests'
      ],
      {
        queryParams: {
          status: 'pending'
        }
      }
    );

  }


  // =========================================================
  // OPEN REVIEW
  // =========================================================

  async openReviewRequests():
    Promise<void> {

    this.notificationsOpen =
      false;


    await this.router.navigate(
      [
        '/account/requests'
      ],
      {
        queryParams: {
          status: 'under_review'
        }
      }
    );

  }


  // =========================================================
  // LOGOUT
  // =========================================================

  async logout():
    Promise<void> {

    try {

      await this.accountService
        .removeChannel(
          this.requestChannel
        );


      this.requestChannel =
        null;


      await this.authService
        .signOut();


      await this.router.navigate([
        '/login'
      ]);


    } catch (error) {

      console.error(
        'Account logout error:',
        error
      );

    }

  }

}