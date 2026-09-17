import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  OnDestroy
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  AuthService
} from '../../services/auth.service';

import {
  SupabaseService
} from '../../services/supabase.service';

import {
  AgentWorkspaceService
} from '../services/agent-workspace.service';

import {
  RealtimeChannel
} from '@supabase/supabase-js';


type RequestFilter =
  | 'all'
  | 'new'
  | 'contacting'
  | 'follow_up'
  | 'waiting_customer'
  | 'waiting_payment_receipt'
  | 'needs_customer_action'
  | 'waiting_place'
  | 'booking_confirmed'
  | 'accounts'
  | 'paid'
  | 'completed';


type NoteType =
  | 'call'
  | 'follow_up'
  | 'booking'
  | 'customer'
  | 'place'
  | 'payment'
  | 'internal';


@Component({
  selector: 'app-agent-requests',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './agent-requests.html',
  styleUrl: './agent-requests.css'
})
export class AgentRequestsComponent implements OnInit, OnDestroy {

  currentUser: any = null;

  assignments: any[] = [];
  requests: any[] = [];
  notes: any[] = [];

  paymentReceipts: any[] = [];
  receiptsLoading = false;
  receiptError = '';

  loading = true;
  errorMessage = '';

  searchTerm = '';

  activeFilter: RequestFilter = 'all';

  dateFrom = '';
  dateTo = '';

  currentPage = 1;
  readonly pageSize = 12;

  selectedRequest: any = null;
  selectedAssignment: any = null;

  drawerLoading = false;
  saving = false;
  noteSaving = false;

  // =========================================================
  // REQUEST DRAWER TABS + CUSTOMER CHAT
  // =========================================================

  drawerTab: 'details' | 'chat' = 'details';

  chatSession: any = null;
  chatMessages: any[] = [];
  chatLoading = false;
  chatSending = false;
  chatError = '';
  chatMessage = '';

  agentChatMediaUploading = false;
  agentVoiceRecording = false;
  agentVoiceSeconds = 0;

  private agentMediaRecorder: MediaRecorder | null = null;
  private agentVoiceChunks: Blob[] = [];
  private agentVoiceStream: MediaStream | null = null;
  private agentVoiceStartedAt = 0;
  private agentVoiceTimer: ReturnType<typeof setInterval> | null = null;

  private chatChannel: RealtimeChannel | null = null;


  editForm: any = {

    name: '',

    phone: '',

    place_name: '',

    area: '',

    date: '',

    time: '',

    guests: 1,

    package: '',

    extras: '',

    budget: null,

    unit_price: null,

    total_price: null,

    notes: '',

    workflow_status: 'new',

    next_follow_up_at: ''

  };


  noteForm = {

    note_type: 'call' as NoteType,

    content: ''

  };


  paymentRequestForm = {

    amount: null as number | null,

    reason: ''

  };


  placeConfirmationForm = {

    confirmationReference: '',

    note: ''

  };


  readonly statusOptions = [

    {
      value: 'all',
      label: 'كل الحالات'
    },

    {
      value: 'new',
      label: 'طلب جديد'
    },

    {
      value: 'contacting',
      label: 'قيد التواصل'
    },

    {
      value: 'follow_up',
      label: 'متابعة لاحقة'
    },

    {
      value: 'waiting_customer',
      label: 'في انتظار العميل'
    },

    {
      value: 'waiting_payment_receipt',
      label: 'في انتظار إيصال الدفع'
    },

    {
      value: 'needs_customer_action',
      label: 'مطلوب إجراء من العميل'
    },

    {
      value: 'waiting_place',
      label: 'في انتظار المكان'
    },

    {
      value: 'booking_confirmed',
      label: 'تم تأكيد المكان'
    },

    {
      value: 'accounts',
      label: 'في انتظار الحسابات'
    },

    {
      value: 'paid',
      label: 'تم الدفع'
    },

    {
      value: 'completed',
      label: 'مكتمل'
    }

  ];


  readonly noteTypes = [

    {
      value: 'call',
      label: 'مكالمة'
    },

    {
      value: 'follow_up',
      label: 'متابعة'
    },

    {
      value: 'customer',
      label: 'تواصل مع العميل'
    },

    {
      value: 'place',
      label: 'تواصل مع المكان'
    },

    {
      value: 'booking',
      label: 'تحديث الحجز'
    },

    {
      value: 'payment',
      label: 'الدفع'
    },

    {
      value: 'internal',
      label: 'ملاحظة داخلية'
    }

  ];


  private readonly cdr = inject(ChangeDetectorRef);

  constructor(
    private authService: AuthService,
    private workspaceService: AgentWorkspaceService,
    private supabaseService: SupabaseService
  ) {}


  async ngOnInit(): Promise<void> {

    await this.loadRequests();

  }


  async loadRequests(): Promise<void> {

    this.loading = true;

    this.errorMessage = '';

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

        throw new Error(
          'INVALID_AGENT_USER'
        );

      }


      this.currentUser = user;


      this.assignments =
        await this.workspaceService
          .getMyAssignments(
            user.id
          );


      const requestIds =
        [
          ...new Set(
            this.assignments.map(
              item =>
                String(
                  item.request_id
                )
            )
          )
        ];


      this.requests =
        await this.workspaceService
          .getMyRequests(
            requestIds
          );


