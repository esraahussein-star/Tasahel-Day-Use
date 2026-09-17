import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Router
} from '@angular/router';

import {
  RealtimeChannel
} from '@supabase/supabase-js';

import {
  LucideAngularModule,
  WalletCards,
  Clock3,
  CircleX,
  RefreshCw,
  ArrowLeft,
  TrendingUp,
  Landmark,
  BadgeDollarSign,
  RotateCcw,
  CalendarDays
} from 'lucide-angular';

import {
  AccountWorkspaceService
} from '../services/account-workspace';


type DatePreset =
  | 'today'
  | 'week'
  | 'month'
  | 'custom';


@Component({
  selector: 'app-account-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],
  templateUrl: './account-dashboard.html',
  styleUrl: './account-dashboard.css'
})
export class AccountDashboardComponent
implements OnInit, OnDestroy {

  loading = true;
  reportLoading = false;
  errorMessage = '';

  requests: any[] = [];

  pendingCount = 0;
  reviewCount = 0;
  failedCount = 0;
  totalCount = 0;

  totalSales = 0;
  totalCost = 0;
  grossProfit = 0;
  collected = 0;
  refunded = 0;
  netCollected = 0;
  paidRequests = 0;
  refundedRequests = 0;

  activePreset: DatePreset = 'month';
  dateFrom = '';
  dateTo = '';

  private realtimeChannel:
    RealtimeChannel | null = null;


  readonly WalletCards = WalletCards;
  readonly Clock3 = Clock3;
  readonly CircleX = CircleX;
  readonly RefreshCw = RefreshCw;
  readonly ArrowLeft = ArrowLeft;
  readonly TrendingUp = TrendingUp;
  readonly Landmark = Landmark;
  readonly BadgeDollarSign = BadgeDollarSign;
  readonly RotateCcw = RotateCcw;
  readonly CalendarDays = CalendarDays;


  constructor(
    private accountService:
      AccountWorkspaceService,

    private router:
      Router,

    private cdr:
      ChangeDetectorRef
  ) {}


  async ngOnInit():
    Promise<void> {

    this.applyPreset('month', false);

    await this.loadDashboard();

    this.realtimeChannel =
      this.accountService
        .subscribeToAccountRequests(
          async () => {
            await this.loadDashboard(false);
          }
        );
  }


  async ngOnDestroy():
    Promise<void> {

    await this.accountService
      .removeChannel(
        this.realtimeChannel
      );
  }


  async loadDashboard(
    showPageLoader = true
  ): Promise<void> {

    if (showPageLoader) {
      this.loading = true;
    }

    this.reportLoading = true;
    this.errorMessage = '';
    this.cdr.markForCheck();


    try {

      const {
        fromIso,
        toExclusiveIso
      } = this.getDateRangeIso();


      const [
        requests,
        stats,
        financial
      ] = await Promise.all([

        this.accountService
          .getAccountRequests(),

        this.accountService
          .getDashboardStats(),

        this.accountService
          .getFinancialReport(
            fromIso,
            toExclusiveIso
          )

      ]);


      this.requests =
        Array.isArray(requests)
          ? requests
          : [];

      this.pendingCount =
        stats.pending;

      this.reviewCount =
        stats.underReview;

      this.failedCount =
        stats.failed;

      this.totalCount =
        stats.total;


      this.totalSales =
        financial.totalSales;

      this.totalCost =
        financial.totalCost;

      this.grossProfit =
        financial.grossProfit;

      this.collected =
        financial.collected;

      this.refunded =
        financial.refunded;

      this.netCollected =
        financial.netCollected;

      this.paidRequests =
        financial.paidRequests;

      this.refundedRequests =
        financial.refundedRequests;


    } catch (error) {

      console.error(
        'Account dashboard error:',
        error
      );

      this.errorMessage =
        'تعذر تحميل لوحة الحسابات.';

    } finally {

      this.loading = false;
      this.reportLoading = false;
      this.cdr.markForCheck();
    }
  }


  async applyPreset(
    preset: DatePreset,
    reload = true
  ): Promise<void> {

    this.activePreset = preset;

    if (preset === 'custom') {
      return;
    }

    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);


    if (preset === 'today') {
      // Same day.
    }

    if (preset === 'week') {
      const day = now.getDay();
      const diff =
        day === 0
          ? 6
          : day - 1;

      start.setDate(
        now.getDate() - diff
      );
    }

    if (preset === 'month') {
      start.setDate(1);
    }


    this.dateFrom =
      this.toDateInput(start);

    this.dateTo =
      this.toDateInput(end);


    if (reload) {
      await this.loadDashboard(false);
    }
  }


  async applyCustomRange():
    Promise<void> {

    if (
      !this.dateFrom ||
      !this.dateTo
    ) {
      return;
    }

    if (
      this.dateFrom >
      this.dateTo
    ) {
      this.errorMessage =
        'تاريخ البداية يجب أن يكون قبل تاريخ النهاية.';
      return;
    }

    this.activePreset = 'custom';

    await this.loadDashboard(false);
  }


  get recentRequests(): any[] {

    return this.requests
      .filter(
        request =>
          request?.payment_status === 'pending'
          ||
          request?.workflow_status === 'sent_to_accounts'
      )
      .slice(0, 6);
  }


  openRequests(
    status?: string
  ): void {

    this.router.navigate(
      ['/account/requests'],
      {
        queryParams:
          status
            ? { status }
            : {}
      }
    );
  }


  getPaymentStatusLabel(
    status:
      string |
      null |
      undefined
  ): string {

    const labels:
      Record<string, string> = {

      pending:
        'Pending',

      under_review:
        'Under Review',

      paid:
        'Paid',

      failed:
        'Failed',

      refunded:
        'Refunded',

      not_required:
        'Not Required'
    };


    return (
      labels[status || '']
      ||
      'Unknown'
    );
  }


  getRequestAmount(
    request: any
  ): number | null {

    const candidates = [
      request?.customer_payable_amount,
      request?.selling_price_snapshot,
      request?.estimated_total,
      request?.budget,
      request?.unit_price
    ];


    for (
      const candidate of candidates
    ) {

      if (
        candidate === null
        ||
        candidate === undefined
        ||
        candidate === ''
      ) {
        continue;
      }

      const value =
        Number(candidate);

      if (
        Number.isFinite(value)
      ) {
        return value;
      }
    }


    return null;
  }


  trackByRequestId(
    index: number,
    request: any
  ): string | number {

    return (
      request?.id
      ||
      index
    );
  }


  private getDateRangeIso(): {
    fromIso: string;
    toExclusiveIso: string;
  } {

    const from =
      new Date(
        `${this.dateFrom}T00:00:00`
      );

    const toExclusive =
      new Date(
        `${this.dateTo}T00:00:00`
      );

    toExclusive.setDate(
      toExclusive.getDate() + 1
    );


    return {
      fromIso:
        from.toISOString(),
      toExclusiveIso:
        toExclusive.toISOString()
    };
  }


  private toDateInput(
    value: Date
  ): string {

    const year =
      value.getFullYear();

    const month =
      String(
        value.getMonth() + 1
      ).padStart(2, '0');

    const day =
      String(
        value.getDate()
      ).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
