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
  RealtimeChannel
} from '@supabase/supabase-js';

import {
  SupabaseService
} from '../../services/supabase.service';

import {
  AuthService
} from '../../services/auth.service';

import {
  AgentWorkspaceService
} from '../services/agent-workspace.service';


type WorkspaceTab =
  | 'current'
  | 'follow_up'
  | 'handoff'
  | 'closed';


type NoteType =
  | 'call'
  | 'follow_up'
  | 'booking'
  | 'customer'
  | 'place'
  | 'payment'
  | 'internal';


@Component({
  selector: 'app-agent-dashboard',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './agent-dashboard.html',

  styleUrl:
    './agent-dashboard.css'
})
export class AgentDashboardComponent
implements OnInit, OnDestroy {

  currentUser: any = null;

  assignments: any[] = [];

  requests: any[] = [];

  notes: any[] = [];


  // =========================================================
  // CUSTOMER CHAT
  // =========================================================

  chatSession: any = null;

  chatMessages: any[] = [];

  chatMessage = '';

  chatLoading = false;

  chatSending = false;

  chatActionLoading = false;

  chatError = '';

  private chatRealtimeChannel:
    RealtimeChannel | null = null;


  loading = true;

  drawerLoading = false;

  saving = false;

  noteSaving = false;

  errorMessage = '';


  activeTab:
    WorkspaceTab =
      'current';


  selectedRequest:
    any = null;

  selectedAssignment:
    any = null;


  editForm: any = {

    name: '',
    phone: '',
    place_name: '',
    date: '',
    time: '',
    guests: 1,
    package: '',
    extras: '',
    budget: null,
    area: '',
    notes: '',
    workflow_status: 'new',
    next_follow_up_at: ''

  };


  noteForm = {

    note_type:
      'call' as NoteType,

    content: ''

  };


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


  constructor(
    private authService:
      AuthService,

    private workspaceService:
      AgentWorkspaceService,

    private supabaseService:
      SupabaseService,

    private cdr:
      ChangeDetectorRef
  ) {}


  async ngOnInit():
    Promise<void> {

    await this.loadWorkspace();

  }


  // =========================================================
  // LOAD
  // =========================================================

  async loadWorkspace():
    Promise<void> {

    this.loading = true;

    this.errorMessage = '';

    this.cdr.markForCheck();


    try {

      const user =
        await this.authService
          .getCurrentAdminUser();


      if (
        !user ||
        user.role !== 'agent'
      ) {

        throw new Error(
          'INVALID_AGENT'
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


    } catch (error) {

      console.error(
        'Workspace error:',
        error
      );

      this.errorMessage =
        'تعذر تحميل مساحة العمل.';

    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // ROWS
  // =========================================================

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


  // =========================================================
  // WORK QUEUES
  // =========================================================

  private readonly capacityStatuses = [
    'new',
    'contacting',
    'waiting_customer',
    'waiting_payment_receipt'
  ];

  private readonly followUpStatuses = [
    'follow_up',
    'needs_customer_action'
  ];

  private readonly handoffStatuses = [
    'sent_to_accounts',
    'payment_review',
    'paid',
    'waiting_place',
    'booking_confirmed',
    'refund_pending',
    'place_unavailable'
  ];

  private readonly closedStatuses = [
    'completed',
    'cancelled',
    'refunded'
  ];

  get currentWorkRows(): any[] {
    return this.rows.filter(row =>
      this.capacityStatuses.includes(
        row.workflow_status || 'new'
      )
    );
  }

  get followUpRows(): any[] {
    return this.rows.filter(row =>
      this.followUpStatuses.includes(
        row.workflow_status
      )
    );
  }

  get handoffRows(): any[] {
    return this.rows.filter(row =>
      this.handoffStatuses.includes(
        row.workflow_status
      )
    );
  }

  get closedRows(): any[] {
    return this.rows.filter(row =>
      this.closedStatuses.includes(
        row.workflow_status
      )
    );
  }

  get visibleRows(): any[] {
    switch (this.activeTab) {
      case 'follow_up':
        return this.followUpRows;

      case 'handoff':
        return this.handoffRows;

      case 'closed':
        return this.closedRows;

      default:
        return this.currentWorkRows;
    }
  }

  setTab(tab: WorkspaceTab): void {
    this.activeTab = tab;
  }

  // =========================================================
  // COUNTS / CAPACITY
  // =========================================================

  get maxCapacity(): number {
    return Number(
      this.currentUser?.max_active_requests ||
      this.currentUser?.max_open_requests ||
      10
    );
  }

  get activeCount(): number {
    // IMPORTANT: must match the database auto-assignment rule.
    return this.currentWorkRows.length;
  }

  get remainingCapacity(): number {
    return Math.max(
      0,
      this.maxCapacity - this.activeCount
    );
  }

  get needsActionCount(): number {
    return this.currentWorkRows.filter(row =>
      ['new', 'contacting'].includes(
        row.workflow_status || 'new'
      )
    ).length;
  }

  get waitingCustomerCount(): number {
    return this.currentWorkRows.filter(row =>
      ['waiting_customer', 'waiting_payment_receipt'].includes(
        row.workflow_status
      )
    ).length;
  }

  get outsideCapacityCount(): number {
    return this.followUpRows.length +
      this.handoffRows.length;
  }

  isCountedInCapacity(row: any): boolean {
    return this.capacityStatuses.includes(
      row?.workflow_status || 'new'
    );
  }

  getTabTitle(): string {
    const labels: Record<WorkspaceTab, string> = {
      current: 'شغلي الحالي',
      follow_up: 'المتابعات',
      handoff: 'قيد التنفيذ بعد التسليم',
      closed: 'الطلبات المنتهية'
    };

    return labels[this.activeTab];
  }

  getTabDescription(): string {
    const labels: Record<WorkspaceTab, string> = {
      current: 'الطلبات التي تشغل جزءًا من سعتك الحالية',
      follow_up: 'طلبات تحتاج رجوع منك لكنها لا تُحسب من سعتك',
      handoff: 'طلبات خرجت من سعتك وما زالت تُستكمل مع الحسابات أو المكان',
      closed: 'الطلبات المكتملة أو الملغاة أو المستردة'
    };

    return labels[this.activeTab];
  }

  // =========================================================
  // OPEN DRAWER
  // =========================================================

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

      date:
        row.date || '',

      time:
        row.time
          ? String(row.time)
              .slice(0, 5)
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

      area:
        row.area || '',

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
      note_type: 'call',
      content: ''
    };


    this.drawerLoading = true;

    this.notes = [];

    this.chatSession = null;

    this.chatMessages = [];

    this.chatMessage = '';

    this.chatError = '';

    await this.removeChatRealtimeChannel();


    try {

      this.notes =
        await this.workspaceService
          .getRequestNotes(
            row.id
          );


      await this.loadRequestChat();


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


    this.selectedRequest = null;

    this.selectedAssignment = null;

    this.notes = [];

    this.chatSession = null;

    this.chatMessages = [];

    this.chatMessage = '';

    this.chatError = '';

    void this.removeChatRealtimeChannel();

  }


  // =========================================================
  // CUSTOMER CHAT
  // =========================================================

  async loadRequestChat():
    Promise<void> {

    if (!this.selectedRequest?.id) {
      return;
    }

    this.chatLoading = true;
    this.chatError = '';
    this.cdr.markForCheck();

    try {

      const { data, error } =
        await this.supabaseService.client
          .rpc(
            'agent_get_request_chat',
            {
              p_request_id:
                this.selectedRequest.id
            }
          );

      if (error) {
        throw error;
      }

      this.chatSession =
        data?.session || null;

      this.chatMessages =
        Array.isArray(data?.messages)
          ? data.messages
          : [];

      await this.subscribeToRequestChat();

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


  async takeOverChat():
    Promise<void> {

    if (
      !this.selectedRequest?.id ||
      this.chatActionLoading ||
      this.isChatReadOnly
    ) {
      return;
    }

    this.chatActionLoading = true;
    this.chatError = '';
    this.cdr.markForCheck();

    try {

      const { error } =
        await this.supabaseService.client
          .rpc(
            'agent_take_request_chat',
            {
              p_request_id:
                this.selectedRequest.id
            }
          );

      if (error) {
        throw error;
      }

      await this.loadRequestChat();

    } catch (error) {

      console.error(
        'Take over chat error:',
        error
      );

      this.chatError =
        'تعذر استلام المحادثة.';

    } finally {

      this.chatActionLoading = false;
      this.cdr.markForCheck();

    }

  }


  async releaseChat():
    Promise<void> {

    if (
      !this.selectedRequest?.id ||
      this.chatActionLoading ||
      this.isChatReadOnly
    ) {
      return;
    }

    this.chatActionLoading = true;
    this.chatError = '';
    this.cdr.markForCheck();

    try {

      const { error } =
        await this.supabaseService.client
          .rpc(
            'agent_release_request_chat',
            {
              p_request_id:
                this.selectedRequest.id
            }
          );

      if (error) {
        throw error;
      }

      await this.loadRequestChat();

    } catch (error) {

      console.error(
        'Release chat error:',
        error
      );

      this.chatError =
        'تعذر إعادة المحادثة للبوت.';

    } finally {

      this.chatActionLoading = false;
      this.cdr.markForCheck();

    }

  }


  async sendChatMessage():
    Promise<void> {

    if (
      !this.selectedRequest?.id ||
      !this.canSendChatMessage ||
      this.chatSending
    ) {
      return;
    }

    const message =
      this.chatMessage.trim();

    if (!message) {
      return;
    }

    this.chatSending = true;
    this.chatError = '';
    this.cdr.markForCheck();

    try {

      const { error } =
        await this.supabaseService.client
          .rpc(
            'agent_send_request_message',
            {
              p_request_id:
                this.selectedRequest.id,

              p_message:
                message
            }
          );

      if (error) {
        throw error;
      }

      this.chatMessage = '';

      // Realtime usually adds the message immediately.
      // Reload is a safe fallback if Realtime is delayed.
      window.setTimeout(
        () => {
          void this.loadRequestChat();
        },
        350
      );

    } catch (error) {

      console.error(
        'Send agent chat message error:',
        error
      );

      this.chatError =
        'تعذر إرسال الرسالة للعميل.';

    } finally {

      this.chatSending = false;
      this.cdr.markForCheck();

    }

  }


  get isChatOwnedByMe():
    boolean {

    return Boolean(
      this.chatSession &&
      this.currentUser?.id &&
      this.chatSession.assigned_agent_id ===
        this.currentUser.id &&
      this.chatSession.conversation_mode ===
        'agent' &&
      this.chatSession.bot_paused === true
    );

  }


  get isChatReadOnly():
    boolean {

    return [
      'completed',
      'cancelled'
    ].includes(
      this.editForm.workflow_status
    );

  }


  get canSendChatMessage():
    boolean {

    return (
      this.isChatOwnedByMe &&
      !this.isChatReadOnly &&
      Boolean(this.chatMessage.trim())
    );

  }


  getChatSenderLabel(
    sender: string
  ): string {

    const labels:
      Record<string, string> = {

      user: 'العميل',
      bot: 'بوت تساهيل',
      agent: 'فريق تساهيل',
      system: 'النظام'

    };

    return labels[sender] ||
      'رسالة';

  }


  private async subscribeToRequestChat():
    Promise<void> {

    await this.removeChatRealtimeChannel();

    if (!this.chatSession?.id) {
      return;
    }

    const sessionId =
      this.chatSession.id;

    this.chatRealtimeChannel =
      this.supabaseService.client
        .channel(
          `agent-request-chat-${sessionId}`
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${sessionId}`
          },
          payload => {

            const message =
              payload.new as any;

            if (
              !message?.id ||
              this.chatMessages.some(
                item =>
                  item.id === message.id
              )
            ) {
              return;
            }

            this.chatMessages = [
              ...this.chatMessages,
              message
            ];

            this.cdr.markForCheck();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_sessions',
            filter: `id=eq.${sessionId}`
          },
          payload => {

            this.chatSession = {
              ...(this.chatSession || {}),
              ...(payload.new as any)
            };

            this.cdr.markForCheck();
          }
        )
        .subscribe();

  }


  private async removeChatRealtimeChannel():
    Promise<void> {

    if (!this.chatRealtimeChannel) {
      return;
    }

    await this.supabaseService.client
      .removeChannel(
        this.chatRealtimeChannel
      );

    this.chatRealtimeChannel = null;

  }


  ngOnDestroy(): void {

    void this.removeChatRealtimeChannel();

  }


  // =========================================================
  // SAVE
  // =========================================================

  async saveRequest():
    Promise<void> {

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
                .name.trim(),

            phone:
              this.editForm
                .phone.trim(),

            place_name:
              this.editForm
                .place_name.trim(),

            date:
              this.editForm.date ||
              null,

            time:
              this.editForm.time ||
              null,

            guests:
              Number(
                this.editForm.guests ||
                1
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
                '' ||
              this.editForm.budget ===
                null
                ? null
                : Number(
                    this.editForm
                      .budget
                  ),

            area:
              this.clean(
                this.editForm.area
              ),

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


      await this.loadWorkspace();


      this.refreshSelectedRequest();


    } catch (error) {

      console.error(
        'Save request:',
        error
      );

    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // ADD NOTE
  // =========================================================

  async addNote():
    Promise<void> {

    if (
      !this.selectedRequest?.id ||
      !this.currentUser?.id
    ) {
      return;
    }


    const content =
      this.noteForm
        .content.trim();


    if (!content) {
      return;
    }


    this.noteSaving = true;


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
        'Add note:',
        error
      );

    } finally {

      this.noteSaving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // START CONTACT
  // =========================================================

  async startContacting():
    Promise<void> {

    if (
      !this.selectedRequest
    ) {
      return;
    }


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


    this.editForm
      .workflow_status =
        'contacting';


    await this.saveRequest();

  }


  // =========================================================
  // WAITING
  // =========================================================

  async waitingCustomer():
    Promise<void> {

    this.editForm
      .workflow_status =
        'waiting_customer';

    await this.saveRequest();

  }


  async waitingPlace():
    Promise<void> {

    this.editForm
      .workflow_status =
        'waiting_place';

    await this.saveRequest();

  }


  async scheduleFollowUp():
    Promise<void> {

    if (
      !this.editForm
        .next_follow_up_at
    ) {
      return;
    }


    this.editForm
      .workflow_status =
        'follow_up';


    await this.saveRequest();

  }


  // =========================================================
  // CONFIRM BOOKING
  // =========================================================

  async confirmBooking():
    Promise<void> {

    if (
      !this.selectedRequest?.id
    ) {
      return;
    }


    this.saving = true;


    try {

      await this.workspaceService
        .updateRequest(
          this.selectedRequest.id,
          {
            workflow_status:
              'booking_confirmed',

            booking_confirmed_at:
              new Date()
                .toISOString(),

            next_follow_up_at:
              null
          }
        );


      this.editForm
        .workflow_status =
          'booking_confirmed';


     await this.addAutomaticNote(
  'booking',
  `تم تأكيد الحجز بواسطة ${
    this.currentUser?.full_name || 'موظف خدمة العملاء'
  }.`
);


      await this.loadWorkspace();

      this.refreshSelectedRequest();


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // SEND TO ACCOUNTS
  // =========================================================

  async sendToAccounts():
    Promise<void> {

    if (
      !this.selectedRequest?.id
    ) {
      return;
    }


    this.saving = true;


    try {

      await this.workspaceService
        .updateRequest(
          this.selectedRequest.id,
          {
            workflow_status:
              'sent_to_accounts',

            payment_status:
              'pending',

            sent_to_accounts_at:
              new Date()
                .toISOString(),

            next_follow_up_at:
              null
          }
        );


    await this.addAutomaticNote(
  'payment',
  `تم إرسال الطلب إلى قسم الحسابات بواسطة ${
    this.currentUser?.full_name || 'موظف خدمة العملاء'
  } لمراجعة الدفع.`
);

      this.editForm
        .workflow_status =
          'sent_to_accounts';


      await this.loadWorkspace();

      this.refreshSelectedRequest();


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // COMPLETE
  // Agent يقفل فقط بعد رجوع الحسابات
  // =========================================================

  async completeRequest():
    Promise<void> {

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
      workflowStatus !==
        'booking_confirmed'
    ) {

      this.errorMessage =
        'لا يمكن إنهاء الطلب قبل تأكيد الحجز مع المكان.';

      this.cdr.markForCheck();

      return;

    }


    this.saving = true;

    this.errorMessage = '';

    this.cdr.markForCheck();


    try {

      await this.addAutomaticNote(
        'booking',
        `تم إنهاء الطلب بواسطة ${
          this.currentUser?.full_name ||
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


      await this.loadWorkspace();


    } catch (error) {

      console.error(
        'Complete request error:',
        error
      );


      this.errorMessage =
        'تعذر إنهاء الطلب.';


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // AUTOMATIC NOTE
  // =========================================================

  private async addAutomaticNote(
    type: NoteType,
    content: string
  ): Promise<void> {

    await this.workspaceService
      .createRequestNote({
        request_id:
          this.selectedRequest.id,

        user_id:
          this.currentUser.id,

        note_type:
          type,

        content
      });

  }


  // =========================================================
  // LABELS
  // =========================================================

  getWorkflowLabel(
    status: string
  ): string {

    const labels:
      Record<string, string> = {

      new:
        'طلب جديد',

      contacting:
        'قيد التواصل',

      waiting_place:
        'في انتظار المكان',

      waiting_customer:
        'في انتظار العميل',

      waiting_payment_receipt:
        'في انتظار إيصال الدفع',

      needs_customer_action:
        'مطلوب إجراء من العميل',

      follow_up:
        'متابعة لاحقة',

      booking_confirmed:
        'تم تأكيد الحجز',

      sent_to_accounts:
        'في انتظار الحسابات',

      payment_review:
        'الحسابات تراجع الدفع',

      paid:
        'تم تأكيد الدفع',

      completed:
        'مكتمل',

      refund_pending:
        'جاري استرداد المبلغ',

      refunded:
        'تم استرداد المبلغ',

      place_unavailable:
        'المكان غير متاح',

      cancelled:
        'ملغي' 

    };


    return (
      labels[status] ||
      'غير محدد'
    );

  }


  getNoteLabel(
    type: string
  ): string {

    const item =
      this.noteTypes.find(
        option =>
          option.value === type
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
      !row.next_follow_up_at
    ) {
      return false;
    }


    return (
      new Date(
        row.next_follow_up_at
      ).getTime() <=
      Date.now()
    );

  }


  // =========================================================
  // HELPERS
  // =========================================================

  private refreshSelectedRequest():
    void {

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


    if (refreshed) {

      this.selectedRequest =
        refreshed;

      this.selectedAssignment =
        refreshed.assignment;

    }

  }


  private clean(
    value: any
  ): string | null {

    const result =
      String(
        value || ''
      ).trim();


    return result || null;

  }


  private toDateTimeLocal(
    value: string | null
  ): string {

    if (!value) {
      return '';
    }


    const date =
      new Date(value);


    const adjusted =
      new Date(
        date.getTime() -
        date.getTimezoneOffset()
        * 60000
      );


    return adjusted
      .toISOString()
      .slice(
        0,
        16
      );

  }


  trackByRequestId(
    index: number,
    row: any
  ) {

    return row.id || index;

  }


  trackByNoteId(
    index: number,
    note: any
  ) {

    return note.id || index;

  }

}