      this.ensureValidPage();


    } catch (error) {

      console.error(
        'Agent requests error:',
        error
      );


      this.errorMessage =
        'تعذر تحميل طلباتك.';


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  get rows(): any[] {

    return this.assignments
      .map(
        assignment => {

          const request =
            this.requests.find(
              item =>
                item.id ===
                assignment.request_id
            );


          if (!request) {
            return null;
          }


          return {

            ...request,

            assignment

          };

        }
      )
      .filter(Boolean);

  }


  get filteredRows(): any[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.rows.filter(
      row => {

        const status =
          row.workflow_status ||
          'new';


        let matchesStatus = true;


        switch (
          this.activeFilter
        ) {

          case 'new':

            matchesStatus =
              status === 'new';

            break;


          case 'contacting':

            matchesStatus =
              status === 'contacting';

            break;


          case 'follow_up':

            matchesStatus =
              status === 'follow_up';

            break;


          case 'waiting_customer':

            matchesStatus =
              status === 'waiting_customer';

            break;


          case 'waiting_payment_receipt':

            matchesStatus =
              status === 'waiting_payment_receipt';

            break;


          case 'needs_customer_action':

            matchesStatus =
              status === 'needs_customer_action';

            break;


          case 'waiting_place':

            matchesStatus =
              status === 'waiting_place';

            break;


          case 'booking_confirmed':

            matchesStatus =
              status === 'booking_confirmed';

            break;


          case 'accounts':

            matchesStatus =
              [
                'sent_to_accounts',
                'payment_review'
              ].includes(status);

            break;


          case 'paid':

            matchesStatus =
              status === 'paid';

            break;


          case 'completed':

            matchesStatus =
              [
                'completed',
                'cancelled'
              ].includes(status);

            break;


          default:

            matchesStatus = true;

        }


        if (!matchesStatus) {
          return false;
        }


        if (
          !this.matchesDateFilter(
            row
          )
        ) {

          return false;

        }


        if (!search) {
          return true;
        }


        const searchable =
          [
            row.name,
            row.phone,
            row.place_name,
            row.area,
            row.package,
            row.extras,
            row.notes,
            row.date,
            row.time
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


  private matchesDateFilter(
    row: any
  ): boolean {

    if (
      !this.dateFrom &&
      !this.dateTo
    ) {

      return true;

    }


    if (
      !row?.created_at
    ) {

      return false;

    }


    const createdAt =
      new Date(
        row.created_at
      );


    if (
      Number.isNaN(
        createdAt.getTime()
      )
    ) {

      return false;

    }


    if (
      this.dateFrom
    ) {

      const fromDate =
        new Date(
          `${this.dateFrom}T00:00:00`
        );


      if (
        createdAt <
        fromDate
      ) {

        return false;

      }

    }


    if (
      this.dateTo
    ) {

      const toDate =
        new Date(
          `${this.dateTo}T23:59:59.999`
        );


      if (
        createdAt >
        toDate
      ) {

        return false;

      }

    }


    return true;

  }


  get sortedRows(): any[] {

    return [
      ...this.filteredRows
    ].sort(
      (
        a,
        b
      ) => {

        const aDue =
          this.isFollowUpDue(a);

        const bDue =
          this.isFollowUpDue(b);


        if (
          aDue &&
          !bDue
        ) {

          return -1;

        }


        if (
          !aDue &&
          bDue
        ) {

          return 1;

        }


        return (
          new Date(
            b.updated_at ||
            b.created_at
          ).getTime()
          -
          new Date(
            a.updated_at ||
            a.created_at
          ).getTime()
        );

      }
    );

  }


  get totalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.sortedRows.length /
        this.pageSize
      )
    );

  }


  get paginatedRows(): any[] {

    const start =
      (
        this.currentPage - 1
      ) * this.pageSize;


    return this.sortedRows.slice(
      start,
      start + this.pageSize
    );

  }


  get pageStart(): number {

    if (
      this.sortedRows.length === 0
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

      this.sortedRows.length
    );

  }


  previousPage(): void {

    if (
      this.currentPage <= 1
    ) {

      return;

    }


    this.currentPage--;

  }


  nextPage(): void {

    if (
      this.currentPage >=
      this.totalPages
    ) {

      return;

    }


    this.currentPage++;

  }


  private ensureValidPage(): void {

    if (
      this.currentPage >
      this.totalPages
    ) {

      this.currentPage =
        this.totalPages;

    }

  }


  onSearchChange(): void {

    this.currentPage = 1;

  }


  onFilterChange(): void {

    this.currentPage = 1;

  }


  applyDateFilter(): void {

    this.currentPage = 1;

  }


  clearDateFilter(): void {

    this.dateFrom = '';

    this.dateTo = '';

    this.currentPage = 1;

  }


  clearAllFilters(): void {

    this.searchTerm = '';

    this.activeFilter = 'all';

    this.dateFrom = '';

    this.dateTo = '';

    this.currentPage = 1;

  }


  get hasActiveFilters(): boolean {

    return (
      !!this.searchTerm.trim()
      ||
      this.activeFilter !== 'all'
      ||
      !!this.dateFrom
      ||
      !!this.dateTo
    );

  }


  getFilterCount(
    filter: RequestFilter
  ): number {

    const rows =
      this.rows;


    switch (filter) {

      case 'new':

        return rows.filter(
          row =>
            (
              row.workflow_status ||
              'new'
            ) === 'new'
        ).length;


      case 'contacting':

        return rows.filter(
          row =>
            row.workflow_status ===
            'contacting'
        ).length;


      case 'follow_up':

        return rows.filter(
          row =>
            row.workflow_status ===
            'follow_up'
        ).length;


      case 'waiting_customer':

        return rows.filter(
          row =>
            row.workflow_status ===
            'waiting_customer'
        ).length;


      case 'waiting_payment_receipt':

        return rows.filter(
          row =>
            row.workflow_status ===
            'waiting_payment_receipt'
        ).length;


      case 'needs_customer_action':

        return rows.filter(
          row =>
            row.workflow_status ===
            'needs_customer_action'
        ).length;


      case 'waiting_place':

        return rows.filter(
          row =>
            row.workflow_status ===
            'waiting_place'
        ).length;


      case 'booking_confirmed':

        return rows.filter(
          row =>
            row.workflow_status ===
            'booking_confirmed'
        ).length;


      case 'accounts':

        return rows.filter(
          row =>
            [
              'sent_to_accounts',
              'payment_review'
            ].includes(
              row.workflow_status
            )
        ).length;


      case 'paid':

        return rows.filter(
          row =>
            row.workflow_status ===
            'paid'
        ).length;


      case 'completed':

        return rows.filter(
          row =>
            [
              'completed',
              'cancelled'
            ].includes(
              row.workflow_status
            )
        ).length;


      default:

        return rows.length;

    }

  }


  async openRequest(
    row: any
  ): Promise<void> {

    this.selectedRequest = row;

    this.selectedAssignment =
      row.assignment;


    this.editForm = {

      name:
        row.name || '',

      phone:
        row.phone || '',

      place_name:
        row.place_name || '',

      area:
        row.area || '',

      date:
        row.date || '',

      time:
        row.time
          ? String(
              row.time
            ).slice(
              0,
              5
            )
          : '',

      guests:
        Number(
          row.guests || 1
        ),

      package:
        row.package || '',

      extras:
        row.extras || '',

      budget:
        row.budget ?? null,

      unit_price:
        this.resolveUnitPrice(row),

      total_price:
        this.resolveTotalPrice(row),

      notes:
        row.notes || '',

      workflow_status:
        row.workflow_status ||
        'new',

      next_follow_up_at:
        this.toDateTimeLocal(
          row.next_follow_up_at
        )

    };


    this.noteForm = {

      note_type:
        'call',

      content:
        ''

    };


    this.paymentRequestForm = {

      amount: null,

      reason: ''

    };


    this.placeConfirmationForm = {

      confirmationReference: '',

      note: ''

    };


    this.drawerTab = 'details';

    this.chatSession = null;
    this.chatMessages = [];
    this.chatMessage = '';
    this.chatError = '';

    await this.stopChatRealtime();

    this.drawerLoading = true;

    this.notes = [];
    this.paymentReceipts = [];
    this.receiptError = '';

    this.cdr.markForCheck();


    try {

      const [notes, chat] = await Promise.all([
        this.workspaceService.getRequestNotes(row.id),
        this.workspaceService.getRequestChat(row.id)
      ]);

      this.notes = notes || [];
      this.applyChatPayload(chat);
      await this.loadPaymentReceipts(row.id);
      await this.startChatRealtime();


    } catch (error) {

      console.error(
        'Load request notes error:',
        error
      );


    } finally {

      this.drawerLoading = false;

      this.cdr.markForCheck();

    }

  }


  closeRequest(): void {

    if (
      this.saving ||
      this.noteSaving
    ) {

      return;

    }


    void this.stopChatRealtime();

    this.selectedRequest = null;

    this.selectedAssignment = null;

    this.notes = [];
    this.paymentReceipts = [];
    this.receiptError = '';
    this.drawerTab = 'details';
    this.chatSession = null;
    this.chatMessages = [];
    this.chatMessage = '';
    this.chatError = '';

  }


  async saveRequest(): Promise<void> {

    if (
      !this.selectedRequest?.id
    ) {

      return;

    }


    this.saving = true;

    this.cdr.markForCheck();


    try {

      await this.workspaceService
        .updateRequest(
          this.selectedRequest.id,
          {

            name:
              this.editForm
                .name
                .trim(),

            phone:
              this.editForm
                .phone
                .trim(),

            place_name:
              this.editForm
                .place_name
                .trim(),

            area:
              this.clean(
                this.editForm.area
              ),

            date:
              this.editForm.date ||
              null,

            time:
              this.editForm.time ||
              null,

            guests:
              Math.max(
                1,
                Number(
                  this.editForm.guests ||
                  1
                )
              ),

            package:
              this.clean(
                this.editForm.package
              ),

            extras:
              this.clean(
                this.editForm.extras
              ),

            budget:
              this.editForm.budget ===
                ''
              ||
              this.editForm.budget ===
                null
                ? null
                : Number(
                    this.editForm.budget
                  ),

            selling_price_snapshot:
              this.toNullableMoney(this.editForm.unit_price),

            total_selling_price:
              this.toNullableMoney(this.editForm.total_price),

            notes:
              this.clean(
                this.editForm.notes
              ),

            workflow_status:
              this.editForm
                .workflow_status,

            next_follow_up_at:
              this.editForm
                .next_follow_up_at
                ? new Date(
                    this.editForm
                      .next_follow_up_at
                  ).toISOString()
                : null

          }
        );


      await this.loadRequests();

      this.refreshSelectedRequest();


    } catch (error) {

      console.error(
        'Save request error:',
        error
      );


      this.errorMessage =
        'تعذر حفظ بيانات الطلب.';


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  async startContacting(): Promise<void> {

    if (
      !this.selectedRequest ||
      !this.currentUser
    ) {

      return;

    }


    try {

      if (
        this.selectedAssignment
          ?.status === 'assigned'
      ) {

        await this.workspaceService
          .updateAssignmentStatus(
            this.selectedAssignment.id,
            'in_progress',
            this.currentUser.id
          );

      }


      this.editForm.workflow_status =
        'contacting';


      await this.saveRequest();


    } catch (error) {

      console.error(
        'Start contacting error:',
        error
      );

    }

  }


  async waitingCustomer(): Promise<void> {

    this.editForm.workflow_status =
      'waiting_customer';


    await this.saveRequest();

  }


  async waitingPlace(): Promise<void> {

    this.editForm.workflow_status =
      'waiting_place';


    await this.saveRequest();

  }


  async scheduleFollowUp(): Promise<void> {

    if (
      !this.editForm
        .next_follow_up_at
    ) {

      return;

    }


    this.editForm.workflow_status =
      'follow_up';


    await this.saveRequest();


    await this.addAutomaticNote(
      'follow_up',

      `تم تحديد موعد متابعة بتاريخ ${
        new Date(
          this.editForm.next_follow_up_at
        ).toLocaleString(
          'ar-EG'
        )
      } بواسطة ${
        this.currentUser?.full_name ||
        'موظف خدمة العملاء'
      }.`
    );

  }


  async addNote(): Promise<void> {

    if (
      !this.selectedRequest?.id ||
      !this.currentUser?.id
    ) {

      return;

    }


    const content =
      this.noteForm
        .content
        .trim();


    if (!content) {

      return;

    }


    this.noteSaving = true;

    this.cdr.markForCheck();


    try {

      await this.workspaceService
        .createRequestNote({

          request_id:
            this.selectedRequest.id,

          user_id:
            this.currentUser.id,

          note_type:
            this.noteForm.note_type,

          content

        });


      await this.workspaceService
        .updateRequest(
          this.selectedRequest.id,
          {

            last_contact_at:
              new Date()
                .toISOString()

          }
        );


      this.noteForm.content = '';


      this.notes =
        await this.workspaceService
          .getRequestNotes(
            this.selectedRequest.id
          );


    } catch (error) {

      console.error(
        'Add note error:',
        error
      );


    } finally {

      this.noteSaving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // AGENT REQUESTS PAYMENT FROM CUSTOMER
  // =========================================================

  async requestPaymentFromCustomer(): Promise<void> {

    if (
      !this.selectedRequest?.id ||
      !this.currentUser?.id ||
      this.saving
    ) {
      return;
    }

    const amount = Number(
      this.paymentRequestForm.amount || 0
    );

    const reason =
      this.paymentRequestForm.reason.trim();

    if (!amount || amount <= 0) {
      this.errorMessage =
        'اكتبي المبلغ المطلوب من العميل.';
      this.cdr.markForCheck();
      return;
    }

    if (!reason) {
      this.errorMessage =
        'اكتبي سبب طلب الدفعة للعميل.';
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const now = new Date().toISOString();

      // Important: payment starts ONLY after the agent requests it.
      // We stop at waiting_customer first so the customer chooses
      // a payment method BEFORE the receipt upload step.
      await this.workspaceService.updateRequest(
        this.selectedRequest.id,
        {
          amount_due: amount,
          payment_request_reason: reason,
          payment_requested_at: now,
          payment_status: 'pending',
          payment_method_code: null,
          payment_method_name: null,
          payment_type: null,
          payment_url: null,
          payment_fee_percent: 0,
          payment_fee_amount: 0,
          workflow_status: 'waiting_customer',
          next_follow_up_at: null,
          updated_at: now
        }
      );

      await this.addAutomaticNote(
        'payment',
        `تم طلب دفعة من العميل بقيمة ${amount.toLocaleString('ar-EG')} جنيه — السبب: ${reason} بواسطة ${
          this.currentUser?.full_name ||
          'موظف خدمة العملاء'
        }.`
      );

      this.paymentRequestForm = {
        amount: null,
        reason: ''
      };

      this.editForm.workflow_status =
        'waiting_customer';

      await this.loadRequests();
      this.refreshSelectedRequest();

    } catch (error) {
      console.error(
        'Request customer payment error:',
        error
      );

      this.errorMessage =
        'تعذر إرسال طلب الدفع للعميل.';

    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }


  get canStartPlaceConfirmation(): boolean {
    const workflow = String(
      this.editForm.workflow_status ||
      this.selectedRequest?.workflow_status ||
      ''
    );

    const paymentStatus = String(
      this.selectedRequest?.payment_status || ''
    ).toLowerCase();

    return (
      !this.saving &&
      (workflow === 'paid' || paymentStatus === 'paid')
    );
  }


  async startPlaceConfirmation(): Promise<void> {
    if (
      !this.selectedRequest?.id ||
      !this.currentUser?.id ||
      !this.canStartPlaceConfirmation
    ) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const now = new Date().toISOString();

      await this.workspaceService.updateRequest(
        this.selectedRequest.id,
        {
          workflow_status: 'waiting_place',
          next_follow_up_at: null,
          updated_at: now
        }
      );

      await this.addAutomaticNote(
        'place',
        `بدأ تأكيد الحجز مع المكان بواسطة ${
          this.currentUser?.full_name ||
          'موظف خدمة العملاء'
        }.`
      );

      this.editForm.workflow_status =
        'waiting_place';

      await this.loadRequests();
      this.refreshSelectedRequest();

    } catch (error) {
      console.error(
        'Start place confirmation error:',
        error
      );
      this.errorMessage =
        'تعذر بدء تأكيد الحجز مع المكان.';

    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }


  async confirmPlaceBooking(): Promise<void> {
    if (
      !this.selectedRequest?.id ||
      !this.currentUser?.id ||
      this.saving ||
      this.editForm.workflow_status !== 'waiting_place'
    ) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const now = new Date().toISOString();
      const reference =
        this.placeConfirmationForm.confirmationReference.trim();
      const note =
        this.placeConfirmationForm.note.trim();

      await this.workspaceService.updateRequest(
        this.selectedRequest.id,
        {
          workflow_status: 'booking_confirmed',
          booking_confirmed_at: now,
          next_follow_up_at: null,
          updated_at: now
        }
      );

      await this.addAutomaticNote(
        'booking',
        `تم تأكيد الحجز مع المكان${
          reference ? ` — رقم/مرجع التأكيد: ${reference}` : ''
        }${note ? ` — ملاحظة: ${note}` : ''} بواسطة ${
          this.currentUser?.full_name ||
          'موظف خدمة العملاء'
        }.`
      );

      this.editForm.workflow_status =
        'booking_confirmed';

      await this.loadRequests();
      this.refreshSelectedRequest();

    } catch (error) {
      console.error(
        'Confirm place booking error:',
        error
      );
      this.errorMessage =
        'تعذر تأكيد الحجز مع المكان.';

    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }


  async markPlaceUnavailable(): Promise<void> {
    if (
      !this.selectedRequest?.id ||
      !this.currentUser?.id ||
      this.saving ||
      this.editForm.workflow_status !== 'waiting_place'
    ) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const now = new Date().toISOString();
      const note =
        this.placeConfirmationForm.note.trim();

      await this.workspaceService.updateRequest(
        this.selectedRequest.id,
        {
          workflow_status: 'place_unavailable',
          updated_at: now
        }
      );

      await this.addAutomaticNote(
        'place',
        `المكان غير متاح للحجز${
          note ? ` — ملاحظة: ${note}` : ''
        } بواسطة ${
          this.currentUser?.full_name ||
          'موظف خدمة العملاء'
        }.`
      );

      this.editForm.workflow_status =
        'place_unavailable';

      await this.loadRequests();
      this.refreshSelectedRequest();

    } catch (error) {
      console.error(
        'Place unavailable error:',
        error
      );
      this.errorMessage =
        'تعذر تحديث حالة المكان.';

    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }


  // =========================================================
  // PAYMENT REVIEW FOR AGENT
  // =========================================================

  get hasPaymentReceipt(): boolean {
    return this.paymentReceipts.length > 0;
  }


  get latestPaymentReceipt(): any | null {
    return this.paymentReceipts[0] || null;
  }


  get paymentNeedsAgentReview(): boolean {
    const paymentStatus = String(
      this.selectedRequest?.payment_status || ''
    ).trim().toLowerCase();

    return (
      this.hasPaymentReceipt
      || [
        'receipt_uploaded',
        'uploaded',
        'submitted',
        'pending_review',
        'under_review',
        'paid'
      ].includes(paymentStatus)
    ) && ![
      'sent_to_accounts',
      'payment_review',
      'completed',
      'cancelled'
    ].includes(
      String(
        this.selectedRequest?.workflow_status ||
        this.editForm.workflow_status ||
        ''
      )
    );
  }


  get paymentReviewLabel(): string {
    const paymentStatus = String(
      this.selectedRequest?.payment_status || ''
    ).trim().toLowerCase();

    if (this.paymentNeedsAgentReview) {
      return 'تم الدفع / تم رفع الإيصال — يحتاج مراجعة';
    }

    const labels: Record<string, string> = {
      pending: 'الدفع لم يكتمل بعد',
      receipt_uploaded: 'تم رفع الإيصال',
      uploaded: 'تم رفع الإيصال',
      submitted: 'تم إرسال بيانات الدفع',
      pending_review: 'الدفع يحتاج مراجعة',
      under_review: 'الدفع قيد المراجعة',
      paid: 'تم تأكيد الدفع',
      rejected: 'تم رفض الدفع',
      refunded: 'تم رد المبلغ'
    };

    return labels[paymentStatus] || 'لا توجد حالة دفع مسجلة';
  }


  async refreshPaymentReceipts(): Promise<void> {
    if (!this.selectedRequest?.id) {
      return;
    }

    await this.loadPaymentReceipts(
      this.selectedRequest.id
    );
  }


  private async loadPaymentReceipts(
    requestId: string
  ): Promise<void> {
    this.receiptsLoading = true;
    this.receiptError = '';
    this.cdr.markForCheck();

    try {
      const { data, error } =
        await this.supabaseService.client
          .from('request_payment_receipts')
          .select(`
            id,
            request_id,
            file_path,
            file_name,
            mime_type,
            uploaded_at,
            status,
            review_notes
          `)
          .eq('request_id', requestId)
          .order('uploaded_at', {
            ascending: false
          });

      if (error) {
        console.error(
          'Agent payment receipts error:',
          error
        );
        this.receiptError =
          'تعذر تحميل إيصال الدفع.';
        this.paymentReceipts = [];
        return;
      }

      const rows = Array.isArray(data)
        ? data
        : [];

      const hydrated = await Promise.all(
        rows.map(async (receipt: any) => {
          if (!receipt?.file_path) {
            return {
              ...receipt,
              signed_url: null
            };
          }

          const {
            data: signedData,
            error: signedError
          } = await this.supabaseService.client.storage
            .from('payment-receipts')
            .createSignedUrl(
              receipt.file_path,
              60 * 60
            );

          if (signedError) {
            console.error(
              'Agent payment receipt signed URL error:',
              signedError
            );
          }

          return {
            ...receipt,
            signed_url:
              signedData?.signedUrl || null
          };
        })
      );

      this.paymentReceipts = hydrated;

    } catch (error) {
      console.error(
        'Agent payment receipts exception:',
        error
      );
      this.receiptError =
        'تعذر تحميل إيصال الدفع.';
      this.paymentReceipts = [];

    } finally {
      this.receiptsLoading = false;
      this.cdr.markForCheck();
    }
  }


  openPaymentReceipt(
    receipt: any
  ): void {
    const url = String(
      receipt?.signed_url || ''
    ).trim();

    if (!url) {
      this.receiptError =
        'تعذر فتح الإيصال حاليًا.';
      this.cdr.markForCheck();
      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  }


  // =========================================================
  // AGENT APPROVAL
  // =========================================================

  get canConfirmRequest(): boolean {
    if (!this.selectedRequest?.id || this.saving) {
      return false;
    }

    return ![
      'booking_confirmed',
      'sent_to_accounts',
      'payment_review',
      'paid',
      'completed',
      'cancelled'
    ].includes(
      String(
        this.editForm.workflow_status ||
        this.selectedRequest.workflow_status ||
        'new'
      )
    );
  }

  get canSendToAccounts(): boolean {
    return (
      !!this.selectedRequest?.id &&
      !this.saving &&
      String(
        this.editForm.workflow_status ||
        this.selectedRequest.workflow_status ||
        ''
      ) === 'booking_confirmed'
    );
  }

  get isAgentApproved(): boolean {
    return [
      'booking_confirmed',
      'sent_to_accounts',
      'payment_review',
      'paid',
      'completed'
    ].includes(
      String(
        this.editForm.workflow_status ||
        this.selectedRequest?.workflow_status ||
        ''
      )
    );
  }

  async confirmBooking(): Promise<void> {
    if (
      !this.selectedRequest?.id ||
      !this.currentUser?.id ||
      this.saving
    ) {
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const now = new Date().toISOString();

      // Agent approval is independent from payment.
      // Never change payment_status here.
      await this.workspaceService.updateRequest(
        this.selectedRequest.id,
        {
          workflow_status: 'booking_confirmed',
          booking_confirmed_at: now,
          next_follow_up_at: null,
          updated_at: now
        }
      );

      await this.addAutomaticNote(
        'booking',
        `تمت مراجعة واعتماد بيانات الطلب بواسطة ${
          this.currentUser?.full_name || 'موظف خدمة العملاء'
        }. الطلب جاهز للإرسال إلى الحسابات.`
      );

      this.editForm.workflow_status = 'booking_confirmed';
      this.editForm.next_follow_up_at = '';

      await this.loadRequests();
      this.refreshSelectedRequest();

    } catch (error) {
      console.error('Confirm request error:', error);
      this.errorMessage = 'تعذر اعتماد الطلب. حاولي مرة أخرى.';

    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }


  async sendToAccounts(): Promise<void> {
    if (
      !this.selectedRequest?.id ||
      !this.currentUser?.id ||
      this.saving
    ) {
      return;
    }

    const currentWorkflow = String(
      this.editForm.workflow_status ||
      this.selectedRequest.workflow_status ||
      'new'
    );

    // The request must be approved by the agent first.
    if (currentWorkflow !== 'booking_confirmed') {
      this.errorMessage =
        'راجعي بيانات الطلب واعتمديه أولًا قبل إرساله إلى الحسابات.';
      this.cdr.markForCheck();
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    try {
      const now = new Date().toISOString();
      const existingPaymentStatus =
        this.selectedRequest?.payment_status || null;

      await this.workspaceService.updateRequest(
        this.selectedRequest.id,
        {
          workflow_status: 'sent_to_accounts',
          // Preserve receipt_uploaded / paid / any existing payment state.
          payment_status: existingPaymentStatus || 'pending',
          sent_to_accounts_at: now,
          next_follow_up_at: null,
          updated_at: now
        }
      );

      await this.addAutomaticNote(
        'payment',
        `تم إرسال الطلب إلى قسم الحسابات بواسطة ${
          this.currentUser?.full_name || 'موظف خدمة العملاء'
        } بعد مراجعة واعتماد بيانات الطلب.`
      );

      this.editForm.workflow_status = 'sent_to_accounts';
      this.editForm.next_follow_up_at = '';

      await this.loadRequests();
      this.refreshSelectedRequest();

    } catch (error) {
      console.error('Send to accounts error:', error);
      this.errorMessage = 'تعذر إرسال الطلب إلى الحسابات.';

    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }


  async completeRequest(): Promise<void> {

    if (
      !this.selectedRequest?.id ||
      !this.currentUser?.id
    ) {

      return;

    }


    const workflowStatus =
      this.editForm
        .workflow_status;


    if (
      workflowStatus !== 'booking_confirmed'
    ) {
      console.warn(
        'Request cannot be completed before agent approval / payment completion.'
      );
      this.errorMessage =
        'لا يمكن إنهاء الطلب قبل تأكيد الحجز مع المكان.';
      return;
    }


    this.saving = true;

    this.errorMessage = '';

    this.cdr.markForCheck();


    try {

      await this.addAutomaticNote(
        'booking',

        `تم إنهاء الطلب بنجاح بواسطة ${
          this.currentUser
            ?.full_name ||
          'موظف خدمة العملاء'
        }.`
      );


      await this.workspaceService
        .updateRequest(
          this.selectedRequest.id,
          {

            status:
              'completed',

            workflow_status:
              'completed',

            next_follow_up_at:
              null,

            updated_at:
              new Date()
                .toISOString()

          }
        );


      if (
        this.selectedAssignment?.id
      ) {

        await this.workspaceService
          .updateAssignmentStatus(
            this.selectedAssignment.id,
            'completed',
            this.currentUser.id
          );

      }


      this.selectedRequest = null;

      this.selectedAssignment = null;

      this.notes = [];


      await this.loadRequests();


    } catch (error) {

      console.error(
        'Complete request error:',
        error
      );


      this.errorMessage =
        'تعذر إنهاء الطلب. حاولي مرة أخرى.';


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  private async addAutomaticNote(
    noteType: NoteType,
    content: string
  ): Promise<void> {

    if (
      !this.selectedRequest?.id ||
      !this.currentUser?.id
    ) {

      return;

    }


    try {

      await this.workspaceService
        .createRequestNote({

          request_id:
            this.selectedRequest.id,

          user_id:
            this.currentUser.id,

          note_type:
            noteType,

          content

        });


      this.notes =
        await this.workspaceService
          .getRequestNotes(
            this.selectedRequest.id
          );


    } catch (error) {

      console.error(
        'Automatic note error:',
        error
      );

    }

  }


  // =========================================================
  // CUSTOMER CHAT
  // =========================================================

  async openChatTab(): Promise<void> {

    this.drawerTab = 'chat';

    if (
      this.selectedRequest?.id &&
      !this.chatSession
    ) {
      await this.reloadChat();
    }

  }


  openDetailsTab(): void {
    this.drawerTab = 'details';
  }


  get isChatClosed(): boolean {
    return [
      'completed',
      'cancelled'
    ].includes(
      this.editForm.workflow_status
    );
  }


  get agentOwnsChat(): boolean {
    return (
      !!this.currentUser?.id &&
      !!this.chatSession?.assigned_agent_id &&
      String(this.chatSession.assigned_agent_id) ===
        String(this.currentUser.id) &&
      this.chatSession?.conversation_mode === 'agent' &&
      this.chatSession?.bot_paused === true
    );
  }


  get canTakeChat(): boolean {
    return (
      !!this.selectedRequest?.id &&
      !this.isChatClosed &&
      !this.agentOwnsChat
    );
  }


  async reloadChat(): Promise<void> {

    if (!this.selectedRequest?.id) {
      return;
    }

    this.chatLoading = true;
    this.chatError = '';
    this.cdr.markForCheck();

    try {
      const payload =
        await this.workspaceService
          .getRequestChat(
            this.selectedRequest.id
          );

      this.applyChatPayload(payload);
      await this.startChatRealtime();

    } catch (error) {
      console.error(
        'Load request chat error:',
        error
      );

      this.chatError =
        'تعذر تحميل محادثة العميل.';

    } finally {
      this.chatLoading = false;
      this.cdr.markForCheck();
    }

  }


  async takeChat(): Promise<void> {

    if (
      !this.selectedRequest?.id ||
      this.chatSending ||
      this.isChatClosed
    ) {
      return;
    }

    this.chatSending = true;
    this.chatError = '';
    this.cdr.markForCheck();

    try {
      await this.workspaceService
        .takeRequestChat(
          this.selectedRequest.id
        );

      if (
        this.selectedAssignment?.status ===
        'assigned'
      ) {
        await this.workspaceService
          .updateAssignmentStatus(
            this.selectedAssignment.id,
            'in_progress',
            this.currentUser.id
          );

        this.selectedAssignment.status =
          'in_progress';
      }

      await this.reloadChat();

    } catch (error: any) {
      console.error(
        'Take chat error:',
        error
      );

      this.chatError =
        error?.message ||
        'تعذر استلام المحادثة.';

    } finally {
      this.chatSending = false;
      this.cdr.markForCheck();
    }

  }


  async sendChatMessage(): Promise<void> {

    const message =
      this.chatMessage.trim();

    if (
      !message ||
      !this.selectedRequest?.id ||
      !this.agentOwnsChat ||
      this.chatSending ||
      this.isChatClosed
    ) {
      return;
    }

    this.chatSending = true;
    this.chatError = '';
    this.cdr.markForCheck();

    try {
      await this.workspaceService
        .sendRequestChatMessage(
          this.selectedRequest.id,
          message
        );

      this.chatMessage = '';

    } catch (error: any) {
      console.error(
        'Send agent chat message error:',
        error
      );

      this.chatError =
        error?.message ||
        'تعذر إرسال الرسالة.';

    } finally {
      this.chatSending = false;
      this.cdr.markForCheck();
    }

  }


 onAgentChatEnter(event: Event): void {

  const keyboardEvent =
    event as KeyboardEvent;

  // Shift + Enter = سطر جديد
  if (keyboardEvent.shiftKey) {
    return;
  }

  keyboardEvent.preventDefault();

  if (
    this.chatSending ||
    this.agentChatMediaUploading ||
    this.agentVoiceRecording ||
    !this.chatMessage.trim()
  ) {
    return;
  }

  void this.sendChatMessage();
}


  async requestPaymentReceiptFromCustomer(): Promise<void> {
    if (
      !this.selectedRequest?.id ||
      !this.agentOwnsChat ||
      this.chatSending ||
      this.isChatClosed
    ) {
      return;
    }

    this.chatSending = true;
    this.chatError = '';
    this.cdr.markForCheck();

    try {
      // Asking for the receipt must never send the request to accounts.
      await this.workspaceService.sendRequestChatMessage(
        this.selectedRequest.id,
        '💳 لو تم الدفع، ارفعي إيصال الدفع من زر رفع الإيصال داخل المحادثة. الإيصال هيتحفظ مع طلبك، وبعد مراجعة واعتماد بيانات الطلب من فريق تساهيل هيتم إرساله للحسابات للمراجعة.'
      );

      await this.addAutomaticNote(
        'payment',
        `تم طلب إيصال الدفع من العميل بواسطة ${
          this.currentUser?.full_name || 'موظف خدمة العملاء'
        } بدون تغيير مرحلة الطلب أو إرساله للحسابات.`
      );

      await this.reloadChat();

    } catch (error: any) {
      console.error('Request payment receipt error:', error);
      this.chatError = error?.message || 'تعذر طلب إيصال الدفع.';

    } finally {
      this.chatSending = false;
      this.cdr.markForCheck();
    }
  }


  get canSendAgentChatMedia(): boolean {
    return (
      this.agentOwnsChat &&
      !this.isChatClosed &&
      !this.chatSending &&
      !this.agentChatMediaUploading
    );
  }


  async onAgentChatImageSelected(
    event: Event
  ): Promise<void> {

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0] || null;

    input.value = '';

    if (
      !file ||
      !this.canSendAgentChatMedia
    ) {
      return;
    }

    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowed.includes(file.type)) {
      this.chatError =
        'مسموح بصور JPG / PNG / WEBP فقط.';
      this.cdr.markForCheck();
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      this.chatError =
        'حجم الصورة لازم يكون أقل من 8 MB.';
      this.cdr.markForCheck();
      return;
    }

    await this.uploadAgentChatMedia(
      file,
      'image'
    );
  }


  async toggleAgentVoiceRecording(): Promise<void> {

    if (this.agentVoiceRecording) {
      return;
    }

    if (!this.canSendAgentChatMedia) {
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      this.chatError =
        'تسجيل الصوت غير مدعوم على هذا المتصفح.';
      this.cdr.markForCheck();
      return;
    }

    try {
      this.chatError = '';

      this.agentVoiceStream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        });

      const preferredType =
        MediaRecorder.isTypeSupported(
          'audio/webm;codecs=opus'
        )
          ? 'audio/webm;codecs=opus'
          : '';

      this.agentMediaRecorder =
        preferredType
          ? new MediaRecorder(
              this.agentVoiceStream,
              { mimeType: preferredType }
            )
          : new MediaRecorder(
              this.agentVoiceStream
            );

      this.agentVoiceChunks = [];
      this.agentVoiceStartedAt = Date.now();
      this.agentVoiceSeconds = 0;

      this.agentMediaRecorder.ondataavailable =
        event => {
          if (event.data.size > 0) {
            this.agentVoiceChunks.push(
              event.data
            );
          }
        };

      this.agentMediaRecorder.onstop =
        async () => {
          const shouldSend =
            this.agentVoiceChunks.length > 0;

          const mimeType =
            this.agentMediaRecorder?.mimeType ||
            'audio/webm';

          const duration =
            Math.max(
              1,
              Math.round(
                (Date.now() -
                  this.agentVoiceStartedAt) /
                  1000
              )
            );

          const blob =
            new Blob(
              this.agentVoiceChunks,
              { type: mimeType }
            );

          this.cleanupAgentVoiceRecorder();

          if (
            shouldSend &&
            blob.size > 0
          ) {
            const file =
              new File(
                [blob],
                `voice-${Date.now()}.webm`,
                { type: mimeType }
              );

            await this.uploadAgentChatMedia(
              file,
              'voice',
              duration
            );
          }
        };

      this.agentMediaRecorder.start();
      this.agentVoiceRecording = true;

      this.agentVoiceTimer =
        setInterval(() => {
          this.agentVoiceSeconds =
            Math.max(
              0,
              Math.floor(
                (Date.now() -
                  this.agentVoiceStartedAt) /
                  1000
              )
            );
          this.cdr.markForCheck();
        }, 500);

      this.cdr.markForCheck();

    } catch (error) {
      console.error(
        'Agent voice recording error:',
        error
      );

      this.cleanupAgentVoiceRecorder();

      this.chatError =
        'تعذر تشغيل الميكروفون. تأكدي من صلاحية الميكروفون.';

      this.cdr.markForCheck();
    }
  }


  sendAgentVoiceRecording(): void {
    if (!this.agentVoiceRecording || this.agentChatMediaUploading) {
      return;
    }

    this.stopAgentVoiceRecording(true);
  }


  cancelAgentVoiceRecording(): void {
    if (!this.agentVoiceRecording) {
      return;
    }

    this.agentVoiceChunks = [];
    this.stopAgentVoiceRecording(false);
  }


  private stopAgentVoiceRecording(
    send: boolean
  ): void {

    if (!this.agentMediaRecorder) {
      this.cleanupAgentVoiceRecorder();
      return;
    }

    if (!send) {
      this.agentVoiceChunks = [];
    }

    if (
      this.agentMediaRecorder.state !==
      'inactive'
    ) {
      this.agentMediaRecorder.stop();
    } else {
      this.cleanupAgentVoiceRecorder();
    }
  }


  private cleanupAgentVoiceRecorder(): void {

    if (this.agentVoiceTimer) {
      clearInterval(
        this.agentVoiceTimer
      );
      this.agentVoiceTimer = null;
    }

    this.agentVoiceStream
      ?.getTracks()
      .forEach(track =>
        track.stop()
      );

    this.agentVoiceStream = null;
    this.agentMediaRecorder = null;
    this.agentVoiceChunks = [];
    this.agentVoiceRecording = false;
    this.agentVoiceSeconds = 0;

    this.cdr.markForCheck();
  }


  formatVoiceSeconds(
    seconds: number
  ): string {

    const safe =
      Math.max(
        0,
        Number(seconds || 0)
      );

    const minutes =
      Math.floor(safe / 60);

    const remain =
      Math.floor(safe % 60);

    return `${minutes}:${String(remain).padStart(2, '0')}`;
  }


  private async uploadAgentChatMedia(
    file: File,
    type: 'image' | 'voice',
    durationSeconds: number | null = null
  ): Promise<void> {

    if (
      !this.selectedRequest?.id ||
      !this.chatSession?.id ||
      !this.agentOwnsChat ||
      this.agentChatMediaUploading
    ) {
      return;
    }

    this.agentChatMediaUploading = true;
    this.chatError = '';
    this.cdr.markForCheck();

    try {
      const sent =
        await this.workspaceService.uploadRequestChatMedia(
          this.selectedRequest.id,
          this.chatSession.id,
          file,
          type,
          durationSeconds
        );

      if (sent?.id) {
        const exists = this.chatMessages.some(
          item => String(item?.id) === String(sent.id)
        );

        if (!exists) {
          this.chatMessages = [
            ...this.chatMessages,
            sent
          ];
        } else {
          this.chatMessages = this.chatMessages.map(
            item => String(item?.id) === String(sent.id)
              ? { ...item, ...sent }
              : item
          );
        }
      }

      this.cdr.markForCheck();

    } catch (error: any) {
      console.error('Agent chat media upload error:', error);
      this.chatError =
        error?.message ||
        'تعذر إرسال الملف في المحادثة.';

    } finally {
      this.agentChatMediaUploading = false;
      this.cdr.markForCheck();
    }
  }


  async releaseChat(): Promise<void> {

    if (
      !this.selectedRequest?.id ||
      !this.agentOwnsChat ||
      this.chatSending
    ) {
      return;
    }

    this.chatSending = true;
    this.chatError = '';
    this.cdr.markForCheck();

    try {
      await this.workspaceService
        .releaseRequestChat(
          this.selectedRequest.id
        );

      await this.reloadChat();

    } catch (error: any) {
      console.error(
        'Release chat error:',
        error
      );

      this.chatError =
        error?.message ||
        'تعذر إرجاع المحادثة للبوت.';

    } finally {
      this.chatSending = false;
      this.cdr.markForCheck();
    }

  }


  private applyChatPayload(
    payload: any
  ): void {

    this.chatSession =
      payload?.session || null;

    this.chatMessages =
      Array.isArray(payload?.messages)
        ? payload.messages
        : [];

    void this.hydrateChatMediaUrls();

  }


  private async hydrateChatMediaUrls(): Promise<void> {
    if (!this.selectedRequest?.id) {
      return;
    }

    try {
      const mediaRows =
        await this.workspaceService.getRequestChatMedia(
          this.selectedRequest.id
        );

      const byId = new Map(
        mediaRows.map((row: any) => [String(row.id), row])
      );

      this.chatMessages = this.chatMessages.map(message => {
        const media = byId.get(String(message.id));
        return media ? { ...message, ...media } : message;
      });

      const mediaMessages = this.chatMessages.filter(
        message => message?.media_path && !message?.media_url
      );

      for (const message of mediaMessages) {
        const signedUrl =
          await this.workspaceService.createChatMediaSignedUrl(
            message.media_path
          );

        if (signedUrl) {
          message.media_url = signedUrl;
        }
      }

      this.cdr.markForCheck();

    } catch (error) {
      console.error('Hydrate chat media error:', error);
    }
  }


  private async startChatRealtime(): Promise<void> {

    if (!this.chatSession?.id) {
      return;
    }

    // Important: fully remove the old subscription before creating
    // a new one. This prevents Supabase from reusing a subscribed
    // channel and throwing "cannot add postgres_changes callbacks
    // after subscribe()" when the chat is taken/released repeatedly.
    await this.stopChatRealtime();

    const sessionId = String(this.chatSession.id);

    this.chatChannel =
      this.workspaceService
        .subscribeToRequestChat(
          sessionId,
          message => {

            if (
              this.chatMessages.some(
                item =>
                  String(item.id) ===
                  String(message.id)
              )
            ) {
              return;
            }

            this.chatMessages = [
              ...this.chatMessages,
              message
            ];

            if (message?.media_path) {
              void this.hydrateChatMediaUrls();
            }

            this.cdr.markForCheck();
          },
          session => {
            this.chatSession = {
              ...(this.chatSession || {}),
              ...session
            };

            this.cdr.markForCheck();
          }
        );

  }


  private async stopChatRealtime(): Promise<void> {

    if (!this.chatChannel) {
      return;
    }

    await this.workspaceService
      .removeChannel(
        this.chatChannel
      );

    this.chatChannel = null;

  }


  getChatSenderLabel(
    message: any
  ): string {

    const sender =
      String(message?.sender || '');

    if (sender === 'user') {
      return (
        this.selectedRequest?.name ||
        this.editForm?.name ||
        'العميل'
      );
    }

    if (
      sender === 'bot' ||
      sender === 'system'
    ) {
      return 'تساهيل';
    }

    if (sender === 'agent') {
      return (
        message?.sender_name ||
        message?.agent_name ||
        this.currentUser?.full_name ||
        'فريق تساهيل'
      );
    }

    return 'تساهيل';

  }


  trackByChatMessage(
    index: number,
    message: any
  ): string | number {

    return message?.id || index;

  }


  // =========================================================
  // REQUEST PRICE SUMMARY
  // =========================================================

  onGuestsChanged(): void {
    const guests = Math.max(1, Number(this.editForm.guests || 1));
    this.editForm.guests = guests;
    const unit = this.toNullableMoney(this.editForm.unit_price);
    if (unit !== null) this.editForm.total_price = unit * guests;
  }

  onUnitPriceChanged(): void {
    const unit = this.toNullableMoney(this.editForm.unit_price);
    const guests = Math.max(1, Number(this.editForm.guests || 1));
    this.editForm.total_price = unit === null ? null : unit * guests;
  }

  onTotalPriceChanged(): void {
    const total = this.toNullableMoney(this.editForm.total_price);
    const guests = Math.max(1, Number(this.editForm.guests || 1));
    this.editForm.unit_price = total === null ? null : total / guests;
  }

  private resolveUnitPrice(row: any): number | null {
    const direct = this.toNullableMoney(row?.selling_price_snapshot ?? row?.unit_price);
    if (direct !== null) return direct;
    const total = this.toNullableMoney(row?.total_selling_price);
    const guests = Number(row?.guests || 0);
    return total !== null && guests > 0 ? total / guests : null;
  }

  private resolveTotalPrice(row: any): number | null {
    const direct = this.toNullableMoney(row?.total_selling_price);
    if (direct !== null) return direct;
    const unit = this.resolveUnitPrice(row);
    const guests = Number(row?.guests || 0);
    return unit !== null && guests > 0 ? unit * guests : null;
  }

  private toNullableMoney(value: any): number | null {
    if (value === null || value === undefined || value === '') return null;
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? amount : null;
  }


  ngOnDestroy(): void {
    void this.stopChatRealtime();
    this.cleanupAgentVoiceRecorder();
  }


  getWorkflowLabel(
    status:
      string |
      null |
      undefined
  ): string {

    const labels:
      Record<string, string> = {

        new:
          'طلب جديد',

        contacting:
          'قيد التواصل',

        waiting_customer:
          'في انتظار العميل',

        waiting_payment_receipt:
          'في انتظار إيصال الدفع',

        needs_customer_action:
          'مطلوب إجراء من العميل',

        waiting_place:
          'في انتظار المكان',

        follow_up:
          'متابعة لاحقة',

        booking_confirmed:
          'تم تأكيد الحجز',

        sent_to_accounts:
          'في انتظار الحسابات',

        payment_review:
          'الحسابات تراجع الدفع',

        paid:
          'تم الدفع — يحتاج مراجعة',

        completed:
          'مكتمل',

        cancelled:
          'ملغي',

        refunded:
          'تم الاسترداد'

      };


    return (
      labels[
        status || ''
      ] ||
      'غير محدد'
    );

  }


  getNoteLabel(
    type:
      string |
      null |
      undefined
  ): string {

    const item =
      this.noteTypes.find(
        note =>
          note.value === type
      );


    return (
      item?.label ||
      'تحديث'
    );

  }


  isFollowUpDue(
    row: any
  ): boolean {

    if (
      !row?.next_follow_up_at
    ) {

      return false;

    }


    return (
      new Date(
        row.next_follow_up_at
      ).getTime()
      <=
      Date.now()
    );

  }


  getFollowUpLabel(
    row: any
  ): string {

    if (
      !row?.next_follow_up_at
    ) {

      return '';

    }


    if (
      this.isFollowUpDue(row)
    ) {

      return 'متابعة مستحقة';

    }


    return 'متابعة مجدولة';

  }


  private refreshSelectedRequest(): void {

    if (
      !this.selectedRequest
    ) {

      return;

    }


    const refreshed =
      this.rows.find(
        row =>
          row.id ===
          this.selectedRequest.id
      );


    if (
      refreshed
    ) {

      this.selectedRequest =
        refreshed;

      this.selectedAssignment =
        refreshed.assignment;

    }

  }


  private clean(
    value: any
  ): string | null {

    const cleaned =
      String(
        value || ''
      ).trim();


    return cleaned || null;

  }


  private toDateTimeLocal(
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


    const offset =
      date.getTimezoneOffset();


    const localDate =
      new Date(
        date.getTime() -
        offset * 60000
      );


    return localDate
      .toISOString()
      .slice(
        0,
        16
      );

  }


  trackByRequestId(
    index: number,
    row: any
  ): string | number {

    return (
      row?.id ||
      index
    );

  }


  trackByNoteId(
    index: number,
    note: any
  ): string | number {

    return (
      note?.id ||
      index
    );

  }

}