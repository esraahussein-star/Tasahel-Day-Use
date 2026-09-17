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
  ActivatedRoute
} from '@angular/router';

import {
  RealtimeChannel
} from '@supabase/supabase-js';

import {
  LucideAngularModule,
  Search,
  Eye,
  X,
  WalletCards,
  CheckCircle2,
  CircleX,
  Clock3,
  UserRound,
  MapPin,
  CalendarDays,
  Users,
  Phone,
  ReceiptText,
  MessageSquareText,
  RefreshCw
} from 'lucide-angular';

import {
  AuthService
} from '../../services/auth.service';

import {
  AccountWorkspaceService
} from '../services/account-workspace';

type PaymentFilter =
  | 'all'
  | 'pending'
  | 'under_review'
  | 'paid'
  | 'failed'
  | 'refunded';


@Component({
  selector: 'app-account-requests',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],

  templateUrl: './account-requests.html',

  styleUrl: './account-requests.css'
})
export class AccountRequestsComponent
implements OnInit, OnDestroy {

  // =========================================================
  // USER
  // =========================================================

  currentUser: any = null;


  // =========================================================
  // DATA
  // =========================================================

  requests: any[] = [];

  notes: any[] = [];

  events: any[] = [];

  receipts: any[] = [];

  selectedRequest: any = null;

  assignedAgent: any = null;


  // =========================================================
  // STATE
  // =========================================================

  loading = true;

  drawerLoading = false;

  saving = false;

  errorMessage = '';

  actionError = '';

  searchTerm = '';

  activeFilter:
    PaymentFilter =
      'all';

  paymentNotes = '';


  // =========================================================
  // REALTIME
  // =========================================================

  private realtimeChannel:
    RealtimeChannel | null =
      null;


  // =========================================================
  // ICONS
  // =========================================================

  readonly Search =
    Search;

  readonly Eye =
    Eye;

  readonly X =
    X;

  readonly WalletCards =
    WalletCards;

  readonly CheckCircle2 =
    CheckCircle2;

  readonly CircleX =
    CircleX;

  readonly Clock3 =
    Clock3;

  readonly UserRound =
    UserRound;

  readonly MapPin =
    MapPin;

  readonly CalendarDays =
    CalendarDays;

  readonly Users =
    Users;

  readonly Phone =
    Phone;

  readonly ReceiptText =
    ReceiptText;

  readonly MessageSquareText =
    MessageSquareText;

  readonly RefreshCw =
    RefreshCw;


  constructor(
    private authService:
      AuthService,

    private accountService:
      AccountWorkspaceService,

    private route:
      ActivatedRoute,

    private cdr:
      ChangeDetectorRef
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  async ngOnInit():
    Promise<void> {

    const filterFromQuery =
      this.route.snapshot
        .queryParamMap
        .get('status');


    if (
      filterFromQuery
      &&
      [
        'pending',
        'under_review',
        'paid',
        'failed',
        'refunded'
      ].includes(
        filterFromQuery
      )
    ) {

      this.activeFilter =
        filterFromQuery as PaymentFilter;

    }


    await this.loadPage();

  }


  // =========================================================
  // DESTROY
  // =========================================================

  async ngOnDestroy():
    Promise<void> {

    await this.accountService
      .removeChannel(
        this.realtimeChannel
      );

  }


  // =========================================================
  // LOAD PAGE
  // =========================================================

  async loadPage():
    Promise<void> {

    this.loading = true;

    this.errorMessage = '';

    this.cdr.markForCheck();


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

        throw new Error(
          'INVALID_ACCOUNT_USER'
        );

      }


      this.currentUser =
        user;


      await this.loadRequests();


      this.realtimeChannel =
        this.accountService
          .subscribeToAccountRequests(
            async () => {

              await this.loadRequests();

            }
          );


    } catch (error) {

      console.error(
        'Account requests page error:',
        error
      );


      this.errorMessage =
        'تعذر تحميل طلبات الحسابات.';


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // LOAD REQUESTS
  // =========================================================

  async loadRequests():
    Promise<void> {

    try {

      const result =
        await this.accountService
          .getAccountRequests();


      this.requests =
        Array.isArray(result)
          ? result
          : [];


    } catch (error) {

      console.error(
        'Load account requests error:',
        error
      );


      throw error;

    }


    this.cdr.markForCheck();

  }


  // =========================================================
  // FILTERED REQUESTS
  // =========================================================

  get filteredRequests():
    any[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.requests.filter(
      request => {

        // STATUS FILTER

        if (
          this.activeFilter !== 'all'
          &&
          request.payment_status !==
            this.activeFilter
        ) {

          return false;

        }


        // SEARCH

        if (!search) {

          return true;

        }


        const searchable =
          [
            request.name,
            request.phone,
            request.place_name,
            request.package,
            request.area,
            request.payment_notes
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();


        return searchable.includes(
          search
        );

      }
    );

  }


  // =========================================================
  // COUNTS
  // =========================================================

  get pendingCount():
    number {

    return this.requests.filter(
      request =>
        request.payment_status ===
          'pending'
    ).length;

  }


  get reviewCount():
    number {

    return this.requests.filter(
      request =>
        request.payment_status ===
          'under_review'
    ).length;

  }


  get paidCount():
    number {

    return this.requests.filter(
      request =>
        request.payment_status ===
          'paid'
    ).length;

  }


  get failedCount():
    number {

    return this.requests.filter(
      request =>
        request.payment_status ===
          'failed'
    ).length;

  }


  // =========================================================
  // FILTER
  // =========================================================

  setFilter(
    filter: PaymentFilter
  ):
    void {

    this.activeFilter =
      filter;

  }


  // =========================================================
  // OPEN REQUEST
  // =========================================================

  async openRequest(
    request: any
  ):
    Promise<void> {

    if (!request?.id) {
      return;
    }


    this.selectedRequest =
      request;

    this.paymentNotes =
      request.payment_notes || '';

    this.notes = [];

    this.events = [];

    this.receipts = [];

    this.assignedAgent = null;

    this.actionError = '';

    this.drawerLoading = true;

    this.cdr.markForCheck();


    try {

      const [
        latestRequest,
        notes,
        events,
        assignment,
        receipts
      ] =
        await Promise.all([

          this.accountService
            .getRequestById(
              request.id
            ),

          this.accountService
            .getRequestNotes(
              request.id
            ),

          this.accountService
            .getRequestEvents(
              request.id
            ),

          this.accountService
            .getRequestAssignment(
              request.id
            ),

          this.accountService
            .getPaymentReceipts(
              request.id
            )

        ]);


      if (latestRequest) {

        this.selectedRequest =
          latestRequest;

        this.paymentNotes =
          latestRequest.payment_notes || '';

      }


      this.notes =
        notes || [];

      this.events =
        events || [];

      this.receipts =
        receipts || [];


      if (
        assignment?.assigned_to
      ) {

        this.assignedAgent =
          await this.accountService
            .getUserById(
              assignment.assigned_to
            );

      }


    } catch (error) {

      console.error(
        'Open account request error:',
        error
      );


      this.actionError =
        'تعذر تحميل تفاصيل الطلب.';


    } finally {

      this.drawerLoading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // CLOSE REQUEST
  // =========================================================

  closeRequest():
    void {

    if (this.saving) {
      return;
    }


    this.selectedRequest =
      null;

    this.notes = [];

    this.events = [];

    this.receipts = [];

    this.assignedAgent =
      null;

    this.paymentNotes = '';

    this.actionError = '';

  }


  // =========================================================
  // START REVIEW
  // =========================================================

  async startReview():
    Promise<void> {

    if (
      !this.selectedRequest?.id
      ||
      !this.currentUser?.id
      ||
      this.saving
    ) {

      return;

    }


    this.saving = true;

    this.actionError = '';

    this.cdr.markForCheck();


    try {

      const updated =
        await this.accountService
          .startReview(
            this.selectedRequest.id,
            this.currentUser.id
          );


      this.selectedRequest =
        updated;


      await this.loadRequests();


    } catch (error) {

      console.error(
        'Start account review error:',
        error
      );


      this.actionError =
        'تعذر بدء مراجعة الدفع.';


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // SAVE NOTES
  // =========================================================

  async savePaymentNotes():
    Promise<void> {

    if (
      !this.selectedRequest?.id
      ||
      this.saving
    ) {

      return;

    }


    this.saving = true;

    this.actionError = '';

    this.cdr.markForCheck();


    try {

      const updated =
        await this.accountService
          .updatePaymentNotes(
            this.selectedRequest.id,
            this.paymentNotes.trim()
              ? this.paymentNotes.trim()
              : null
          );


      this.selectedRequest =
        updated;


      await this.loadRequests();


    } catch (error) {

      console.error(
        'Save payment notes error:',
        error
      );


      this.actionError =
        'تعذر حفظ ملاحظات الحسابات.';


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // CONFIRM PAYMENT
  // =========================================================

  async confirmPayment():
    Promise<void> {

    if (
      !this.selectedRequest?.id
      ||
      !this.currentUser?.id
      ||
      this.saving
    ) {

      return;

    }


    this.saving = true;

    this.actionError = '';

    this.cdr.markForCheck();


    try {

      const updated =
        await this.accountService
          .confirmPayment(
            this.selectedRequest.id,
            this.currentUser.id,
            this.paymentNotes.trim()
              ? this.paymentNotes.trim()
              : null
          );


      this.selectedRequest =
        updated;


      await this.accountService
        .createAccountNote(
          updated.id,
          this.currentUser.id,
          this.paymentNotes.trim()
            ? `تم تأكيد الدفع. ${this.paymentNotes.trim()}`
            : 'تم تأكيد الدفع من الحسابات.'
        );


      await this.reloadDrawerData();

      await this.loadRequests();


    } catch (error) {

      console.error(
        'Confirm payment error:',
        error
      );


      this.actionError =
        'تعذر تأكيد الدفع.';


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // FAIL PAYMENT
  // =========================================================

  async failPayment():
    Promise<void> {

    if (
      !this.selectedRequest?.id
      ||
      !this.currentUser?.id
      ||
      this.saving
    ) {

      return;

    }


    if (
      !this.paymentNotes.trim()
    ) {

      this.actionError =
        'اكتبي سبب فشل أو رفض الدفع أولاً.';

      return;

    }


    this.saving = true;

    this.actionError = '';

    this.cdr.markForCheck();


    try {

      const updated =
        await this.accountService
          .failPayment(
            this.selectedRequest.id,
            this.currentUser.id,
            this.paymentNotes.trim()
          );


      this.selectedRequest =
        updated;


      await this.accountService
        .createAccountNote(
          updated.id,
          this.currentUser.id,
          `فشل/رفض الدفع: ${this.paymentNotes.trim()}`
        );


      await this.reloadDrawerData();

      await this.loadRequests();


    } catch (error) {

      console.error(
        'Fail payment error:',
        error
      );


      this.actionError =
        'تعذر تحديث حالة الدفع.';


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // REQUEST AGENT ACTION
  // =========================================================

  async requestAgentAction():
    Promise<void> {

    if (
      !this.selectedRequest?.id
      ||
      !this.currentUser?.id
      ||
      this.saving
    ) {

      return;

    }


    if (
      !this.paymentNotes.trim()
    ) {

      this.actionError =
        'اكتبي ما المطلوب من موظف خدمة العملاء أولاً.';

      return;

    }


    this.saving = true;

    this.actionError = '';

    this.cdr.markForCheck();


    try {

      const updated =
        await this.accountService
          .requestAgentAction(
            this.selectedRequest.id,
            this.currentUser.id,
            this.paymentNotes.trim()
          );


      this.selectedRequest =
        updated;


      await this.accountService
        .createAccountNote(
          updated.id,
          this.currentUser.id,
          `الحسابات تطلب مراجعة من موظف خدمة العملاء: ${this.paymentNotes.trim()}`
        );


      await this.reloadDrawerData();

      await this.loadRequests();


    } catch (error) {

      console.error(
        'Request agent action error:',
        error
      );


      this.actionError =
        'تعذر إرسال الطلب لموظف خدمة العملاء.';


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // RELOAD DRAWER DATA
  // =========================================================

  private async reloadDrawerData():
    Promise<void> {

    if (
      !this.selectedRequest?.id
    ) {

      return;

    }


    try {

      const [
        notes,
        events,
        receipts
      ] =
        await Promise.all([

          this.accountService
            .getRequestNotes(
              this.selectedRequest.id
            ),

          this.accountService
            .getRequestEvents(
              this.selectedRequest.id
            ),

          this.accountService
            .getPaymentReceipts(
              this.selectedRequest.id
            )

        ]);


      this.notes =
        notes || [];

      this.events =
        events || [];

      this.receipts =
        receipts || [];


    } catch (error) {

      console.error(
        'Reload payment history error:',
        error
      );

    }

  }


  // =========================================================
  // LABELS
  // =========================================================

  getPaymentStatusLabel(
    status:
      string |
      null |
      undefined
  ):
    string {

    const labels:
      Record<string, string> = {

      not_required:
        'غير مطلوب',

      pending:
        'بانتظار المراجعة',

      under_review:
        'تحت المراجعة',

      paid:
        'تم الدفع',

      failed:
        'فشل الدفع',

      refunded:
        'تم الاسترداد'

    };


    return (
      labels[status || '']
      ||
      'غير محدد'
    );

  }


  getWorkflowLabel(
    status:
      string |
      null |
      undefined
  ):
    string {

    const labels:
      Record<string, string> = {

      sent_to_accounts:
        'محول للحسابات',

      payment_review:
        'مراجعة الدفع',

      paid:
        'تم تأكيد الدفع',

      completed:
        'مكتمل',

      cancelled:
        'ملغي'

    };


    return (
      labels[status || '']
      ||
      status
      ||
      'غير محدد'
    );

  }


  // =========================================================
  // AMOUNT
  // =========================================================

  getRequestAmount(
    request: any
  ):
    number | null {

    // The amount reviewed by Accounts must be the CURRENT payment
    // explicitly requested by the Agent. Booking estimate / customer
    // budget are informational only and must never override it.
    const candidates =
      [
        request?.amount_due,
        request?.payment_amount,
        request?.estimated_total,
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


  // =========================================================
  // PAYMENT RECEIPT HELPERS
  // =========================================================

  isImageReceipt(
    receipt: any
  ): boolean {

    return String(
      receipt?.mime_type || ''
    ).startsWith('image/');
  }


  isPdfReceipt(
    receipt: any
  ): boolean {

    return String(
      receipt?.mime_type || ''
    ) === 'application/pdf';
  }


  getReceiptStatusLabel(
    status: string | null | undefined
  ): string {

    const labels: Record<string, string> = {
      pending: 'بانتظار المراجعة',
      under_review: 'تحت المراجعة',
      approved: 'مقبول',
      rejected: 'مرفوض',
      paid: 'تم الاعتماد'
    };

    return labels[status || ''] || status || 'غير محدد';
  }


  formatFileSize(
    bytes: number | null | undefined
  ): string {

    const size = Number(bytes || 0);

    if (!size) {
      return '';
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(
      size / (1024 * 1024)
    ).toFixed(1)} MB`;
  }


  // =========================================================
  // TRACK BY
  // =========================================================

  trackByRequestId(
    index: number,
    request: any
  ):
    string | number {

    return (
      request?.id
      ||
      index
    );

  }


  trackByNoteId(
    index: number,
    note: any
  ):
    string | number {

    return (
      note?.id
      ||
      index
    );

  }


  trackByEventId(
    index: number,
    event: any
  ):
    string | number {

    return (
      event?.id
      ||
      index
    );

  }


  trackByReceiptId(
    index: number,
    receipt: any
  ):
    string | number {

    return (
      receipt?.id
      ||
      index
    );

  }

}