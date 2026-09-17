import { ChangeDetectorRef, Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { SupabaseService } from '../../services/supabase.service';
import { Place } from '../../models/place.model';
import { RealtimeChannel } from '@supabase/supabase-js';
interface ChatMessage {
  id: number;
  sender: 'bot' | 'user' | 'agent' | 'system';
  text: string;
  time: string;
  dbId?: string;
  kind?: 'text' | 'place' | 'booking-summary' | 'payment-receipt' | 'image' | 'voice';
  media?: {
    url: string;
    path: string;
    fileName: string;
    mimeType: string;
    durationSeconds?: number | null;
  };
  place?: Place;
  context?: 'place-selection' | 'booking-summary';
  createdAt?: string;
  receipt?: {
    id: string;
    url: string;
    fileName: string;
    mimeType: string;
    status: string;
  };
  bookingSummary?: {
    placeName: string;
    date: string;
    time: string;
    guests: number;
    unitPrice: number;
    totalPrice: number;
  };
}

interface ChatState {
  dayUse: boolean;
  awaiting: string | null;

  name: string;
  phone: string;

  guests: number | null;
  budget: number | 'any' | null;
  area: string | 'any' | null;

  selectedPlace: Place | null;
  selectedPackage: any | null;
  selectedExtras: any[];

  date: string | null;
  time: string | null;
  notes: string;

  filter: string;

  isReplying: boolean;

  lastIntent: string | null;
  currentStep: string;

  conversationStarted: boolean;

  completed: boolean;

  requestId: string | null;
  sessionId: string | null;
  sessionToken: string;

  conversationMode: 'bot' | 'agent' | 'mixed';
  botPaused: boolean;
  customerEmail: string;

  requestWorkflowStatus: string | null;
  requestPaymentStatus: string | null;
  paymentAmountDue: number | null;
  paymentRequestReason: string;
  paymentMethodCode: string;
  trackingCode: string | null;
}

interface PaymentReceiptUploadState {
  file: File | null;
  uploading: boolean;
  error: string;
  success: boolean;
}

interface PaymentMethodOption {
  id?: string;
  name: string;
  code: string;
  payment_type: string;
  payment_url: string | null;
  fee_percent: number;
  active: boolean;
}


@Component({
  selector: 'app-chat',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './chat.html',

  styleUrl: './chat.css',

  host: {
    ngSkipHydration: 'true'
  }
})
export class ChatComponent implements OnChanges, OnDestroy {

  // =====================================================
  // INPUT
  // =====================================================

  messageText = '';

  // =====================================================
  // CHAT
  // =====================================================

  messages: ChatMessage[] = [];

  private messageId = 1;

  isTyping = false;

  private realtimeChannel: RealtimeChannel | null = null;

  // Prevent duplicate local status notifications when Supabase emits
  // more than one realtime event for the same request state.

  // =====================================================
  // PLACES
  // =====================================================
lastUserText = '';
  @Input() places: Place[] = [];

  @Input() placesLoading = false;

  filteredPlaces: Place[] = [];

  placesLoaded = false;

  // =====================================================
  // SESSION
  // =====================================================
private isAnyAreaFromText(text: string): boolean {
  const normalized = this.normalize(text);

  return this.containsAny(normalized, [
    'مش فارقة المنطقة',
    'مش فارق المنطقة',
    'مش مهم المنطقة',
    'مش مهمة المنطقة',
    'اي مكان',
    'كل الاماكن',
    'كل مكان',
    'اي منطقة',
    'كل المناطق',
    'مفتوح',
    'مفتوحة',
    'براحتكم',
    'براحتك',
    'اختارلي',
    'اختار لي',
    'اختار انت',
    'اختار أنت',
    'مش فارقة',
    'مش فارق',
    'مش مهم'
  ]);
}
  private readonly SESSION_STORAGE_KEY =
    'tasahel_day_use_session_token';

  // =====================================================
  // STATE
  // =====================================================

  state: ChatState = {
    dayUse: false,

    awaiting: 'name',

    name: '',
    phone: '',

    guests: null,
    budget: null,
    area: null,

    selectedPlace: null,
    selectedPackage: null,
    selectedExtras: [],

    date: null,
    time: null,

    notes: '',

    filter: 'all',

    isReplying: false,

    lastIntent: null,

    currentStep: 'name',

    conversationStarted: false,

    completed: false,

    requestId: null,

    sessionId: null,

    sessionToken: '',

    conversationMode: 'bot',
    botPaused: false,
    customerEmail: '',

    requestWorkflowStatus: null,
    requestPaymentStatus: null,
    paymentAmountDue: null,
    paymentRequestReason: '',
    paymentMethodCode: '',
    trackingCode: null
  };

  // =====================================================
  // QUICK ACTIONS
  // =====================================================

  quickActions = [
    {
      label: 'أماكن Day Use',
      message: 'عايز أشوف أماكن Day Use'
    },
    {
      label: 'عائلي',
      message: 'عايز مكان عائلي'
    },
    {
      label: 'Couples',
      message: 'عايز مكان للـ Couples'
    },
    {
      label: 'Aqua Park',
      message: 'عايز مكان فيه Aqua Park'
    }
  ];

  paymentReceipt: PaymentReceiptUploadState = {
    file: null,
    uploading: false,
    error: '',
    success: false
  };

  readonly paymentReceiptMaxBytes = 5 * 1024 * 1024;
  readonly paymentReceiptAllowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];


  // =====================================================
  // PAYMENT METHODS
  // =====================================================

  paymentMethods: PaymentMethodOption[] = [];
  paymentMethodsLoading = false;
  selectedPaymentMethodCode = '';
  selectingPaymentMethod = false;


  // =====================================================
  // CUSTOMER CHAT MEDIA (AGENT MODE ONLY)
  // =====================================================

  chatMediaUploading = false;
  chatMediaError = '';
  voiceRecording = false;
  voiceDurationSeconds = 0;

  private mediaRecorder: MediaRecorder | null = null;
  private mediaRecorderStream: MediaStream | null = null;
  private voiceChunks: Blob[] = [];
  private voiceTimer: ReturnType<typeof setInterval> | null = null;

  readonly chatImageMaxBytes = 8 * 1024 * 1024;
  readonly chatVoiceMaxBytes = 12 * 1024 * 1024;

  get canUseChatMedia(): boolean {
    return !this.state.completed
      && this.state.conversationMode === 'agent'
      && this.state.botPaused === true;
  }

  async onChatImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    input.value = '';

    if (!file || !this.canUseChatMedia || this.chatMediaUploading) return;

    this.chatMediaError = '';

    if (!file.type.startsWith('image/')) {
      this.chatMediaError = 'اختاري صورة فقط.';
      return;
    }

    if (file.size > this.chatImageMaxBytes) {
      this.chatMediaError = 'حجم الصورة لازم يكون أقل من 8 MB.';
      return;
    }

    await this.uploadCustomerChatMedia(file, 'image', null);
  }

  async toggleVoiceRecording(): Promise<void> {
    if (!this.canUseChatMedia || this.chatMediaUploading) return;

    if (this.voiceRecording) {
      this.stopVoiceRecording(true);
      return;
    }

    this.chatMediaError = '';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);

      this.mediaRecorderStream = stream;
      this.mediaRecorder = recorder;
      this.voiceChunks = [];
      this.voiceDurationSeconds = 0;
      this.voiceRecording = true;

      recorder.ondataavailable = event => {
        if (event.data?.size) this.voiceChunks.push(event.data);
      };

      recorder.onstop = () => {
        const duration = this.voiceDurationSeconds;
        const blob = new Blob(this.voiceChunks, {
          type: recorder.mimeType || 'audio/webm'
        });

        this.cleanupVoiceRecorder();

        if (!blob.size) return;

        if (blob.size > this.chatVoiceMaxBytes) {
          this.chatMediaError = 'الرسالة الصوتية كبيرة جدًا. سجلي رسالة أقصر.';
          this.cdr.markForCheck();
          return;
        }

        const extension = blob.type.includes('ogg') ? 'ogg' : 'webm';
        const file = new File(
          [blob],
          `voice-${Date.now()}.${extension}`,
          { type: blob.type || 'audio/webm' }
        );

        void this.uploadCustomerChatMedia(file, 'voice', duration);
      };

      recorder.start(250);

      this.voiceTimer = setInterval(() => {
        this.voiceDurationSeconds += 1;
        this.cdr.markForCheck();
      }, 1000);

      this.cdr.markForCheck();

    } catch (error) {
      console.error('Voice recording error:', error);
      this.chatMediaError = 'تعذر تشغيل الميكروفون. تأكدي من السماح بالوصول للميكروفون.';
      this.cleanupVoiceRecorder();
      this.cdr.markForCheck();
    }
  }

  cancelVoiceRecording(): void {
    if (!this.voiceRecording) return;
    this.voiceChunks = [];
    this.stopVoiceRecording(false);
  }

  private stopVoiceRecording(send: boolean): void {
    if (!this.mediaRecorder) return;

    if (!send) {
      this.voiceChunks = [];
      this.mediaRecorder.onstop = () => this.cleanupVoiceRecorder();
    }

    if (this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  private cleanupVoiceRecorder(): void {
    if (this.voiceTimer) {
      clearInterval(this.voiceTimer);
      this.voiceTimer = null;
    }

    this.mediaRecorderStream?.getTracks().forEach(track => track.stop());
    this.mediaRecorderStream = null;
    this.mediaRecorder = null;
    this.voiceRecording = false;
    this.voiceDurationSeconds = 0;
    this.cdr.markForCheck();
  }

  private async uploadCustomerChatMedia(
    file: File,
    messageType: 'image' | 'voice',
    durationSeconds: number | null
  ): Promise<void> {
    if (
      !this.state.sessionId ||
      !this.state.sessionToken ||
      !this.canUseChatMedia ||
      this.chatMediaUploading
    ) return;

    this.chatMediaUploading = true;
    this.chatMediaError = '';
    this.cdr.markForCheck();

    try {
      const extension = (file.name.split('.').pop() || 'bin')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') || 'bin';

      const path = `${this.state.sessionId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const { error: uploadError } = await this.supabaseService.client.storage
        .from('chat-media')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data: rpcData, error: rpcError } = await this.supabaseService.client.rpc(
        'customer_send_chat_media',
        {
          p_session_token: this.state.sessionToken,
          p_message_type: messageType,
          p_media_path: path,
          p_media_name: file.name,
          p_media_mime_type: file.type,
          p_media_duration_seconds: durationSeconds
        }
      );

      if (rpcError) throw rpcError;

      const { data: signedData, error: signedError } =
        await this.supabaseService.client.storage
          .from('chat-media')
          .createSignedUrl(path, 60 * 60);

      if (signedError) throw signedError;

      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      const createdAt = row?.created_at || new Date().toISOString();

      if (
        !row?.id ||
        !this.messages.some(message => message.dbId === row.id)
      ) {
        this.messages.push({
          id: this.messageId++,
          dbId: row?.id,
          sender: 'user',
          kind: messageType,
          text: messageType === 'image' ? 'صورة' : 'رسالة صوتية',
          createdAt,
          time: this.formatRealtimeTime(createdAt),
          media: {
            url: signedData?.signedUrl || '',
            path,
            fileName: file.name,
            mimeType: file.type,
            durationSeconds
          }
        });
      }

      this.scrollMessages();

    } catch (error: any) {
      console.error('Customer chat media upload error:', error);
      this.chatMediaError = error?.message || 'تعذر إرسال الملف. حاولي مرة تانية.';
    } finally {
      this.chatMediaUploading = false;
      this.cdr.markForCheck();
    }
  }

  get shouldShowPaymentMethodSelect(): boolean {
    return !!this.state.requestId
      && !this.state.completed
      && this.state.requestWorkflowStatus === 'waiting_customer'
      && Number(this.state.paymentAmountDue || 0) > 0
      && !this.state.paymentMethodCode;
  }

  async confirmPaymentMethodSelection(): Promise<void> {
    if (
      !this.selectedPaymentMethodCode ||
      this.selectingPaymentMethod ||
      !this.state.requestId
    ) {
      return;
    }

    const method = this.paymentMethods.find(
      item => item.code === this.selectedPaymentMethodCode
    );

    if (!method) {
      return;
    }

    this.selectingPaymentMethod = true;
    this.state.isReplying = true;
    this.cdr.markForCheck();

    try {
      const request = await this.loadCurrentRequest();

      const reply = await this.selectPaymentMethod(
        method,
        request
      );

      if (reply) {
        this.addBotMessage(reply);
      }

      this.selectedPaymentMethodCode = '';
      await this.loadCurrentRequest();
      this.scrollMessages();

    } catch (error) {
      console.error(
        'Payment method select UI error:',
        error
      );

      this.addBotMessage(
        'حصلت مشكلة أثناء اختيار طريقة الدفع. جرّب مرة تانية.'
      );

    } finally {
      this.selectingPaymentMethod = false;
      this.state.isReplying = false;
      this.cdr.markForCheck();
    }
  }

  get shouldShowPaymentReceiptUpload(): boolean {
    return !!this.state.requestId
      && !this.state.completed
      && this.state.requestWorkflowStatus === 'waiting_payment_receipt';
  }

  onPaymentReceiptSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.paymentReceipt.error = '';
    this.paymentReceipt.success = false;
    this.paymentReceipt.file = null;

    if (!file) return;

    if (!this.paymentReceiptAllowedTypes.includes(file.type)) {
      this.paymentReceipt.error = 'مسموح بصورة JPG / PNG / WEBP أو ملف PDF فقط.';
      input.value = '';
      return;
    }

    if (file.size > this.paymentReceiptMaxBytes) {
      this.paymentReceipt.error = 'حجم الإيصال لازم يكون أقل من 5 MB.';
      input.value = '';
      return;
    }

    this.paymentReceipt.file = file;
  }

  async uploadPaymentReceipt(): Promise<void> {
    const file = this.paymentReceipt.file;
    const requestId = this.state.requestId;
    const sessionToken = this.state.sessionToken;

    if (!file || !requestId || !sessionToken || this.paymentReceipt.uploading) {
      return;
    }

    this.paymentReceipt.uploading = true;
    this.paymentReceipt.error = '';
    this.paymentReceipt.success = false;

    try {
      const extension = (file.name.split('.').pop() || 'bin')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');
      const storageName = `${Date.now()}-${crypto.randomUUID()}.${extension || 'bin'}`;
      const filePath = `${requestId}/${sessionToken}/${storageName}`;

      const { error: uploadError } = await this.supabaseService.client.storage
        .from('payment-receipts')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { error: submitError } = await this.supabaseService.client.rpc(
        'submit_payment_receipt',
        {
          p_request_id: requestId,
          p_session_token: sessionToken,
          p_file_path: filePath,
          p_file_name: file.name,
          p_mime_type: file.type,
          p_file_size: file.size
        }
      );

      if (submitError) {
        throw submitError;
      }

      this.paymentReceipt.file = null;
      this.paymentReceipt.success = true;

      await this.loadCurrentRequest();
      await this.loadPreviousMessages();
      this.scrollMessages();

    } catch (error: any) {
      console.error('Payment receipt upload error:', error);
      this.paymentReceipt.error =
        error?.message || 'حصلت مشكلة أثناء رفع الإيصال. حاولي مرة تانية.';
    } finally {
      this.paymentReceipt.uploading = false;
      this.cdr.detectChanges();
    }
  }

  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    private supabaseService: SupabaseService,
    private cdr: ChangeDetectorRef
  ) {

    this.initializeSession();

    this.messages = [
      {
        id: this.messageId++,
        sender: 'bot',
        text: 'أهلاً بيك في تساهيل ❤️',
        time: this.nowTime()
      },
      {
        id: this.messageId++,
        sender: 'bot',
        text: `أنا مساعد تساهيل، وهساعدك تختار أفضل مكان للـ Day Use حسب طلبك.

ممكن تقولي اسم حضرتك؟ `,
        time: this.nowTime()
      }
    ];

    void this.createOrRestoreSession();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['places'] || changes['placesLoading']) {
      this.placesLoaded = !this.placesLoading;
      void this.refreshFilteredPlaces();
      this.cdr.markForCheck();
    }
  }

  // =====================================================
  // NORMALIZE
  // =====================================================

  private normalize(text: string): string {

    return String(text || '')
      .trim()
      .toLowerCase()

      .replace(/[إأآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')

      .replace(/[ًٌٍَُِّْـ]/g, '')

      .replace(/[،,:!?؟.;()[\]{}"'`]/g, ' ')

      .replace(/\s+/g, ' ')
      .trim();
  }

  // =====================================================
  // TIME
  // =====================================================

  private nowTime(): string {

    return new Date().toLocaleTimeString('ar-EG', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // =====================================================
  // SESSION TOKEN
  // =====================================================

  private initializeSession(): void {

    try {

      const existingToken =
        localStorage.getItem(
          this.SESSION_STORAGE_KEY
        );

      if (
        existingToken &&
        existingToken.trim()
      ) {

        this.state.sessionToken =
          existingToken;

        return;
      }

      const token =
        'tasahel_' +
        Date.now() +
        '_' +
        Math.random()
          .toString(36)
          .substring(2, 12);

      this.state.sessionToken = token;

      localStorage.setItem(
        this.SESSION_STORAGE_KEY,
        token
      );

    } catch {

      this.state.sessionToken =
        'tasahel_' +
        Date.now() +
        '_' +
        Math.random()
          .toString(36)
          .substring(2, 12);
    }
  }

  // =====================================================
  // CREATE / RESTORE SESSION
  // =====================================================

  private async createOrRestoreSession(): Promise<void> {

    try {

      const { data, error } =
        await this.supabaseService.client
          .from('chat_sessions')
          .select('*')
          .eq(
            'session_token',
            this.state.sessionToken
          )
          .maybeSingle();

      if (error) {
        console.error(
          'Session lookup error:',
          error
        );
        return;
      }

      if (data) {

        this.state.sessionId = data.id;

        this.state.name = data.name || '';
        this.state.phone = data.phone || '';
        this.state.customerEmail = data.customer_email || '';
        this.state.requestId = data.request_id || null;
        this.state.conversationMode =
          data.conversation_mode || 'bot';
        this.state.botPaused =
          Boolean(data.bot_paused);

        this.state.guests =
          data.guests ?? null;

        this.state.budget =
          data.budget ?? null;

        this.state.area =
          data.area ?? null;

        this.state.lastIntent =
          data.last_intent ?? null;

        this.state.currentStep =
          data.current_step || 'name';

        // Restore the parser step too. `currentStep` is persisted in Supabase,
        // while `awaiting` only lives in memory. If we leave `awaiting` at its
        // default ('name'), a restored/re-rendered chat can suddenly ask for
        // the customer's name again even when we already know it.
        if (this.state.currentStep === 'name') {
          this.state.awaiting = 'name';
        } else if (this.state.currentStep === 'phone') {
          this.state.awaiting = 'phone';
        } else if (this.state.currentStep === 'guests') {
          this.state.awaiting = 'guests';
        } else if (this.state.currentStep === 'budget') {
          this.state.awaiting = 'budget';
        } else if (this.state.currentStep === 'area') {
          this.state.awaiting = 'area';
        } else if (this.state.currentStep === 'booking_date') {
          this.state.awaiting = 'date';
        } else if (this.state.currentStep === 'booking_time') {
          this.state.awaiting = 'time';
        } else if (this.state.currentStep === 'booking_confirmation') {
          this.state.awaiting = 'booking_confirmation';
        } else if (this.state.currentStep === 'payment_method') {
          this.state.awaiting = 'payment_method';
        } else if (this.state.currentStep === 'recommendations') {
          this.state.awaiting = 'recommended';
        } else if (this.state.currentStep === 'place_selected') {
          this.state.awaiting = 'place_selected';
        } else if (this.state.currentStep === 'requirements') {
          this.state.awaiting = !this.state.guests
            ? 'guests'
            : this.state.budget === null
              ? 'budget'
              : this.state.area === null
                ? 'area'
                : 'recommended';
        } else {
          this.state.awaiting = null;
        }

        this.state.selectedPlace = null;

        if (data.selected_place_id) {

          const found =
            this.places.find(
              place =>
                String(place.id) ===
                String(data.selected_place_id)
            );

          if (found) {
            this.state.selectedPlace = found;
          }
        }

        await this.loadPreviousMessages();
        await this.loadCurrentRequest();
        this.subscribeToRealtime();

        return;
      }

      const { data: created, error: createError } =
        await this.supabaseService.client
          .from('chat_sessions')
          .insert({
            session_token:
              this.state.sessionToken,

            status: 'active',

            current_step: 'name',

            last_activity_at:
              new Date().toISOString()
          })
          .select()
          .single();

      if (createError) {

        console.error(
          'Session creation error:',
          createError
        );

        return;
      }

      this.state.sessionId =
        created?.id || null;

      this.subscribeToRealtime();

    } catch (error) {

      console.error(
        'Session initialization error:',
        error
      );
    }
  }

  // =====================================================
  // RESTORE PREVIOUS MESSAGES
  // =====================================================

  private async loadPreviousMessages(): Promise<void> {

    if (!this.state.sessionId) {
      return;
    }

    try {

      const { data, error } =
        await this.supabaseService.client
          .from('chat_messages')
          .select(`
            id,
            sender,
            message,
            created_at,
            message_type,
            media_path,
            media_name,
            media_mime_type,
            media_duration_seconds
          `)
          .eq('session_id', this.state.sessionId)
          .order('created_at', { ascending: true });

      if (error) {
        console.error(
          'Previous messages loading error:',
          error
        );
        return;
      }

      const restoredMessages: ChatMessage[] = [];

      for (const item of (data || [])) {
        let mediaUrl = '';

        if (item.media_path) {
          const { data: signedData } = await this.supabaseService.client.storage
            .from('chat-media')
            .createSignedUrl(item.media_path, 60 * 60);

          mediaUrl = signedData?.signedUrl || '';
        }

        restoredMessages.push({
          id: this.messageId++,
          dbId: item.id,
          sender: (
            ['bot', 'user', 'agent', 'system'].includes(item.sender)
              ? item.sender
              : 'bot'
          ) as 'bot' | 'user' | 'agent' | 'system',
          kind: item.message_type === 'image'
            ? 'image'
            : item.message_type === 'voice'
              ? 'voice'
              : 'text',
          text: item.message || '',
          createdAt: item.created_at,
          time: new Date(item.created_at).toLocaleTimeString(
            'ar-EG',
            {
              hour: '2-digit',
              minute: '2-digit'
            }
          ),
          media: item.media_path
            ? {
                url: mediaUrl,
                path: item.media_path,
                fileName: item.media_name || '',
                mimeType: item.media_mime_type || '',
                durationSeconds: item.media_duration_seconds ?? null
              }
            : undefined
        });
      }

      const receiptMessages =
        await this.loadPaymentReceiptMessages();

      this.messages = [
        ...restoredMessages,
        ...receiptMessages
      ].sort((a, b) =>
        new Date(a.createdAt || 0).getTime() -
        new Date(b.createdAt || 0).getTime()
      );

      this.cdr.markForCheck();
      this.scrollMessages();

    } catch (error) {
      console.error(
        'Previous messages loading exception:',
        error
      );
    }
  }


  // =====================================================
  // PAYMENT RECEIPTS INSIDE CHAT
  // =====================================================

  private async loadPaymentReceiptMessages(): Promise<ChatMessage[]> {

    const requestId = this.state.requestId;
    const sessionToken = this.state.sessionToken;

    if (!requestId || !sessionToken) {
      return [];
    }

    try {

      const { data, error } =
        await this.supabaseService.client.rpc(
          'get_customer_payment_receipts',
          {
            p_request_id: requestId,
            p_session_token: sessionToken
          }
        );

      if (error) {
        console.error(
          'Payment receipts loading error:',
          error
        );
        return [];
      }

      const rows = Array.isArray(data)
        ? data
        : [];

      const receiptMessages: ChatMessage[] = [];

      for (const row of rows) {

        const { data: signedData, error: signedError } =
          await this.supabaseService.client.storage
            .from('payment-receipts')
            .createSignedUrl(
              row.file_path,
              60 * 60
            );

        if (signedError || !signedData?.signedUrl) {
          console.error(
            'Payment receipt signed URL error:',
            signedError
          );
          continue;
        }

        const uploadedAt =
          row.uploaded_at ||
          new Date().toISOString();

        receiptMessages.push({
          id: this.messageId++,
          sender: 'user',
          kind: 'payment-receipt',
          text: 'إيصال الدفع',
          createdAt: uploadedAt,
          time: new Date(uploadedAt).toLocaleTimeString(
            'ar-EG',
            {
              hour: '2-digit',
              minute: '2-digit'
            }
          ),
          receipt: {
            id: row.id,
            url: signedData.signedUrl,
            fileName: row.file_name || 'إيصال الدفع',
            mimeType: row.mime_type || '',
            status: row.status || 'pending'
          }
        });
      }

      return receiptMessages;

    } catch (error) {
      console.error(
        'Payment receipts loading exception:',
        error
      );
      return [];
    }
  }


  // =====================================================
  // CONVERSATION CONTROL
  // =====================================================

  private async refreshConversationControl(): Promise<void> {

    if (!this.state.sessionId) {
      return;
    }

    try {

      const { data, error } =
        await this.supabaseService.client
          .from('chat_sessions')
          .select('conversation_mode, bot_paused, customer_email, request_id')
          .eq('id', this.state.sessionId)
          .maybeSingle();

      if (error) {
        console.error(
          'Conversation control loading error:',
          error
        );
        return;
      }

      if (!data) {
        return;
      }

      this.state.conversationMode =
        data.conversation_mode || 'bot';

      this.state.botPaused =
        Boolean(data.bot_paused);

      this.state.customerEmail =
        data.customer_email || this.state.customerEmail;

      this.state.requestId =
        data.request_id || this.state.requestId;

    } catch (error) {
      console.error(
        'Conversation control loading exception:',
        error
      );
    }
  }


  // =====================================================
  // CURRENT REQUEST
  // =====================================================

  private async loadCurrentRequest(): Promise<any | null> {

    if (!this.state.sessionId) {
      return null;
    }

    try {

      let request: any = null;

      if (this.state.requestId) {

        const { data, error } =
          await this.supabaseService.client
            .from('day_use_requests')
            .select(`
              id,
              session_id,
              tracking_code,
              workflow_status,
              payment_status,
              status,
              place_name,
              date,
              time,
              guests,
              package,
              selling_price_snapshot,
              cost_price_snapshot,
              profit_amount,
              total_selling_price,
              total_cost_price,
              total_profit_amount,
              payment_method_code,
              payment_method_name,
              payment_type,
              payment_url,
              payment_fee_percent,
              payment_fee_amount,
              amount_due,
              payment_request_reason,
              payment_requested_at,
              created_at
            `)
            .eq('id', this.state.requestId)
            .maybeSingle();

        if (error) {
          console.error(
            'Current request loading error:',
            error
          );
        } else {
          request = data;
        }
      }

      // request_id on chat_sessions is the source of truth.
      // When it is cleared after a finished request, the customer is free
      // to start a new booking in the same conversation.


      if (!request) {
        this.state.requestWorkflowStatus = null;
        this.state.requestPaymentStatus = null;
        this.state.paymentAmountDue = null;
        this.state.paymentRequestReason = '';
        this.state.paymentMethodCode = '';
        this.state.trackingCode = null;
        return null;
      }

      this.state.requestId = request.id;
      this.state.requestWorkflowStatus =
        request.workflow_status || request.status || 'new';
      this.state.requestPaymentStatus =
        request.payment_status || null;
      this.state.paymentAmountDue =
        request.amount_due === null || request.amount_due === undefined
          ? null
          : Number(request.amount_due);
      this.state.paymentRequestReason =
        request.payment_request_reason || '';
      this.state.paymentMethodCode =
        request.payment_method_code || '';

      if (
        this.state.requestWorkflowStatus === 'waiting_customer' &&
        Number(this.state.paymentAmountDue || 0) > 0 &&
        !this.state.paymentMethodCode
      ) {
        this.state.currentStep = 'payment_method';
        this.state.awaiting = 'payment_method';
        void this.loadActivePaymentMethods();
      } else if (this.state.requestWorkflowStatus === 'waiting_payment_receipt') {
        this.state.currentStep = 'request_tracking';
        this.state.awaiting = null;
      }

      this.state.trackingCode =
        request.tracking_code || null;


      // Keep the session linked to the request.
      await this.supabaseService.client
        .from('chat_sessions')
        .update({
          request_id: request.id
        })
        .eq('id', this.state.sessionId);

      return request;

    } catch (error) {
      console.error(
        'Current request loading exception:',
        error
      );
      return null;
    }
  }


  private isRequestFinished(request: any): boolean {

    if (!request) {
      return true;
    }

    const workflowStatus =
      String(request.workflow_status || '').trim();

    const status =
      String(request.status || '').trim();

    return [
      'completed',
      'cancelled',
      'refunded'
    ].includes(workflowStatus) || [
      'completed',
      'cancelled'
    ].includes(status);
  }


  private getRequestStatusLabel(
    workflowStatus: string | null,
    paymentStatus: string | null = null
  ): string {

    const labels: Record<string, string> = {
      new: 'تم استلام طلبك',
      contacting: 'فريق تساهيل بيتابع طلبك',
      waiting_customer: 'في انتظار ردك',
      follow_up: 'الطلب قيد المتابعة',
      waiting_payment_receipt: 'في انتظار إيصال الدفع',
      needs_customer_action: 'مطلوب منك استكمال معلومة',
      sent_to_accounts: 'تم إرسال الإيصال للحسابات',
      payment_review: 'الحسابات بتراجع الدفع',
      paid: 'تم تأكيد الدفع',
      waiting_place: 'جاري تأكيد الحجز مع المكان',
      place_unavailable: 'المكان غير متاح',
      booking_confirmed: 'تم تأكيد الحجز',
      refund_pending: 'جاري استرداد المبلغ',
      refunded: 'تم استرداد المبلغ',
      completed: 'تم إتمام الطلب',
      cancelled: 'تم إلغاء الطلب'
    };

    if (
      workflowStatus === 'sent_to_accounts' &&
      paymentStatus === 'under_review'
    ) {
      return 'الحسابات بتراجع الدفع';
    }

    return labels[workflowStatus || ''] || 'الطلب قيد المتابعة';
  }


  private isNewBookingIntent(text: string): boolean {

    const normalized =
      this.normalize(text);

    return this.containsAny(normalized, [
      'طلب جديد',
      'حجز جديد',
      'احجز تاني',
      'احجز ثاني',
      'احجز من جديد',
      'مكان تاني',
      'مكان ثاني',
      'عايز مكان',
      'عايزه مكان',
      'عايز احجز',
      'عايزه احجز',
      'شوفلي مكان',
      'وريني اماكن',
      'كل الاماكن',
      'day use',
      'داي يوز'
    ]);
  }


  private getFinishedRequestMessage(
    request: any
  ): string {

    const trackingCode =
      request?.tracking_code ||
      this.state.trackingCode ||
      '—';

    const workflowStatus =
      request?.workflow_status ||
      request?.status ||
      'completed';

    return `طلبك السابق رقم ${trackingCode} انتهى ✅\n\nالحالة النهائية: ${this.getRequestStatusLabel(workflowStatus, request?.payment_status || null)}\n\nالمحادثة والتفاصيل القديمة محفوظة هنا.\nلو حابب تبدأ حجز جديد، اكتب \"عايز حجز جديد\" أو اختار مكان جديد.`;
  }


  private async handleActiveRequestMessage(
    text: string,
    request: any
  ): Promise<string> {

    const workflowStatus =
      String(
        request?.workflow_status ||
        request?.status ||
        'new'
      );

    const paymentStatus =
      request?.payment_status || null;

    const trackingCode =
      request?.tracking_code ||
      this.state.trackingCode ||
      '—';

    const placeName =
      request?.place_name ||
      this.state.selectedPlace?.name ||
      'المكان المختار';

    if (this.isClearlyOffTopic(text)) {
      return this.getDayUseRedirectMessage();
    }

    const asksForAnotherBooking =
      this.isNewBookingIntent(text);

    if (asksForAnotherBooking) {
      return `عندك طلب مفتوح بالفعل ❤️\n\nرقم المتابعة: ${trackingCode}\nالحالة الحالية: ${this.getRequestStatusLabel(workflowStatus, paymentStatus)}\n\nنكمّل الطلب الحالي الأول، وبعد ما ينتهي تقدر تبدأ طلب جديد من نفس الشات.`;
    }

    // ===================================================
    // PAYMENT METHOD SELECTION
    // ===================================================

    if (
      workflowStatus === 'waiting_customer' &&
      Number(request?.amount_due || 0) > 0 &&
      !request?.payment_method_code
    ) {
      const amount = this.formatEGP(Number(request.amount_due));
      const reason = request?.payment_request_reason
        ? `\nسبب الدفع: ${request.payment_request_reason}`
        : '';

      if (
        this.state.currentStep === 'payment_method' ||
        this.state.awaiting === 'payment_method'
      ) {
        return await this.handlePaymentMethodSelection(
          text,
          request
        );
      }

      this.state.currentStep = 'payment_method';
      this.state.awaiting = 'payment_method';
      await this.loadActivePaymentMethods();

      return `فريق تساهيل طلب منك دفعة لإكمال طلبك 💳\n\nالمبلغ المطلوب: ${amount}${reason}\n\nاختار طريقة الدفع المناسبة من القائمة، وبعد اختيارها هيظهر لك رفع الإيصال.`;
    }

    if (workflowStatus === 'waiting_payment_receipt') {
      const methodName =
        request?.payment_method_name
          ? `\nطريقة الدفع: ${request.payment_method_name}`
          : '';

      const amountDue =
        Number(request?.amount_due || 0) > 0
          ? `\nالمبلغ المطلوب: ${this.formatEGP(Number(request.amount_due))}`
          : '';

      const paymentReason =
        request?.payment_request_reason
          ? `\nسبب الدفع: ${request.payment_request_reason}`
          : '';

      const paymentLink =
        request?.payment_url
          ? `\n\nلينك الدفع:\n${request.payment_url}`
          : '';

      return `طلبك رقم ${trackingCode} ما زال مفتوحًا ❤️\n\nالحالة الحالية: في انتظار إتمام الدفع ورفع الإيصال 💳\nالمكان: ${placeName}${methodName}${amountDue}${paymentReason}${paymentLink}\n\nبعد الدفع ارفع إيصال الدفع من زر رفع الإيصال، وبعدها هيتبعت للحسابات للمراجعة.`;
    }

    if (workflowStatus === 'needs_customer_action') {
      return `طلبك رقم ${trackingCode} محتاج منك استكمال معلومة ❤️\n\nالحالة الحالية: مطلوب منك إجراء\n\nاكتب رسالتك هنا، وفريق تساهيل يقدر يدخل نفس المحادثة ويرد عليك. ولو المطلوب إيصال جديد، ارفع الصورة الجديدة من زر رفع الإيصال.`;
    }

    if (
      workflowStatus === 'sent_to_accounts' ||
      workflowStatus === 'payment_review'
    ) {
      return `متابعين طلبك ❤️\n\nرقم المتابعة: ${trackingCode}\nالحالة الحالية: ${this.getRequestStatusLabel(workflowStatus, paymentStatus)}\n\nأول ما مراجعة الدفع تخلص، حالة الطلب هتتحدث هنا.`;
    }

    if (workflowStatus === 'paid') {
      return `تم تأكيد الدفع بنجاح ✅\n\nرقم المتابعة: ${trackingCode}\nالمكان: ${placeName}\n\nالخطوة التالية هي تأكيد التوافر والحجز مع المكان. هنحدّثك هنا أول ما يكون فيه جديد.`;
    }

    if (workflowStatus === 'waiting_place') {
      return `طلبك قيد المتابعة ❤️\n\nرقم المتابعة: ${trackingCode}\nالحالة الحالية: جاري تأكيد الحجز مع ${placeName}.\n\nأول ما المكان يأكد هنبلغك هنا.`;
    }

    if (workflowStatus === 'place_unavailable') {
      return `في تحديث بخصوص طلبك رقم ${trackingCode}.\n\nالمكان غير متاح للحجز حاليًا. فريق تساهيل هيتابع معاك هنا بخصوص البدائل أو إجراءات استرداد المبلغ.`;
    }

    if (workflowStatus === 'refund_pending') {
      return `طلبك رقم ${trackingCode}\n\nالحالة الحالية: جاري استرداد المبلغ.\n\nالحسابات بتتابع الإجراء، وهنبلغك هنا بمجرد اكتماله.`;
    }

    if (workflowStatus === 'booking_confirmed') {
      return `حجزك تم تأكيده 🎉\n\nرقم المتابعة: ${trackingCode}\nالمكان: ${placeName}\n\nالمحادثة هتفضل موجودة لو احتجت أي متابعة تخص نفس الطلب.`;
    }

    return `طلبك ما زال قيد المتابعة ❤️\n\nرقم المتابعة: ${trackingCode}\nالمكان: ${placeName}\nالحالة الحالية: ${this.getRequestStatusLabel(workflowStatus, paymentStatus)}\n\nالشات ده مخصص حاليًا لمتابعة نفس الطلب. تقدر تسأل عن حالته أو ترد على فريق تساهيل هنا.`;
  }


  private async resetForNewRequest(): Promise<void> {

    // Keep customer identity and the same conversation history.
    // Reset only the booking/request-specific data.
    this.state.dayUse = false;
    this.state.awaiting = null;

    this.state.guests = null;
    this.state.budget = null;
    this.state.area = null;

    this.state.selectedPlace = null;
    this.state.selectedPackage = null;
    this.state.selectedExtras = [];

    this.state.date = null;
    this.state.time = null;
    this.state.notes = '';

    this.state.filter = 'all';
    this.state.lastIntent = null;
    this.state.currentStep = 'requirements';
    this.state.conversationStarted = true;
    this.state.completed = false;

    this.state.requestId = null;
    this.state.requestWorkflowStatus = null;
    this.state.requestPaymentStatus = null;
    this.state.trackingCode = null;

    if (this.state.sessionId) {
      await this.supabaseService.client
        .from('chat_sessions')
        .update({
          request_id: null,
          status: 'active',
          current_step: 'requirements',
          selected_place_id: null,
          selected_place_name: null,
          guests: null,
          budget: null,
          area: null,
          last_intent: null,
          completed_at: null,
          last_activity_at: new Date().toISOString()
        })
        .eq('id', this.state.sessionId);
    }
  }


  // =====================================================
  // REALTIME
  // =====================================================

  private subscribeToRealtime(): void {

    if (!this.state.sessionId) {
      return;
    }

    if (this.realtimeChannel) {
      void this.supabaseService.client
        .removeChannel(this.realtimeChannel);

      this.realtimeChannel = null;
    }

    const sessionId =
      this.state.sessionId;

    this.realtimeChannel =
      this.supabaseService.client
        .channel(`customer-chat-${sessionId}`)

        // ===================================================
        // 1. NEW CHAT MESSAGES
        // Agent/System messages appear instantly for customer.
        // ===================================================
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `session_id=eq.${sessionId}`
          },
          payload => {

            const row = payload.new as any;

            if (!row) {
              return;
            }

            const isRemoteText = ['agent', 'system'].includes(row.sender);
            const isCustomerMedia =
              row.sender === 'user' &&
              ['image', 'voice'].includes(row.message_type);

            if (!isRemoteText && !isCustomerMedia) {
              return;
            }

            if (
              this.messages.some(
                message => message.dbId === row.id
              )
            ) {
              return;
            }

            void (async () => {
              let mediaUrl = '';

              if (row.media_path) {
                const { data: signedData } =
                  await this.supabaseService.client.storage
                    .from('chat-media')
                    .createSignedUrl(row.media_path, 60 * 60);

                mediaUrl = signedData?.signedUrl || '';
              }

              this.messages.push({
                id: this.messageId++,
                dbId: row.id,
                sender: row.sender,
                kind: row.message_type === 'image'
                  ? 'image'
                  : row.message_type === 'voice'
                    ? 'voice'
                    : 'text',
                text: row.message || '',
                time: this.formatRealtimeTime(row.created_at),
                createdAt: row.created_at || undefined,
                media: row.media_path
                  ? {
                      url: mediaUrl,
                      path: row.media_path,
                      fileName: row.media_name || '',
                      mimeType: row.media_mime_type || '',
                      durationSeconds: row.media_duration_seconds ?? null
                    }
                  : undefined
              });

              this.cdr.markForCheck();
              this.scrollMessages();
            })();

            this.cdr.markForCheck();
            this.scrollMessages();
          }
        )

        // ===================================================
        // 2. SESSION CONTROL
        // Agent takeover / bot release syncs without refresh.
        // ===================================================
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chat_sessions',
            filter: `id=eq.${sessionId}`
          },
          payload => {

            const row = payload.new as any;

            if (!row) {
              return;
            }

            this.state.conversationMode =
              row.conversation_mode || 'bot';

            this.state.botPaused =
              Boolean(row.bot_paused);

            this.state.requestId =
              row.request_id || this.state.requestId;

            this.state.customerEmail =
              row.customer_email || this.state.customerEmail;

            if (row.current_step) {
              this.state.currentStep = row.current_step;
              this.state.awaiting =
                row.current_step === 'payment_method'
                  ? 'payment_method'
                  : this.state.awaiting;
            }

            this.cdr.markForCheck();
          }
        )

        // ===================================================
        // 3. REQUEST STATUS
        // Payment/workflow changes appear instantly.
        // ===================================================
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'day_use_requests',
            filter: `session_id=eq.${sessionId}`
          },
          payload => {

            const row = (payload.new || payload.old) as any;

            if (!row?.id) {
              return;
            }

            if (
              this.state.requestId &&
              String(row.id) !== String(this.state.requestId)
            ) {
              return;
            }

            this.state.requestId =
              row.id;

            this.state.requestWorkflowStatus =
              row.workflow_status || row.status || null;

            this.state.requestPaymentStatus =
              row.payment_status || null;

            this.state.paymentAmountDue =
              row.amount_due === null || row.amount_due === undefined
                ? null
                : Number(row.amount_due);

            this.state.paymentRequestReason =
              row.payment_request_reason || '';

            this.state.paymentMethodCode =
              row.payment_method_code || '';

            if (
              this.state.requestWorkflowStatus === 'waiting_customer' &&
              Number(this.state.paymentAmountDue || 0) > 0 &&
              !this.state.paymentMethodCode
            ) {
              this.state.currentStep = 'payment_method';
              this.state.awaiting = 'payment_method';
              void this.loadActivePaymentMethods();
            } else if (
              this.state.requestWorkflowStatus === 'waiting_payment_receipt'
            ) {
              this.state.currentStep = 'request_tracking';
              this.state.awaiting = null;
            }

            this.state.trackingCode =
              row.tracking_code || this.state.trackingCode;

            // Status messages are persisted by the database trigger.
            // We only sync the state here. The matching system message
            // arrives through the chat_messages realtime INSERT listener.
            this.cdr.markForCheck();
          }
        )
        .subscribe(status => {

          console.log(
            'Customer realtime status:',
            status
          );

        });
  }


  private formatRealtimeTime(
    value: string | null | undefined
  ): string {

    const date =
      value
        ? new Date(value)
        : new Date();

    return date.toLocaleTimeString(
      'ar-EG',
      {
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }



  ngOnDestroy(): void {

    this.cleanupVoiceRecorder();

    if (this.realtimeChannel) {
      void this.supabaseService.client
        .removeChannel(this.realtimeChannel);

      this.realtimeChannel = null;
    }
  }


  // =====================================================
  // SAVE SESSION
  // =====================================================

  private async updateSession(
    extraData: any = {}
  ): Promise<void> {

    if (!this.state.sessionId) {

      await this.createOrRestoreSession();
    }

    if (!this.state.sessionId) {
      return;
    }

    try {

      const payload: any = {

        name:
          this.state.name || null,

        phone:
          this.state.phone || null,

        status: 'active',

        current_step:
          this.state.currentStep,

        guests:
          this.state.guests,

        budget:
          this.state.budget === 'any'
            ? null
            : this.state.budget,

        area:
          this.state.area === 'any'
            ? 'any'
            : this.state.area,

        selected_place_id:
          this.state.selectedPlace?.id || null,

        selected_place_name:
          this.state.selectedPlace?.name || null,

        last_intent:
          this.state.lastIntent,

        last_activity_at:
          new Date().toISOString(),

        ...extraData
      };

      const { error } =
        await this.supabaseService.client
          .from('chat_sessions')
          .update(payload)
          .eq(
            'id',
            this.state.sessionId
          );

      if (error) {

        console.error(
          'Session update error:',
          error
        );
      }

    } catch (error) {

      console.error(
        'Session update exception:',
        error
      );
    }
  }

  // =====================================================
  // SAVE MESSAGE
  // =====================================================

  private async saveMessage(
    sender: 'user' | 'bot' | 'agent' | 'system',
    message: string
  ): Promise<void> {

    if (!this.state.sessionId) {

      await this.createOrRestoreSession();
    }

    if (!this.state.sessionId) {
      return;
    }

    try {

      const { data, error } =
        await this.supabaseService.client
          .from('chat_messages')
          .insert({
            session_id:
              this.state.sessionId,

            sender,

            message,

            intent:
              this.state.lastIntent,

            step:
              this.state.currentStep
          })
          .select('id')
          .single();

      if (error) {

        console.error(
          'Message save error:',
          error
        );

        return;
      }

      if (sender === 'user') {

        const last =
          [...this.messages]
            .reverse()
            .find(
              item =>
                item.sender === 'user' &&
                item.text === message
            );

        if (last && data?.id) {
          last.dbId = data.id;
        }
      }

    } catch (error) {

      console.error(
        'Message save exception:',
        error
      );
    }
  }

  // =====================================================
  // REQUEST EVENT
  // =====================================================

  private async saveEvent(
    eventType: string,
    eventData: any = {}
  ): Promise<void> {

    try {

      const payload: any = {

        session_id:
          this.state.sessionId,

        request_id:
          this.state.requestId,

        event_type:
          eventType,

        event_data:
          eventData
      };

      const { error } =
        await this.supabaseService.client
          .from('request_events')
          .insert(payload);

      if (error) {

        console.error(
          'Request event error:',
          error
        );
      }

    } catch (error) {

      console.error(
        'Request event exception:',
        error
      );
    }
  }

  // =====================================================
  // ADD USER MESSAGE
  // =====================================================

  private addUserMessage(text: string): void {

    this.messages.push({

      id: this.messageId++,

      sender: 'user',

      text,

      time: this.nowTime()
    });

    this.cdr.markForCheck();
    this.scrollMessages();

    void this.saveMessage(
      'user',
      text
    );

    // Do NOT persist the session here. The user's message is added before
    // generateReply() updates name/phone/guests/currentStep. Persisting here
    // creates a race where stale state (for example name = '' and step = name)
    // can overwrite the newer state a moment later. sendMessage()/generateReply()
    // persist after the state transition instead.
  }

  // =====================================================
  // ADD BOT MESSAGE
  // =====================================================

  private addBotMessage(text: string): void {

    this.messages.push({

      id: this.messageId++,

      sender: 'bot',

      text,

      time: this.nowTime()
    });

    this.cdr.markForCheck();
    this.scrollMessages();

    void this.saveMessage(
      'bot',
      text
    );

    void this.updateSession();
  }


  // =====================================================
  // BOOKING SUMMARY MESSAGE
  // =====================================================

  private addBookingSummaryMessage(): void {

    const place = this.state.selectedPlace;

    if (!place) {
      return;
    }

    const guests =
      this.state.guests || 1;

    const unitPrice =
      this.getCurrentSellingPrice();

    // Keep only the latest booking summary.
    this.messages = this.messages.filter(
      message =>
        message.context !== 'booking-summary'
    );

    this.messages.push({
      id: this.messageId++,
      sender: 'bot',
      kind: 'booking-summary',
      text: 'بيانات الحجز',
      time: this.nowTime(),
      context: 'booking-summary',
      bookingSummary: {
        placeName: this.state.selectedPackage
          ? `${place.name} - ${this.getItemName(this.state.selectedPackage)}`
          : place.name,
        date: this.state.date || 'غير محدد',
        time: this.state.time || 'غير محدد',
        guests,
        unitPrice,
        totalPrice: unitPrice * guests
      }
    });

    this.scrollMessages();
  }

  // =====================================================
  // PLACE MESSAGE INSIDE CHAT
  // =====================================================

  private replaceSelectedPlaceInChat(
    place: Place,
    prompt: string
  ): void {

    // Remove the previous selected-place card and its related prompt.
    this.messages = this.messages.filter(
      message =>
        message.kind !== 'place' &&
        message.context !== 'place-selection'
    );

    // Add the selected place as a real message in the conversation.
    this.messages.push({
      id: this.messageId++,
      sender: 'bot',
      kind: 'place',
      place,
      text: place.name,
      time: this.nowTime(),
      context: 'place-selection'
    });

    // Add only the current follow-up prompt under the card.
    this.messages.push({
      id: this.messageId++,
      sender: 'bot',
      kind: 'text',
      text: prompt,
      time: this.nowTime(),
      context: 'place-selection'
    });

    this.scrollMessages();

    void this.saveMessage(
      'bot',
      `[مكان مختار] ${place.name}`
    );

    void this.saveMessage(
      'bot',
      prompt
    );

    void this.updateSession();
  }

  // =====================================================
  // CONTAINS
  // =====================================================

  private containsAny(
    text: string,
    words: string[]
  ): boolean {

    const normalized =
      this.normalize(text);

    return words.some(word =>
      normalized.includes(
        this.normalize(word)
      )
    );
  }

  // =====================================================
  // YES
  // =====================================================

  private isYes(text: string): boolean {

    const normalized =
      this.normalize(text);

    const yesWords = [
      'ايوه',
      'ايوة',
      'ايوا',
      'اه',
      'اها',
      'نعم',
      'تمام',
      'ماشي',
      'اكيد',
      'يلا',
      'موافق',
      'موافقه',
      'صح',
      'بالضبط',
      'طبعا',
      'حاضر',
      'اوكي',
      'ok',
      'okay',
      'yes',
      'نكمل',
      'كمل',
      'يلا بينا',
      'تمام كده',
      'كده تمام'
    ];

    return yesWords.some(word =>
      normalized ===
      this.normalize(word)
    );
  }

  // =====================================================
  // NO
  // =====================================================

  private isNo(text: string): boolean {

    const normalized =
      this.normalize(text);

    const noWords = [
      'لا',
      'لأ',
      'لاء',
      'مش عايز',
      'مش عايزه',
      'مش محتاج',
      'مش محتاجه',
      'خلاص',
      'بلاش',
      'لا شكرا',
      'لا شكرا',
      'no',
      'الغاء',
      'الغى',
      'cancel'
    ];

    return noWords.some(word =>
      normalized ===
      this.normalize(word)
    );
  }

  // =====================================================
  // GREETING
  // =====================================================

  private isGreeting(text: string): boolean {

    const normalized =
      this.normalize(text);

    const greetings = [
      'السلام عليكم',
      'السلام عليكم ورحمة الله',
      'اهلا',
      'اهلا بيك',
      'مرحبا',
      'هاي',
      'hello',
      'hi',
      'hey',
      'صباح الخير',
      'صباح النور',
      'مساء الخير',
      'مساء النور',
      'ازيك',
      'ازايك',
      'عامل ايه',
      'عامله ايه',
      'اخبارك',
      'عامل اي',
      'كيف حالك'
    ];

    return greetings.some(word =>
      normalized.includes(
        this.normalize(word)
      )
    );
  }

  // =====================================================
  // DAY USE SCOPE / FRIENDLY REDIRECT
  // =====================================================

  private isClearlyOffTopic(text: string): boolean {
    const t = this.normalize(text);

    // Keep normal social chat inside the conversation.
    if (
      this.isGreeting(text) ||
      this.containsAny(t, [
        'عامل ايه', 'عامل اي', 'اخبارك', 'ازيك', 'ازايك',
        'كيف حالك', 'شكرا', 'شكراً', 'متشكر', 'متشكرة',
        'تسلم', 'تسلمي', 'ميرسي', 'thanks', 'thank you'
      ])
    ) {
      return false;
    }

    // IMPORTANT:
    // Detect strong off-topic subjects BEFORE generic words such as "حجز".
    // Example: "حجز الكورة امتي؟" contains the word "حجز", but it is
    // clearly about football, not a Tasahel Day Use booking.
    if (
      this.containsAny(t, [
        'الطقس', 'درجه الحراره', 'درجة الحرارة', 'هتمطر', 'مطر',
        'الكوره', 'الكورة', 'كره القدم', 'كرة القدم', 'ماتش', 'مباراه', 'مباراة',
        'الدوري', 'الاهلي', 'الأهلي', 'الزمالك هيلعب', 'منتخب مصر',
        'سياسه', 'سياسة', 'انتخابات', 'رئيس الجمهوريه', 'رئيس الجمهورية',
        'برمجه', 'برمجة', 'كود', 'javascript', 'typescript', 'python',
        'بورصه', 'بورصة', 'دولار', 'عملات', 'سعر الذهب',
        'وصفه', 'وصفة', 'طبخه', 'طبخة', 'اكل اعمله', 'أكل أعمله',
        'اكل ايه', 'اكل اية', 'أكل ايه', 'أكل إيه', 'ناكل ايه', 'ناكل اية',
        'اطبخ ايه', 'اطبخ اية', 'أطبخ ايه', 'أطبخ إيه',
        'دواء', 'علاج', 'دكتور', 'اعراض', 'أعراض',
        'فيلم', 'مسلسل', 'اغنيه', 'أغنية', 'مغني', 'ممثل',
        'خبر', 'اخبار العالم', 'أخبار العالم',
        'حل الواجب', 'واجب مدرسه', 'واجب مدرسة', 'رياضيات',
        'ترجمه', 'ترجمة'
      ])
    ) {
      return true;
    }

    // Anything that clearly belongs to the Day Use / booking flow stays in scope.
    if (
      this.detectPlaceType(text) ||
      this.extractArea(text) ||
      this.extractGuests(text) !== null ||
      this.extractPhone(text) !== null ||
      this.containsAny(t, [
        'day use', 'dayuse', 'داي يوز', 'داي يوس',
        'فندق', 'منتجع', 'مكان', 'باكدج', 'باكدجات',
        'سعر', 'ميزانيه', 'ميزانية', 'منطقه', 'منطقة',
        'عدد', 'شخص', 'اشخاص', 'افراد', 'فرد',
        'حمام سباحه', 'حمام سباحة', 'pool', 'سبا', 'اكوا بارك',
        'دفع', 'فلوس', 'ايصال', 'إيصال', 'جايدا', 'geidea',
        'حاله الطلب', 'حالة الطلب', 'رقم المتابعه', 'رقم المتابعة'
      ])
    ) {
      return false;
    }

    // Generic booking words are accepted only after off-topic subjects were ruled out.
    if (
      this.containsAny(t, [
        'حجز', 'احجز', 'احجزلي', 'نحجز', 'عايز احجز', 'عايزه احجز', 'book'
      ])
    ) {
      return false;
    }

    return false;
  }

  private getDayUseRedirectMessage(): string {
    const name = this.state.name ? ` يا ${this.state.name}` : '';

    let nextStep = '';

    switch (this.state.awaiting) {
      case 'name':
        nextStep = 'نبدأ بحاجة بسيطة: ممكن تقولي اسم حضرتك؟ 😊';
        break;

      case 'phone':
        nextStep = `نكمل طلب الـ Day Use بتاعنا: ممكن رقم الموبايل علشان فريق تساهيل يقدر يتواصل معاك بخصوص الحجز؟`;
        break;

      case 'guests':
        nextStep = 'قولي بس الحجز لعدد كام شخص، وأنا أكمل معاك خطوة بخطوة.';
        break;

      case 'budget':
        nextStep = 'قولي الميزانية المناسبة للفرد، ولو مش فارقة معاك قولي "مش فارقة".';
        break;

      case 'area':
        nextStep = 'قولي المنطقة اللي تفضلها، أو قولي "أي مكان" وأنا أرشحلك الأنسب.';
        break;

      case 'date':
        nextStep = 'نكمل الحجز: تحب الـ Day Use يكون يوم إيه؟';
        break;

      case 'time':
        nextStep = 'تمام، فاضل وقت الدخول: تحب يكون الساعة كام؟';
        break;

      case 'booking_confirmation':
        nextStep = 'راجع بيانات الحجز اللي فوق، ولو كلها مناسبة اكتب "أيوة" ونكمل.';
        break;

      case 'payment_method':
        nextStep = 'نكمل الدفع من اختيار طريقة الدفع الظاهرة عندك، وبعدها تقدر ترفع الإيصال.';
        break;

      default:
        if (this.state.selectedPlace) {
          nextStep = `لو حابب نكمل على ${this.state.selectedPlace.name}، أقدر أقولك السعر والباكدجات والخدمات أو نبدأ الحجز.`;
        } else {
          nextStep = 'قولي عدد الأشخاص والميزانية والمنطقة اللي تفضلها، وأنا أطلعلك أنسب اختيارات الـ Day Use.';
        }
        break;
    }

    return `أنا مساعد تساهيل للـ Day Use${name} ❤️\n\nسؤالك بعيد شوية عن اختيار أو حجز الـ Day Use، فمش هفتي عليك في حاجة مش تخصصي 😊\n\nأنا هنا أقدر أساعدك تختار المكان المناسب، تقارن الأسعار والباكدجات، وتكمل الحجز ومتابعته مع فريق تساهيل.\n\n${nextStep}`;
  }

  // =====================================================
  // EXTRACT GUESTS
  // =====================================================

  private extractGuests(
    text: string
  ): number | null {

    const normalized =
      this.normalize(text);

    const contextualMatch =
      normalized.match(
        /(?:عددنا|احنا|نحن|عدد الاشخاص|عدد الافراد|لعدد|العدد|عدد)\s*(\d{1,2})/
      );

    if (contextualMatch) {

      const value =
        Number(contextualMatch[1]);

      if (
        value >= 1 &&
        value <= 50
      ) {
        return value;
      }
    }

    const personMatch =
      normalized.match(
        /(\d{1,2})\s*(?:اشخاص|شخص|افراد|فرد|ناس|شخصا|اشخاصا)/
      );

    if (personMatch) {

      const value =
        Number(personMatch[1]);

      if (
        value >= 1 &&
        value <= 50
      ) {
        return value;
      }
    }

    const numberOnly =
      normalized.match(
        /^\d{1,2}$/
      );

    if (numberOnly) {

      const value =
        Number(numberOnly[0]);

      if (
        value >= 1 &&
        value <= 50
      ) {
        return value;
      }
    }

    const arabicNumbers: Record<string, number> = {

      'واحد': 1,
      'واحده': 1,

      'اتنين': 2,
      'اثنين': 2,
      'اثنان': 2,
      'اتنان': 2,

      'تلاته': 3,
      'ثلاثه': 3,
      'ثلاث': 3,

      'اربعه': 4,
      'اربعة': 4,

      'خمسه': 5,
      'خمسة': 5,

      'سته': 6,
      'ستة': 6,

      'سبعه': 7,
      'سبعة': 7,

      'تمانيه': 8,
      'ثمانيه': 8,
      'ثمانية': 8,

      'تسعه': 9,
      'تسعة': 9,

      'عشره': 10,
      'عشرة': 10,

      'حداشر': 11,
      'اتناشر': 12,
      'تلتاشر': 13,
      'ثلاثتاشر': 13,
      'اربعتاشر': 14,
      'خمستاشر': 15,
      'ستاشر': 16,
      'سبعتاشر': 17,
      'تمنتاشر': 18,
      'تسعتاشر': 19,

      'عشرين': 20
    };

    for (
      const key in arabicNumbers
    ) {

      if (
        normalized.includes(key)
      ) {

        return arabicNumbers[key];
      }
    }

    if (
      this.containsAny(
        normalized,
        [
          'انا وزوجتي',
          'انا ومراتي',
          'انا وزوجي',
          'انا وجوزي',
          'انا وجوزتي',
          'انا وصاحبتي',
          'انا وصاحبي',
          'انا واختي',
          'انا واخويا',
          'انا واخوي',
          'انا وصديقي',
          'انا وصديقتي',
          'انا وخطيبتي',
          'انا وخطيبي',
          'انا وحبيبتي',
          'انا وحبيبي',
          'انا وشريكتي',
          'انا وشريكي',
          'انا وهي',
          'انا وهو',
          'انا ومرتي'
        ]
      )
    ) {

      return 2;
    }

    if (
      this.containsAny(
        normalized,
        [
          'للزوجين',
          'لينا احنا الاتنين',
          'احنا الاتنين',
          'نحن الاثنين',
          'زوجين',
          'كابلز',
          'couples',
          'couple',
          'اتنين بس',
          'اثنين بس'
        ]
      )
    ) {

      return 2;
    }

    const generic =
      normalized.match(
        /(?:احنا|نحن)\s*(?:حوالي|تقريبا)?\s*(\d{1,2})/
      );

    if (generic) {

      const value =
        Number(generic[1]);

      if (
        value >= 1 &&
        value <= 50
      ) {
        return value;
      }
    }

    return null;
  }

  // =====================================================
  // EXTRACT BUDGET
  // =====================================================

  private extractBudget(
    text: string
  ): number | 'any' | null {

    // Phone-looking input is contact data, never a budget — even when the
    // number is incomplete or invalid. This prevents inputs such as
    // 012334455 from becoming a huge budget value.
    if (this.looksLikePhoneAttempt(text)) {
      return null;
    }

    const normalized =
      this.normalize(text);

    // Open / flexible budget
    if (
      this.containsAny(
        normalized,
        [
          'مش فارقه',
          'مش فارق',
          'مش مهم',
          'مش مهمه',
          'مفتوح',
          'مفتوحة',
          'اي ميزانيه',
          'اي ميزانية',
          'اي سعر',
          'اي اسعار',
          'على حسب',
          'مش فارقة معايا',
          'مش فارق معايا',
          'الميزانيه مفتوحه',
          'الميزانية مفتوحة',
          'عادي'
        ]
      )
    ) {
      return 'any';
    }

    const awaitingBudget =
      this.state.awaiting === 'budget';

    const hasBudgetContext =
      this.containsAny(
        normalized,
        [
          'ميزانيه',
          'ميزانية',
          'السعر',
          'سعر',
          'جنيه',
          'للفرد',
          'في حدود',
          'حدود',
          'budget',
          'الف',
          'الاف',
          'k'
        ]
      );

    // Explicit Arabic budget words: ألف، ألفين، تلات آلاف...
    const wordBudget =
      this.extractArabicBudgetWord(
        normalized
      );

    if (wordBudget !== null) {
      return wordBudget;
    }

    // Numeric range, e.g. 1000-1500 or 1-2 آلاف
    const range =
      normalized.match(
        /(\d+(?:\.\d+)?)\s*(?:الى|ل|لحد|-)\s*(\d+(?:\.\d+)?)/
      );

    if (range) {
      let first = Number(range[1]);
      let second = Number(range[2]);

      const hasThousands =
        normalized.includes('الف') ||
        normalized.includes('الاف') ||
        normalized.includes('k');

      if (hasThousands) {
        if (first < 100) {
          first *= 1000;
        }

        if (second < 100) {
          second *= 1000;
        }
      }

      if (first > 0 && second > 0) {
        return Math.round(
          (first + second) / 2
        );
      }
    }

    // Number explicitly written in thousands, e.g. 3 آلاف / 2.5k
    const thousandMatch =
      normalized.match(
        /(\d+(?:\.\d+)?)\s*(?:الف|الاف|k)\b/
      );

    if (thousandMatch) {
      const value = Number(thousandMatch[1]);

      if (Number.isFinite(value) && value > 0) {
        return Math.round(value * 1000);
      }
    }

    // Plain numeric value
    const match =
      normalized.match(
        /(\d+(?:\.\d+)?)/
      );

    if (!match) {
      return null;
    }

    const amount = Number(match[1]);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return null;
    }

    // Do not steal small numbers from guest-count messages.
    // Example: "3 أشخاص" must stay guests=3, not budget=3.
    if (
      amount < 100 &&
      !hasBudgetContext &&
      !awaitingBudget
    ) {
      return null;
    }

    // While explicitly asking for budget, Egyptian shorthand like
    // "3" is interpreted as 3000 rather than 3 EGP.
    if (
      awaitingBudget &&
      amount >= 1 &&
      amount <= 50
    ) {
      return amount * 1000;
    }

    if (amount >= 100) {
      return Math.round(amount);
    }

    return null;
  }

  // =====================================================
  // CONVERT BUDGET
  // =====================================================

  private convertBudgetNumber(
    amount: number,
    text: string
  ): number {

    const normalized =
      this.normalize(text);

    if (
      normalized.includes('الف') ||
      normalized.includes('الاف') ||
      normalized.includes('الفين')
    ) {

      if (amount < 100) {
        amount *= 1000;
      }
    }

    if (
      normalized.includes('k')
    ) {

      if (amount < 100) {
        amount *= 1000;
      }
    }

    return amount;
  }

  // =====================================================
  // ARABIC BUDGET WORD
  // =====================================================

  private extractArabicBudgetWord(
    text: string
  ): number | null {

    const values: Record<string, number> = {

      'الفين': 2000,

      'تلات الاف': 3000,
      'ثلاث الاف': 3000,

      'اربعة الاف': 4000,
      'اربعه الاف': 4000,

      'خمسة الاف': 5000,
      'خمسه الاف': 5000,

      'ستة الاف': 6000,
      'سته الاف': 6000,

      'سبعة الاف': 7000,
      'سبعه الاف': 7000,

      'تمانية الاف': 8000,
      'ثمانية الاف': 8000,

      'تسعة الاف': 9000,
      'تسعه الاف': 9000,

      'الف': 1000,
      'الف جنيه': 1000
    };

    for (
      const key in values
    ) {

      if (
        text.includes(key)
      ) {

        return values[key];
      }
    }

    return null;
  }

  // =====================================================
  // AREA ALIASES
  // =====================================================

  private areaAliases: Record<
    string,
    string[]
  > = {

    'new-cairo': [
      'التجمع الخامس',
      'التجمع',
      'القاهرة الجديدة',
      'كايرو فيستيفال',
      'كايرو فيستفال',
      'new cairo',
      'new-cairo'
    ],

    'zamalek': [
      'الزمالك',
      'الزمالك والنيل',
      'zamalek'
    ],

    'garden-city': [
      'جاردن سيتي',
      'جاردن سيتى',
      'garden city'
    ],

    'giza': [
      'الجيزة',
      'الجيزه',
      'الهرم',
      'الأهرامات',
      'الاهرامات',
      'giza',
      'pyramids'
    ],

    'downtown': [
      'وسط البلد',
      'وسطالقاهرة',
      'وسط القاهره',
      'downtown'
    ],

    'corniche': [
      'كورنيش النيل',
      'كورنيش',
      'النيل',
      'corniche'
    ]
  };

  // =====================================================
  // AREA LABEL
  // =====================================================

  private getAreaLabel(
    area: string | null
  ): string {

    const labels: Record<
      string,
      string
    > = {

      'new-cairo':
        'التجمع الخامس',

      'zamalek':
        'الزمالك',

      'garden-city':
        'جاردن سيتي',

      'giza':
        'الجيزة',

      'downtown':
        'وسط البلد',

      'corniche':
        'كورنيش النيل',

      'any':
        'كل المناطق'
    };

    return (
      labels[area || ''] ||
      area ||
      'المنطقة المطلوبة'
    );
  }

  // =====================================================
  // EXTRACT AREA
  // =====================================================

  private extractArea(
    text: string
  ): string | null {

    const normalized =
      this.normalize(text);

    for (
      const area in this.areaAliases
    ) {

      const aliases =
        this.areaAliases[area];

      if (
        aliases.some(alias =>
          normalized.includes(
            this.normalize(alias)
          )
        )
      ) {

        return area;
      }
    }

    return null;
  }

  // =====================================================
  // ANY AREA
  // =====================================================

  private isAnyArea(
    text: string
  ): boolean {

    return this.containsAny(
      text,
      [
        'مش فارقه المنطقة',
        'مش فارق المنطقة',
        'مش مهم المنطقة',
        'اي مكان',
        'أي مكان',
        'كل الاماكن',
        'كل الأماكن',
        'اي منطقة',
        'أي منطقة',
        'مفتوح',
        'مفتوحة',
        'مش فارقة',
        'براحتكم',
        'اختارلي',
        'اختار لي'
      ]
    );
  }

  // =====================================================
  // PLACE TYPE
  // =====================================================

  private detectPlaceType(
    text: string
  ): string | null {

    const normalized =
      this.normalize(text);

    if (
      this.containsAny(
        normalized,
        [
          'couples',
          'couple',
          'كابلز',
          'للزوجين',
          'رومانسي',
          'رومانسيه',
          'رومانسية',
          'انا وزوجتي',
          'انا ومراتي',
          'خطيبتي',
          'خطيبي',
          'حبيبتي',
          'حبيبي'
        ]
      )
    ) {

      return 'couples';
    }

    if (
      this.containsAny(
        normalized,
        [
          'عائلي',
          'عائله',
          'عائلة',
          'للعيله',
          'للعائلة',
          'اطفال',
          'أطفال',
          'اولاد',
          'kids',
          'family'
        ]
      )
    ) {

      return 'family';
    }

    if (
      this.containsAny(
        normalized,
        [
          'aqua park',
          'aquapark',
          'اكوا بارك',
          'اكوابارك',
          'العاب مائيه',
          'العاب مائية',
          'ملاهي مائيه',
          'ملاهي مائية'
        ]
      )
    ) {

      return 'aqua';
    }

    if (
      this.containsAny(
        normalized,
        [
          'سبا',
          'spa',
          'مساج',
          'massage'
        ]
      )
    ) {

      return 'spa';
    }

    if (
      this.containsAny(
        normalized,
        [
          'حمام سباحه',
          'حمام سباحة',
          'بيسين',
          'pool',
          'swimming'
        ]
      )
    ) {

      return 'pool';
    }

    return null;
  }

  // =====================================================
  // INTENT
  // =====================================================

  private detectIntent(
    text: string
  ): string | null {

    const t =
      this.normalize(text);

    if (
      this.containsAny(
        t,
        [
          'احجز',
          'حجز',
          'احجزلي',
          'عايز احجز',
          'عايزه احجز',
          'نحجز',
          'book'
        ]
      )
    ) {

      return 'booking';
    }

    if (
      this.containsAny(
        t,
        [
          'السعر',
          'بكام',
          'كام',
          'تكلفه',
          'تكلفة',
          'سعر',
          'price'
        ]
      )
    ) {

      return 'price';
    }

    if (
      this.containsAny(
        t,
        [
          'عنوان',
          'لوكيشن',
          'location',
          'فين',
          'موقع',
          'address'
        ]
      )
    ) {

      return 'address';
    }

    if (
      this.containsAny(
        t,
        [
          'باكدج',
          'باكدجات',
          'package',
          'packages'
        ]
      )
    ) {

      return 'package';
    }

    if (
      this.containsAny(
        t,
        [
          'اكل',
          'غداء',
          'غدا',
          'فطار',
          'مشروبات',
          'مطعم',
          'food',
          'drink'
        ]
      )
    ) {

      return 'food';
    }

    if (
      this.containsAny(
        t,
        [
          'خدمات',
          'مميزات',
          'مرافق',
          'facilities',
          'services'
        ]
      )
    ) {

      return 'services';
    }

    if (
      this.containsAny(
        t,
        [
          'سبا',
          'spa',
          'مساج',
          'massage'
        ]
      )
    ) {

      return 'spa';
    }

    if (
      this.containsAny(
        t,
        [
          'aqua',
          'اكوا',
          'العاب مائيه',
          'العاب مائية',
          'ملاهي مائيه',
          'ملاهي مائية'
        ]
      )
    ) {

      return 'aqua';
    }

    if (
      this.containsAny(
        t,
        [
          'day use',
          'dayuse',
          'داي يوز',
          'داي يوس',
          'يوم في فندق',
          'يوم في منتجع',
          'خروجه',
          'خرجه',
          'خروجة',
          'عايز اخرج'
        ]
      )
    ) {

      return 'day_use';
    }

    return null;
  }

  // =====================================================
  // DATE
  // =====================================================

  private extractDate(
    text: string
  ): string | null {

    const normalized =
      this.normalize(text);

    const numeric =
      normalized.match(
        /(?:يوم|تاريخ)?\s*(\d{1,2})\s*[\/-]\s*(\d{1,2})/
      );

    if (numeric) {

      return `${numeric[1]}/${numeric[2]}`;
    }

    const namedDate =
      normalized.match(
        /(?:يوم\s*)?(\d{1,2})\s*(?:سبتمبر|اكتوبر|أكتوبر|نوفمبر|ديسمبر|يناير|فبراير|مارس|ابريل|أبريل|مايو|يونيو|يوليو|اغسطس|أغسطس)/
      );

    if (namedDate) {

      return text.trim();
    }

    const day =
      normalized.match(
        /(?:يوم)?\s*(\d{1,2})/
      );

    if (day) {

      const value =
        Number(day[1]);

      if (
        value >= 1 &&
        value <= 31
      ) {

        return day[1];
      }
    }

    if (
      this.containsAny(
        normalized,
        [
          'بكره',
          'بكرا',
          'غدا',
          'غدًا'
        ]
      )
    ) {

      return 'غدًا';
    }

    if (
      this.containsAny(
        normalized,
        [
          'النهارده',
          'اليوم'
        ]
      )
    ) {

      return 'اليوم';
    }

    if (
      this.containsAny(
        normalized,
        [
          'السبت',
          'الاحد',
          'الأحد',
          'الاتنين',
          'الاثنين',
          'التلات',
          'الثلاثاء',
          'الاربع',
          'الأربعاء',
          'الخميس',
          'الجمعه',
          'الجمعة'
        ]
      )
    ) {

      return text.trim();
    }

    return null;
  }

  // =====================================================
  // TIME
  // =====================================================

  private extractTime(
    text: string
  ): string | null {

    const normalized =
      this.normalize(text);

    const match =
      normalized.match(
        /(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm|الصبح|المساء|بالليل|الظهر|بعد الظهر|العصر|المغرب)?/
      );

    if (match) {

      return match[0];
    }

    if (
      this.containsAny(
        normalized,
        [
          'الصبح',
          'صباح',
          'الظهر',
          'بعد الظهر',
          'العصر',
          'المغرب',
          'المساء',
          'بالليل'
        ]
      )
    ) {

      return text.trim();
    }

    return null;
  }

  // =====================================================
  // NAME
  // =====================================================

  private extractName(
    text: string
  ): string | null {

    const original =
      String(text || '').trim();

    const normalized =
      this.normalize(original);

    if (!normalized) {
      return null;
    }

    const invalidNames = [
      'مرحب',
      'مرحبا',
      'اهلا',
      'اهلا وسهلا',
      'اهلين',
      'هلا',
      'هاي',
      'hello',
      'hi',
      'hey',

      'ازيك',
      'ازيكم',
      'ازاي',
      'عامل ايه',
      'عامله ايه',
      'اخبارك',

      'صباح الخير',
      'صباح النور',
      'مساء الخير',
      'مساء النور',

      'ماشي',
      'تمام',
      'يلا',
      'حاضر',
      'اوكي',
      'okay',
      'ok',
      'ايوه',
      'ايوا',
      'اه',
      'نعم',
      'لا',

      'عايز',
      'عايزه',
      'محتاج',
      'محتاجه',
      'اريد',
      'ممكن',
      'لو سمحت',
      'لو سمحتي',

      'مكان',
      'فندق',
      'منتجع',
      'حجز',
      'العدد',
      'ميزانيه',
      'ميزانية',
      'شخص',
      'اشخاص',
      'فرد',
      'افراد',
      'منطقة',
      'منطقه',

      'شكرا',
      'متشكر',
      'متشكرة',
      'تسلم',
      'تسلمي',
      'باكدج',
      'باكدجات',
      'السعر',
      'سعر',
      'الخدمات',
      'خدمات',
      'العنوان',
      'عنوان',
      'احجز',
      'الحجز'
    ];

    if (
      invalidNames.some(
        word =>
          normalized ===
          this.normalize(word)
      )
    ) {

      return null;
    }

    const arabicMatch =
      original.match(
        /(?:انا اسمي|أنا اسمي|اسمي|اسمي هو|انا|أنا)\s+([a-zA-Z\u0600-\u06FF]+(?:\s+[a-zA-Z\u0600-\u06FF]+){0,3})/i
      );

    if (arabicMatch?.[1]) {

      let name =
        arabicMatch[1].trim();

      name =
        name
          .split(
            /\s+(?:وعايز|وعايزه|ومحتاج|ومحتاجه|عايز|عايزه|محتاج|محتاجه|و)\s+/i
          )[0]
          .trim();

      const nameNormalized =
        this.normalize(name);

      if (
        nameNormalized &&
        !invalidNames.some(
          word =>
            nameNormalized ===
            this.normalize(word)
        ) &&
        name.length >= 2 &&
        name.length <= 40 &&
        !/\d/.test(name)
      ) {

        return name;
      }
    }

    const englishMatch =
      original.match(
        /(?:my name is|my name's)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+){0,3})/i
      );

    if (englishMatch?.[1]) {

      const name =
        englishMatch[1].trim();

      if (
        name.length >= 2 &&
        name.length <= 40
      ) {

        return name;
      }
    }

    if (
      this.containsAny(
        normalized,
        [
          'عايز',
          'عايزه',
          'محتاج',
          'محتاجه',
          'اريد',
          'ممكن',
          'مكان',
          'فندق',
          'منتجع',
          'حجز',
          'العدد',
          'ميزانيه',
          'ميزانية',
          'شخص',
          'اشخاص',
          'منطقة',
          'منطقه',
          'day use',
          'داي يوز'
        ]
      )
    ) {

      return null;
    }

    if (
      this.containsAny(
        normalized,
        [
          'مرحبا',
          'مرحب',
          'اهلا',
          'هلا',
          'هاي',
          'hello',
          'hi',
          'صباح الخير',
          'مساء الخير'
        ]
      )
    ) {

      return null;
    }

    if (
      normalized.length >= 2 &&
      normalized.length <= 40 &&
      !/\d/.test(normalized) &&
      /^[a-zA-Z\u0600-\u06FF\s]+$/.test(original)
    ) {

      return original;
    }

    return null;
  }

  // =====================================================
  // PHONE
  // =====================================================

  private extractPhone(
    text: string
  ): string | null {

    const cleaned =
      String(text || '')
        .replace(/[^\d+]/g, '');

    const digits =
      cleaned.replace(/\D/g, '');

    const localPattern =
      /^01[0125]\d{8}$/;

    if (
      localPattern.test(digits)
    ) {

      return digits;
    }

    const internationalPattern =
      /^20(10|11|12|15)\d{8}$/;

    if (
      internationalPattern.test(digits)
    ) {

      return (
        '0' +
        digits.substring(2)
      );
    }

    return null;
  }

  // =====================================================
  // PHONE-LIKE INPUT
  // =====================================================

  private looksLikePhoneAttempt(
    text: string
  ): boolean {

    const original = String(text || '').trim();

    // Keep only digits so phrases such as "رقمي 012334455" are handled too.
    const digits = original.replace(/\D/g, '');

    // Egyptian mobile attempts normally start with 01. We intentionally
    // accept incomplete/overlong attempts here so they never become budget.
    if (/^01\d{7,11}$/.test(digits)) {
      return true;
    }

    // International Egyptian mobile attempt: 20 + 1x...
    if (/^20(?:10|11|12|15)\d{6,10}$/.test(digits)) {
      return true;
    }

    return false;
  }

  // =====================================================
  // SEND MESSAGE
  // =====================================================

  async sendMessage(): Promise<void> {

    if (this.state.completed) {
      return;
    }

    if (this.shouldShowPaymentMethodSelect) {
      this.addBotMessage(
        'اختار طريقة الدفع من القائمة الظاهرة تحت رسالة الحجز الأول 💳'
      );
      return;
    }

    if (
      this.state.isReplying
    ) {
      return;
    }

    const text =
      this.messageText.trim();

    if (!text) {
      return;
    }

    this.messageText = '';

    this.addUserMessage(text);

    await this.refreshConversationControl();

    if (
      this.state.botPaused ||
      this.state.conversationMode === 'agent'
    ) {

      this.state.isReplying = false;
      this.isTyping = false;
      this.cdr.markForCheck();

      void this.updateSession();
      return;
    }

    const currentRequest =
      await this.loadCurrentRequest();

    if (
      currentRequest &&
      !this.isRequestFinished(currentRequest)
    ) {

      this.state.isReplying = true;
      this.isTyping = true;
      this.cdr.markForCheck();

      try {
        const reply =
          await this.handleActiveRequestMessage(
            text,
            currentRequest
          );

        this.isTyping = false;

        if (reply) {
          this.addBotMessage(reply);
        }
      } finally {
        this.state.isReplying = false;
        this.isTyping = false;
        void this.updateSession({
          current_step: 'request_tracking'
        });
      }

      return;
    }

    if (
      currentRequest &&
      this.isRequestFinished(currentRequest)
    ) {

      if (this.isNewBookingIntent(text)) {
        await this.resetForNewRequest();
      } else {
        this.addBotMessage(
          this.getFinishedRequestMessage(
            currentRequest
          )
        );

        return;
      }
    }

    this.state.isReplying = true;

    this.isTyping = true;
    this.cdr.markForCheck();

    try {

      const reply =
        await this.generateReply(text);

      this.isTyping = false;
      this.cdr.markForCheck();

      if (reply) {
        this.addBotMessage(reply);
      }

    } catch (error) {

      console.error(
        'Chat error:',
        error
      );

      this.isTyping = false;

      this.addBotMessage(
        'حصل خطأ بسيط  جرّب تبعتلي رسالتك تاني.'
      );

    } finally {

      this.state.isReplying = false;
      this.isTyping = false;

      void this.updateSession();
    }
  }

  // =====================================================
  // QUICK ACTION
  // =====================================================

  async useQuickAction(
    message: string
  ): Promise<void> {

    if (this.state.completed) {
      return;
    }

    if (
      this.state.isReplying
    ) {
      return;
    }

    this.addUserMessage(message);

    await this.refreshConversationControl();

    if (
      this.state.botPaused ||
      this.state.conversationMode === 'agent'
    ) {

      this.state.isReplying = false;
      this.isTyping = false;
      this.cdr.markForCheck();

      void this.updateSession();
      return;
    }

    const currentRequest =
      await this.loadCurrentRequest();

    if (
      currentRequest &&
      !this.isRequestFinished(currentRequest)
    ) {

      this.state.isReplying = true;
      this.isTyping = true;
      this.cdr.markForCheck();

      try {
        const reply =
          await this.handleActiveRequestMessage(
            message,
            currentRequest
          );

        this.isTyping = false;

        if (reply) {
          this.addBotMessage(reply);
        }
      } finally {
        this.state.isReplying = false;
        this.isTyping = false;
        void this.updateSession({
          current_step: 'request_tracking'
        });
      }

      return;
    }

    if (
      currentRequest &&
      this.isRequestFinished(currentRequest)
    ) {
      await this.resetForNewRequest();
    }

    this.state.isReplying = true;

    this.isTyping = true;

    try {

      const reply =
        await this.generateReply(message);

      this.isTyping = false;

      if (reply) {
        this.addBotMessage(reply);
      }

    } catch (error) {

      console.error(
        'Quick action error:',
        error
      );

      this.isTyping = false;

      this.addBotMessage(
        'حصل خطأ بسيط  جرّب تاني.'
      );

    } finally {

      this.state.isReplying = false;
      this.isTyping = false;

      void this.updateSession();
    }
  }

  // =====================================================
  // GENERATE REPLY
  // =====================================================

private async generateReply(userMessage: string): Promise<string> {

    if (this.state.completed) {
      return '';
    }

    this.lastUserText = userMessage;

    const t =
      this.normalize(userMessage);

    this.state.conversationStarted = true;

    // ---------------------------------------------------
    // DETECTIONS
    // ---------------------------------------------------

    const detectedGuests =
      this.extractGuests(userMessage);

    const detectedBudget =
      this.extractBudget(userMessage);

    const detectedArea =
      this.extractArea(userMessage);

    const detectedType =
      this.detectPlaceType(userMessage);

    const detectedIntent =
      this.detectIntent(userMessage);

    const detectedPhone =
      this.extractPhone(userMessage);

    // ===================================================
    // INVALID / INCOMPLETE PHONE-LIKE INPUT
    // ===================================================

    // If the customer clearly typed something that looks like an Egyptian
    // mobile number but it is not valid yet, consume it here BEFORE budget,
    // guests, recommendations or fallback logic. Most importantly, keep the
    // already selected place and booking context intact.
    if (
      !detectedPhone &&
      this.looksLikePhoneAttempt(userMessage)
    ) {

      if (this.state.selectedPlace) {
        this.state.awaiting = 'phone';
        this.state.currentStep = 'phone';
        this.state.lastIntent = 'invalid_phone';
        void this.updateSession();

        return `الرقم ده شكله رقم موبايل، بس لسه مش كامل أو مش صحيح ❤️

اختيارك محفوظ عندي ومش هيتغير:
${this.state.selectedPlace.name}

ابعتي رقم موبايل مصري صحيح من 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.
مثال: 01233445566

ولو حابة تغيّري المكان قولي "غيّري المكان".`;
      }

      if (
        this.state.awaiting === 'phone' ||
        this.state.lastIntent === 'phone_declined' ||
        this.state.lastIntent === 'booking_waiting_phone'
      ) {
        this.state.awaiting = 'phone';
        this.state.currentStep = 'phone';
        this.state.lastIntent = 'invalid_phone';
        void this.updateSession();

        return `الرقم ده شكله رقم موبايل، بس لسه مش كامل أو مش صحيح ❤️

ابعتي رقم موبايل مصري من 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.
مثال: 01233445566`;
      }
    }

    // ===================================================
    // GLOBAL PHONE CAPTURE
    // ===================================================

    // A valid Egyptian mobile number is contact data in ANY chat step.
    // The customer may refuse it first, browse places, choose a place,
    // enter guests/date/time, then send the number later. Consume it here
    // before name/requirements/booking parsers so it can never become a
    // budget, guest count, date, or generic fallback message.
    if (detectedPhone) {

      // We still need a customer name before storing contact details.
      if (!this.state.name || this.state.awaiting === 'name') {
        return `تمام ❤️

الرقم وصلني، بس محتاج أعرف اسم حضرتك الأول علشان أسجل البيانات صح.

ممكن تقولي اسمك؟`;
      }

      const phoneChanged =
        this.state.phone !== detectedPhone;

      this.state.phone = detectedPhone;
      this.state.dayUse = true;
      this.state.lastIntent = 'collect_phone';

      if (phoneChanged) {
        void this.saveEvent(
          'contact_collected',
          {
            name: this.state.name,
            phone: this.state.phone
          }
        );
      }

      // A selected place is the strongest context: never send the customer
      // back to recommendations after receiving the phone number.
      if (this.state.selectedPlace) {

        if (!this.state.guests) {
          this.state.awaiting = 'guests';
          this.state.currentStep = 'guests';
          void this.updateSession();

          return `تمام يا ${this.state.name} ❤️

رقم الموبايل اتسجل: ${this.state.phone}
واختيارك محفوظ عندي: ${this.state.selectedPlace.name}

الحجز هيكون لعدد كام شخص؟`;
        }

        // If booking details were already collected before the phone number,
        // return to confirmation for the SAME place/date/time.
        if (this.state.date && this.state.time) {
          this.state.awaiting = 'booking_confirmation';
          this.state.currentStep = 'booking_confirmation';
          void this.updateSession();

          this.addBookingSummaryMessage();

          return `تمام يا ${this.state.name} ❤️

رقم الموبايل اتسجل بنجاح، وكل اختياراتك لسه محفوظة:
${this.state.selectedPlace.name}

راجعي ملخص الحجز، ولو كل حاجة تمام اكتبي "أيوة" أو "تمام" للتأكيد.
ولو حابة تغيّري المكان قولي "غيّري المكان".`;
        }

        this.state.awaiting = 'place_selected';
        this.state.currentStep = 'place_selected';
        void this.updateSession();

        return `تمام يا ${this.state.name} ❤️

رقم الموبايل اتسجل بنجاح.
واختيارك لسه محفوظ عندي: ${this.state.selectedPlace.name}

لو عايزة نكمّل نفس المكان قولي "احجز"، ولو حابة تغيّريه قولي "غيّري المكان".`;
      }

      // No place selected yet. Continue the Day Use discovery flow, but do
      // not parse this phone message as budget/guests.
      this.state.awaiting = null;
      this.state.currentStep = 'requirements';
      void this.updateSession();

      if (this.hasAllRequirements()) {
        return await this.finishRequirements();
      }

      return await this.askNextRequirement();
    }

    // ===================================================
    // OUT OF SCOPE
    // ===================================================

    if (this.isClearlyOffTopic(userMessage)) {
      this.state.lastIntent = 'out_of_scope';
      return this.getDayUseRedirectMessage();
    }

    // ===================================================
    // NAME
    // ===================================================

    if (
      this.state.awaiting === 'name'
    ) {

      // Place actions are never valid customer names.
      if (
        [
          'price',
          'package',
          'services',
          'address',
          'food',
          'spa',
          'aqua',
          'booking'
        ].includes(detectedIntent || '')
      ) {
        return `قبل ما نكمل تفاصيل المكان ❤️

ممكن تقولي اسم حضرتك الأول؟`;
      }

      const extractedName =
        this.extractName(userMessage);

      // A phone number is never accepted before a valid name.
      if (!extractedName) {

        if (detectedPhone) {
          return `قبل ما أسجل رقم الموبايل ❤️

محتاج اسم حضرتك الأول.

ممكن تقولي اسمك؟ `;
        }

        if (
          this.isGreeting(userMessage)
        ) {
          return `أهلاً وسهلاً بيك في تساهيل ❤️

ممكن تقولي اسم حضرتك؟ `;
        }

        return `محتاج أعرف اسم حضرتك الأول ❤️

مثلاً:
"أحمد"

أو:
"أنا اسمي أحمد"`;
      }

      this.state.name =
        extractedName.trim();

      this.state.lastIntent =
        'collect_name';

      // If the same message contains a valid phone number too,
      // collect it and continue directly to the requirements.
      if (detectedPhone) {

        this.state.phone =
          detectedPhone;

        this.state.dayUse =
          true;

        this.state.awaiting =
          null;

        this.state.currentStep =
          'requirements';

        void this.updateSession();

        void this.saveEvent(
          'contact_collected',
          {
            name:
              this.state.name,

            phone:
              this.state.phone
          }
        );

        // Do not treat the phone number itself as a budget.
        this.applyDetectedRequirements(
          detectedGuests,
          null,
          detectedArea,
          detectedType
        );

        if (
          this.hasAllRequirements()
        ) {
          return await this.finishRequirements();
        }

        return await this.askNextRequirement();
      }

      this.state.awaiting =
        'phone';

      this.state.currentStep =
        'phone';

      void this.updateSession();

      return `أهلاً بيك يا ${this.state.name} ❤️

ممكن رقم الموبايل علشان نقدر نتواصل معاك بخصوص الطلب والحجز؟ `;
    }

    // ===================================================
    // PHONE
    // ===================================================

    if (
      this.state.awaiting === 'phone'
    ) {

      // A clear refusal is not an invalid phone number.
      // Keep the conversation friendly and let the customer browse first.
      if (this.isNo(userMessage)) {
        this.state.lastIntent = 'phone_declined';
        this.state.dayUse = true;

        // If the customer already chose a place, never lose that context.
        // Keep the selected place and any booking date/time already entered.
        if (this.state.selectedPlace) {
          this.state.awaiting = 'place_selected';
          this.state.currentStep = 'place_selected';

          void this.updateSession();

          return `ولا يهمك${this.state.name ? ` يا ${this.state.name}` : ''} ❤️

اختيارك لسه محفوظ عندي:
${this.state.selectedPlace.name}

مش هأكد الحجز من غير رقم موبايل، لكن المكان والتفاصيل اللي اخترتها مش هتضيع.

لو حابة تغيّري المكان قولي "غيّري المكان"، ولو عايزة تكملي نفس الحجز ابعتي رقم الموبايل وقت ما تكوني جاهزة.`;
        }

        // No place selected yet: allow browsing without a phone number.
        this.state.awaiting = 'guests';
        this.state.currentStep = 'guests';

        void this.updateSession();

        return `ولا يهمك${this.state.name ? ` يا ${this.state.name}` : ''} ❤️

رقم الموبايل هنحتاجه بس لما تختار مكان وتحب تبدأ الحجز فعليًا، علشان فريق تساهيل يقدر يتابع معاك التأكيد.

دلوقتي نقدر نتفرج براحتنا على أماكن الـ Day Use والأسعار والباكدجات من غير ما تدخل الرقم 😊

نبدأ سوا: الـ Day Use هيكون لعدد كام شخص؟`;
      }

      if (!detectedPhone) {

        return `الرقم ده مش باين رقم موبايل مصري صحيح ❤️

لو حابب تكمل الحجز، ابعتهولي 11 رقم ويبدأ بـ:
010 أو 011 أو 012 أو 015

ولو مش حابب تدخل الرقم دلوقتي، قولّي "لا" ونقدر نشوف الأماكن والأسعار الأول.`;
      }

      this.state.phone =
        detectedPhone;

      this.state.dayUse =
        true;

      this.state.awaiting =
        null;

      this.state.currentStep =
        'requirements';

      this.state.lastIntent =
        'collect_phone';

      void this.updateSession();

      void this.saveEvent(
        'contact_collected',
        {
          name:
            this.state.name,

          phone:
            this.state.phone
        }
      );

      // ------------------------------------------------
      // Parse anything else in same message.
      // ------------------------------------------------

      // The phone message must not be interpreted as a budget.
      this.applyDetectedRequirements(
        detectedGuests,
        null,
        detectedArea,
        detectedType
      );

      // If a place was already selected from the Day Use panel,
      // continue the booking prerequisites for that exact place.
      // We do not ask for budget or area because the place is already known.
      if (this.state.selectedPlace) {

        if (!this.state.guests) {
          this.state.awaiting = 'guests';
          this.state.currentStep = 'guests';

          void this.updateSession();

          return `تمام يا ${this.state.name} ❤️

 المكان المختار:
${this.state.selectedPlace.name}

الحجز لعدد كام شخص؟ `;
        }

        this.state.awaiting = 'place_selected';
        this.state.currentStep = 'place_selected';

        void this.updateSession();

        return `تمام جدًا ❤️

كل البيانات الأساسية جاهزة للمكان المختار.

تقدر تشوف السعر أو الباكدجات أو الخدمات من الكارت فوق، أو تضغط "احجز المكان".`;
      }

      if (
        this.hasAllRequirements()
      ) {

        return await this.finishRequirements();
      }

      return await this.askNextRequirement();
    }

    // ===================================================
    // AFTER CONTACT INFO
    // ===================================================

    // Do not re-interpret a booking date/time as guests or budget.
    // Example: when awaiting time, "10" means 10 o'clock, not 10 guests.
    const isBookingInputStep = [
      'date',
      'time',
      'booking_confirmation'
    ].includes(this.state.awaiting || '');

    if (!isBookingInputStep) {
      this.applyDetectedRequirements(
        detectedGuests,
        detectedBudget,
        detectedArea,
        detectedType
      );
    }

    // ===================================================
    // DAY USE
    // ===================================================

    if (
      detectedIntent === 'day_use' ||
      this.containsAny(
        t,
        [
          'عايز مكان',
          'عايزين مكان',
          'محتاج مكان',
          'محتاجين مكان',
          'مكان حلو',
          'مكان كويس',
          'عايز خروجه',
          'عايز خروجة',
          'فندق',
          'منتجع',
          'day use',
          'dayuse',
          'داي يوز'
        ]
      )
    ) {

      this.state.dayUse =
        true;

      this.state.lastIntent =
        'day_use';
    }

    // ===================================================
    // CHANGE AREA
    // ===================================================

    if (
      this.containsAny(
        t,
        [
          'غير المنطقة',
          'غير المكان',
          'عايز منطقة تانيه',
          'عايز منطقة تانية',
          'منطقة تانيه',
          'منطقة تانية',
          'غيرلي المنطقة',
          'غيرلي المكان'
        ]
      )
    ) {

      this.state.area =
        null;

      this.state.awaiting =
        'area';

      this.state.currentStep =
        'area';

      this.state.lastIntent =
        'change_area';

      return `ولا يهمك ❤️

نغيّر المنطقة.

 التجمع

 الزمالك

 جاردن سيتي

 الجيزة

 وسط البلد

 كورنيش النيل

ولا أي مكان؟`;
    }

    // ===================================================
    // CHANGE GUESTS
    // ===================================================

    if (
      this.containsAny(
        t,
        [
          'غير العدد',
          'غير عدد الاشخاص',
          'غير عدد الافراد',
          'عدد تاني',
          'عايز عدد تاني',
          'العدد الجديد',
          'عدد جديد'
        ]
      )
    ) {

      this.state.guests =
        null;

      this.state.awaiting =
        'guests';

      this.state.currentStep =
        'guests';

      this.state.lastIntent =
        'change_guests';

      return `أكيد ❤️

قولي العدد الجديد كام؟ `;
    }

    // ===================================================
    // CHANGE BUDGET
    // ===================================================

    if (
      this.containsAny(
        t,
        [
          'غير الميزانية',
          'غير الميزانيه',
          'ميزانية تانيه',
          'ميزانيه تانيه',
          'زود الميزانية',
          'زود الميزانيه',
          'ميزانية اعلى',
          'ميزانيه اعلى',
          'عايز حاجة اغلى',
          'عايز حاجه اغلى',
          'عايز ارخص',
          'حاجة ارخص',
          'حاجه ارخص'
        ]
      )
    ) {

      this.state.budget =
        null;

      this.state.awaiting =
        'budget';

      this.state.currentStep =
        'budget';

      this.state.lastIntent =
        'change_budget';

      return `أكيد 

قولي الميزانية الجديدة للفرد كام؟`;
    }

    // ===================================================
    // SHOW ALL
    // ===================================================

    if (
      this.containsAny(
        t,
        [
          'شوفلي كل الاماكن',
          'كل الاماكن',
          'وريني كل الاماكن',
          'هات كل الاماكن',
          'هاتلي كل الاماكن',
          'ايه الاماكن',
          'اي الاماكن',
          'ايه الاماكن المتاحه',
          'اي الاماكن المتاحه',
          'الاماكن المتاحه',
          'ممكن ايه الاماكن',
          'ممكن اي الاماكن',
          'ممكن اشوف الاماكن',
          'وريني الاماكن',
          'عندكم ايه',
          'عندكم اي اماكن',
          'عندكم ايه اماكن'
        ]
      )
    ) {

      this.state.budget =
        'any';

      this.state.area =
        'any';

      this.state.awaiting =
        'recommended';

      this.state.currentStep =
        'recommendations';

      this.state.lastIntent =
        'recommendations';

      await this.refreshFilteredPlaces();

      return this.recommendationResponse();
    }

    // ===================================================
    // GUESTS STEP
    // ===================================================

    if (
      this.state.awaiting === 'guests'
    ) {

      if (
        detectedGuests !== null &&
        detectedGuests >= 1 &&
        detectedGuests <= 50
      ) {

        this.state.guests =
          detectedGuests;

        this.state.lastIntent =
          'guests';

        // If the user already selected a place, do not ask for
        // budget/area. The selected card itself defines the place.
        if (this.state.selectedPlace) {
          this.state.awaiting = 'place_selected';
          this.state.currentStep = 'place_selected';

          void this.updateSession();

          return `تمام جدًا ❤️

 العدد: ${this.state.guests}
 المكان: ${this.state.selectedPlace.name}

تقدري دلوقتي تستخدمي أزرار كارت المكان داخل الشات، أو تضغطي "احجز المكان" ونكمل الحجز ❤️`;
        }

        return await this.askNextRequirement();
      }

      if (
        detectedType === 'couples'
      ) {

        this.state.guests =
          2;

        this.state.filter =
          'couples';

        return this.askNextRequirement();
      }

      return `تمام ❤️

عايز Day Use لعدد كام شخص؟ `;
    }

    // ===================================================
    // BUDGET STEP
    // ===================================================

    if (
      this.state.awaiting === 'budget'
    ) {

      if (
        detectedBudget === 'any'
      ) {

        this.state.budget =
          'any';

        this.state.lastIntent =
          'budget';

        return this.askNextRequirement();
      }

      if (
        typeof detectedBudget === 'number' &&
        detectedBudget > 0
      ) {

        this.state.budget =
          detectedBudget;

        this.state.lastIntent =
          'budget';

        return this.askNextRequirement();
      }

      return `ممكن تقولي الميزانية بشكل أوضح؟ 

مثلاً:

"1000 جنيه"

"ألف"

"1500 للفرد"

"من 1000 لـ 1500"

أو:

"مش فارقة"`;
    }

    // ===================================================
    // AREA STEP
    // ===================================================

    if (
      this.state.awaiting === 'area'
    ) {

      if (
        this.isAnyArea(userMessage)
      ) {

        this.state.area =
          'any';

        this.state.lastIntent =
          'area';

        return this.askNextRequirement();
      }

      if (
        detectedArea
      ) {

        this.state.area =
          detectedArea;

        this.state.lastIntent =
          'area';

        return this.askNextRequirement();
      }

      return `تمام ❤️

قولي المنطقة اللي تحبها 

• التجمع

• الزمالك

• جاردن سيتي

• الجيزة

• وسط البلد

• كورنيش النيل

أو:

"أي مكان"`;
    }

    // ===================================================
    // DATE
    // ===================================================

    if (
      this.state.awaiting === 'date'
    ) {

      const date =
        this.extractDate(
          userMessage
        );

      if (!date) {

        return `قولي التاريخ بشكل أوضح 

مثلاً:

15 سبتمبر

15/9

بكره

السبت`;
      }

      this.state.date =
        date;

      this.state.awaiting =
        'time';

      this.state.currentStep =
        'booking_time';

      this.state.lastIntent =
        'booking_date';

      void this.updateSession();

      void this.saveEvent(
        'date_selected',
        {
          date
        }
      );

      return `تمام 

التاريخ:

${date}

تحب الدخول يكون الساعة كام؟ 

مثلاً:

10 الصبح

12 الظهر

5 مساءً`;
    }

    // ===================================================
    // TIME
    // ===================================================

    if (
      this.state.awaiting === 'time'
    ) {

      const time =
        this.extractTime(
          userMessage
        );

      if (!time) {

        return `قولي الوقت بشكل أوضح 

مثلاً:

10 الصبح

12 الظهر

5 مساءً`;
      }

      this.state.time =
        time;

      this.state.awaiting =
        'booking_confirmation';

      this.state.currentStep =
        'booking_confirmation';

      this.state.lastIntent =
        'booking_time';

      void this.updateSession();

      void this.saveEvent(
        'time_selected',
        {
          time
        }
      );

      this.addBookingSummaryMessage();

      return `ممتاز ❤️

راجعي بيانات الحجز، ولو كل حاجة تمام اكتبي "أيوة" للتأكيد.`;
    }

    // ===================================================
    // BOOKING CONFIRMATION
    // ===================================================

    if (
      this.state.awaiting ===
      'booking_confirmation'
    ) {

      // Allow the customer to correct the guest count naturally
      // before confirmation, e.g. "أنا قلت عدد 2".
      if (
        detectedGuests !== null &&
        detectedGuests >= 1 &&
        detectedGuests <= 50 &&
        detectedGuests !== this.state.guests
      ) {
        this.state.guests = detectedGuests;
        this.state.lastIntent = 'guests_correction';

        void this.updateSession();

        this.addBookingSummaryMessage();

        return `تمام يا ${this.state.name} ❤️

عدّلت عدد الأشخاص إلى ${detectedGuests}.
راجعي الملخص الجديد، ولو كل حاجة تمام اكتبي "أيوة" للتأكيد.`;
      }

      if (
        this.isYes(userMessage)
      ) {

        if (!this.state.phone && this.state.selectedPlace) {
          this.state.awaiting = 'phone';
          this.state.currentStep = 'phone';
          this.state.lastIntent = 'booking_waiting_phone';

          void this.updateSession();

          return `تمام ❤️

إنتِ اخترتي:
${this.state.selectedPlace.name}

${this.state.date ? `التاريخ: ${this.state.date}
` : ''}${this.state.time ? `الوقت: ${this.state.time}
` : ''}${this.state.guests ? `العدد: ${this.state.guests}
` : ''}
الاختيار محفوظ عندي ومش محتاجة تختاري المكان من جديد.

لو حابة تغيّري المكان قولي "غيّري المكان".
ولو كل حاجة تمام، ابعتي رقم الموبايل علشان نقدر نأكد الحجز مع فريق تساهيل ❤️`;
        }

        return await this.createBookingRequest();
      }

      if (
        this.isNo(userMessage)
      ) {

        this.state.awaiting =
          'recommended';

        this.state.currentStep =
          'place_selected';

        return `ولا يهمك ❤️

الحجز لسه ما اتأكدش.

تقدر تغيّر:

 التاريخ

 الوقت

 الباكدج

أو تقول "احجز" لما تكون جاهز.`;
      }

      return `بس أتأكد منك ❤️

هل تحب نأكد طلب الحجز؟

اكتب "أيوه" للتأكيد أو "لا" للإلغاء.`;
    }

    // ===================================================
    // SELECTED PLACE
    // ===================================================

    if (
      this.state.selectedPlace
    ) {

      const response =
        this.handleSelectedPlace(
          userMessage
        );

      if (response) {
        return response;
      }
    }

    // ===================================================
    // BOOKING
    // ===================================================

    if (
      detectedIntent === 'booking'
    ) {

      if (
        !this.state.selectedPlace
      ) {

        return `أكيد ❤️

نقدر نحجز.

بس اختار المكان الأول من الأماكن المتاحة وبعدها نبدأ الحجز خطوة خطوة.`;
      }

      if (!this.state.phone) {
        this.state.awaiting = 'phone';
        this.state.currentStep = 'phone';
        this.state.lastIntent = 'booking_waiting_phone';

        void this.updateSession();

        return `أكيد ❤️

إنتِ اخترتي بالفعل:
${this.state.selectedPlace.name}

الاختيار محفوظ عندي، ولو حابة تغيّري المكان قولي "غيّري المكان".
ولو عايزة نكمّل حجز نفس المكان، ابعتي رقم الموبايل علشان نبدأ التأكيد.`;
      }

      this.state.currentStep =
        'booking_date';

      this.state.awaiting =
        'date';

      this.state.lastIntent =
        'booking';

      void this.updateSession();

      void this.saveEvent(
        'booking_started',
        {
          place_id:
            this.state.selectedPlace.id,

          place_name:
            this.state.selectedPlace.name
        }
      );

      return `تمام جدًا ❤️

نبدأ الحجز.

تحب الحجز يكون يوم إيه؟ 

مثلاً:

15 سبتمبر

15/9

بكره

السبت`;
    }

    // ===================================================
    // PRICE / ADDRESS / PACKAGE / FOOD / SERVICES
    // ===================================================

    if (
      [
        'price',
        'address',
        'package',
        'food',
        'services',
        'spa',
        'aqua'
      ].includes(
        detectedIntent || ''
      )
    ) {

      if (
        !this.state.selectedPlace
      ) {

        return `أكيد ❤️

بس اختار مكان الأول من الأماكن المتاحة.

وبعدها أقدر أقولك:

 السعر

 الباكدجات

 الأكل

 الخدمات

 Aqua Park

 Spa

 العنوان`;
      }
    }

    // ===================================================
    // TYPE
    // ===================================================

    if (
      detectedType === 'couples'
    ) {

      this.state.filter =
        'couples';

      this.state.lastIntent =
        'couples';

      if (
        !this.state.guests
      ) {

        this.state.guests =
          2;
      }

      if (
        this.hasAllRequirements()
      ) {

        return await this.finishRequirements();
      }

      return this.askNextRequirement();
    }

    if (
      detectedType === 'family'
    ) {

      this.state.filter =
        'family';

      this.state.lastIntent =
        'family';

      if (
        this.hasAllRequirements()
      ) {

        return await this.finishRequirements();
      }

      return this.askNextRequirement();
    }

    if (
      detectedType === 'aqua'
    ) {

      this.state.filter =
        'aqua';

      this.state.lastIntent =
        'aqua';

      if (
        this.hasAllRequirements()
      ) {

        return await this.finishRequirements();
      }

      return this.askNextRequirement();
    }

    if (
      detectedType === 'spa'
    ) {

      this.state.filter =
        'spa';

      this.state.lastIntent =
        'spa';

      if (
        this.hasAllRequirements()
      ) {

        return await this.finishRequirements();
      }

      return this.askNextRequirement();
    }

    if (
      detectedType === 'pool'
    ) {

      this.state.filter =
        'pool';

      this.state.lastIntent =
        'pool';

      if (
        this.hasAllRequirements()
      ) {

        return await this.finishRequirements();
      }

      return this.askNextRequirement();
    }

    // ===================================================
    // RECOMMENDATION REQUEST
    // ===================================================

    if (
      this.containsAny(
        t,
        [
          'مكان حلو',
          'مكان كويس',
          'حاجه حلوه',
          'حاجة حلوة',
          'مش فارقه',
          'مش فارق',
          'اي حاجه',
          'أي حاجة',
          'اختارلي',
          'اختار لي',
          'رشحلي',
          'رشح لي',
          'انصحني',
          'ايه الافضل',
          'ايه الأفضل',
          'افضل مكان',
          'أفضل مكان'
        ]
      )
    ) {

      if (
        this.hasAllRequirements()
      ) {

        return await this.finishRequirements();
      }

      return this.askNextRequirement();
    }

    // ===================================================
    // YES
    // ===================================================

    if (
      this.isYes(userMessage)
    ) {

      if (
        this.state.selectedPlace &&
        this.state.currentStep ===
        'place_selected'
      ) {

        this.state.awaiting =
          'date';

        this.state.currentStep =
          'booking_date';

        this.state.lastIntent =
          'booking';

        return `تمام يا بطل ❤️

نكمل الحجز.

تحب الحجز يكون يوم إيه؟ `;
      }

      if (
        !this.state.guests ||
        this.state.budget === null ||
        this.state.area === null
      ) {

        return this.askNextRequirement();
      }

      if (
        this.state.awaiting ===
        'recommended'
      ) {

        return `تمام ❤️

اختار المكان اللي عجبك من القائمة وأنا أكمل معاك.`;
      }

      return this.askNextRequirement();
    }

    // ===================================================
    // NO
    // ===================================================

    if (
      this.isNo(userMessage)
    ) {

      return `ولا يهمك ❤️

خد وقتك براحتك.

ولو حبيت نغيّر:

 العدد

 الميزانية

 المنطقة

 المكان

قولي وأنا أظبطهولك.`;
    }

    // ===================================================
    // HOW ARE YOU
    // ===================================================

    if (
      this.containsAny(
        t,
        [
          'عامل ايه',
          'عامل اي',
          'اخبارك',
          'ازيك',
          'ازايك',
          'كيف حالك',
          'انت كويس'
        ]
      )
    ) {

      return `تمام الحمد لله ❤️

وجاهز أساعدك تختار مكان Day Use حلو.

نكمل؟`;
    }

    // ===================================================
    // THANKS
    // ===================================================

    if (
      this.containsAny(
        t,
        [
          'شكرا',
          'شكراً',
          'متشكر',
          'متشكرة',
          'تسلم',
          'تسلمي',
          'ميرسي',
          'thanks',
          'thank you'
        ]
      )
    ) {

      return `العفو ❤️

تحت أمرك دايمًا `;
    }

    // ===================================================
    // CASUAL
    // ===================================================

    if (
      this.containsAny(
        t,
        [
          'حلو',
          'جامد',
          'جميل',
          'تحفه',
          'تحفة',
          'روعة',
          'حلو اوي',
          'حلو قوي'
        ]
      )
    ) {

      if (
        this.hasAllRequirements()
      ) {

        return await this.finishRequirements();
      }

      return `❤️ أهو ده الكلام!

أنا معاك.

${this.askNextRequirement()}`;
    }

    // ===================================================
    // ALL DATA EXISTS
    // ===================================================

    if (
      this.hasAllRequirements()
    ) {

      return await this.finishRequirements();
    }

    // ===================================================
    // SMART DEFAULT
    // ===================================================

    return `أنا معاك ❤️

اكتبلي طلبك بطريقتك العادية خالص، كأنك بتكلم حد من فريق تساهيل — مش لازم تمشي على صيغة معينة.

مثلاً ممكن تقول:

"إحنا 4 وعايزين مكان هادي والميزانية حوالي 1500 للفرد"

أو:

"أنا ومراتي عايزين Day Use حلو ومش فارقة المنطقة"

أو حتى:

"رشحلي حاجة كويسة"

وأنا هسألك بس عن أي معلومة ناقصة، وبعدها أطلعلك أنسب الأماكن وأكمل معاك لحد الحجز ❤️`;
  }

  // =====================================================
  // APPLY DETECTED REQUIREMENTS
  // =====================================================

 private applyDetectedRequirements(
  guests: number | null,
  budget: number | 'any' | null,
  area: string | null,
  type: string | null
): void {

  if (
    guests !== null &&
    guests >= 1 &&
    guests <= 50
  ) {

    this.state.guests = guests;

    this.state.lastIntent = 'guests';
  }

  if (
    budget !== null
  ) {

    this.state.budget = budget;

    this.state.lastIntent = 'budget';
  }

  if (
    area
  ) {

    this.state.area = area;

    this.state.lastIntent = 'area';
  }

  if (
    this.isAnyAreaFromText(
      this.lastUserText
    )
  ) {

    this.state.area = 'any';

    this.state.lastIntent = 'area';
  }

  if (
    type
  ) {

    this.state.filter = type;

    this.state.lastIntent = type;

    if (
      type === 'couples' &&
      !this.state.guests
    ) {

      this.state.guests = 2;
    }
  }
}

  // =====================================================
  // REQUIREMENTS COMPLETE
  // =====================================================

  private hasAllRequirements(): boolean {

    return Boolean(
      this.state.guests &&
      this.state.budget !== null &&
      this.state.area !== null
    );
  }

  // =====================================================
  // ASK NEXT REQUIREMENT
  // =====================================================

private async askNextRequirement(): Promise<string> {
        if (
      !this.state.guests
    ) {

      this.state.awaiting =
        'guests';

      this.state.currentStep =
        'guests';

      return `تمام ❤️

عايز Day Use لعدد كام شخص؟ `;
    }

    if (
      this.state.budget === null
    ) {

      this.state.awaiting =
        'budget';

      this.state.currentStep =
        'budget';

      return `تمام ❤️

 عدد الأشخاص:
${this.state.guests}

قولي الميزانية المناسبة للفرد تقريبًا؟ 

• 500 جنيه
• 1000 جنيه
• 1500 جنيه
• من 1000 لـ 1500
• أو "مش فارقة"`;
    }

    if (
      this.state.area === null
    ) {

      this.state.awaiting =
        'area';

      this.state.currentStep =
        'area';

      return `جميل جدًا ❤️

تحب المكان يكون في منطقة معينة؟ 

• التجمع
• الزمالك
• جاردن سيتي
• الجيزة
• وسط البلد
• كورنيش النيل

ولا عادي:

"مش فارقة" ❤️`;
    }

    return this.finishRequirements();
  }

  // =====================================================
  // FINISH REQUIREMENTS
  // =====================================================

  private async finishRequirements(): Promise<string> {

    this.state.awaiting =
      'recommended';

    this.state.currentStep =
      'recommendations';

    this.state.lastIntent =
      'recommendations';

    await this.refreshFilteredPlaces();

    void this.updateSession();

    void this.saveEvent(
      'recommendations_generated',
      {
        guests:
          this.state.guests,

        budget:
          this.state.budget,

        area:
          this.state.area,

        filter:
          this.state.filter,

        result_count:
          this.filteredPlaces.length
      }
    );

    return this.recommendationResponse();
  }

  // =====================================================
  // REFRESH FILTERED PLACES
  // =====================================================

  private async refreshFilteredPlaces(): Promise<void> {

    if (this.placesLoading) {
      return;
    }

    this.placesLoaded = true;

    let result =
      [...this.places];

    // ---------------------------------------------------
    // ACTIVE
    // ---------------------------------------------------

    result =
      result.filter(
        place =>
          place.active !== false
      );

    // ---------------------------------------------------
    // AREA
    // ---------------------------------------------------

    if (
      this.state.area &&
      this.state.area !== 'any'
    ) {

      const selectedArea =
        this.normalize(
          this.getAreaLabel(
            this.state.area
          )
        );

      result =
        result.filter(
          place => {

            const placeArea =
              this.normalize(
                place.area || ''
              );

            return (
              placeArea.includes(
                selectedArea
              ) ||
              selectedArea.includes(
                placeArea
              )
            );
          }
        );
    }

    // ---------------------------------------------------
    // BUDGET
    // ---------------------------------------------------

    if (
      typeof this.state.budget === 'number'
    ) {

      const budget =
        this.state.budget;

      const withinBudget =
        result.filter(
          place =>
            Number(place.price || 0) <=
            budget
        );

      // If no exact matches, don't show
      // empty list. Show closest options.
      if (
        withinBudget.length
      ) {

        result =
          withinBudget;
      } else {

        result =
          result
            .sort(
              (a, b) =>
                Math.abs(
                  Number(a.price || 0) -
                  budget
                ) -
                Math.abs(
                  Number(b.price || 0) -
                  budget
                )
            )
            .slice(0, 5);
      }
    }

    // ---------------------------------------------------
    // TYPE / FEATURE
    // ---------------------------------------------------

    result =
      this.filterByFeature(
        result
      );

    // ---------------------------------------------------
    // SORT
    // ---------------------------------------------------

    result =
      result.sort(
        (a, b) => {

          const aOrder =
            Number(
              (a as any).sort_order ??
              999
            );

          const bOrder =
            Number(
              (b as any).sort_order ??
              999
            );

          return (
            aOrder -
            bOrder
          );
        }
      );

    this.filteredPlaces =
      result;
  }

  // =====================================================
  // FILTER BY FEATURE
  // =====================================================

  private filterByFeature(
    places: Place[]
  ): Place[] {

    const filter =
      this.state.filter;

    if (
      !filter ||
      filter === 'all'
    ) {

      return places;
    }

    const hasTag = (
      place: Place,
      keyword: string
    ): boolean => {

      const tags =
        Array.isArray(place.tags)
          ? place.tags
          : [];

      const services =
        this.getItemNames(
          place.services
        );

      const all =
        [
          ...tags,
          ...services,
          place.description || ''
        ]
          .map(item =>
            this.normalize(
              String(item)
            )
          )
          .join(' ');

      return all.includes(
        this.normalize(keyword)
      );
    };

    if (
      filter === 'pool'
    ) {

      return places.filter(
        place =>
          Boolean(
            place.waterPark
          ) ||
          hasTag(place, 'pool') ||
          hasTag(place, 'swimming') ||
          hasTag(place, 'swimming pool') ||
          hasTag(place, 'بيسين')
      );
    }

    if (
      filter === 'spa'
    ) {

      return places.filter(
        place =>
          Boolean(
            place.spa
          ) ||
          hasTag(place, 'spa') ||
          hasTag(place, 'massage')
      );
    }

    if (
      filter === 'aqua'
    ) {

      return places.filter(
        place =>
          Boolean(
            place.waterPark
          ) ||
          hasTag(place, 'aqua') ||
          hasTag(place, 'aquapark') ||
          hasTag(place, 'water park') ||
          hasTag(place, 'water')
      );
    }

    if (
      filter === 'couples'
    ) {

      return places.filter(
        place => {

          if (
            place.couple === true
          ) {
            return true;
          }

          const tags =
            (place.tags || [])
              .map(tag =>
                this.normalize(tag)
              );

          return (
            tags.includes(
              'romantic'
            ) ||
            tags.includes(
              'couples'
            ) ||
            tags.includes(
              'couple'
            ) ||
            tags.includes(
              'luxury'
            ) ||
            Boolean(
              place.description &&
              this.normalize(
                place.description
              ).includes('رومان')
            )
          );
        }
      );
    }

    if (
      filter === 'family'
    ) {

      return places.filter(
        place => {

          if (
            place.family === true
          ) {
            return true;
          }

          const names =
            this.getItemNames(
              place.services
            )
              .map(item =>
                this.normalize(item)
              );

          const tags =
            (place.tags || [])
              .map(tag =>
                this.normalize(tag)
              );

          return (
            tags.includes('family') ||
            tags.includes('kids') ||
            tags.includes('عائلي') ||
            names.some(
              item =>
                item.includes('kids') ||
                item.includes('children')
            )
          );
        }
      );
    }

    return places;
  }

  // =====================================================
  // RECOMMENDATION RESPONSE
  // =====================================================

  private recommendationResponse(): string {

    const areaText =
      this.state.area &&
      this.state.area !== 'any'

        ? this.getAreaLabel(
            this.state.area
          )

        : 'كل المناطق';

    const budgetText =
      this.state.budget !== null &&
      this.state.budget !== 'any'

        ? this.formatEGP(
            this.state.budget as number
          )

        : 'أي ميزانية';

    const guestsText =
      this.state.guests
        ? `${this.state.guests} شخص`
        : 'غير محدد';

    let filterText = '';

    if (
      this.state.filter ===
      'couples'
    ) {

      filterText =
        '\n❤️ النوع: Couples';

    } else if (
      this.state.filter ===
      'family'
    ) {

      filterText =
        '\n النوع: عائلي';

    } else if (
      this.state.filter ===
      'aqua'
    ) {

      filterText =
        '\n المطلوب: Aqua Park';

    } else if (
      this.state.filter ===
      'spa'
    ) {

      filterText =
        '\n المطلوب: Spa';

    } else if (
      this.state.filter ===
      'pool'
    ) {

      filterText =
        '\n المطلوب: Pool';
    }

    if (
      this.placesLoading
    ) {

      return `تمام جدًا 

جمعتلك طلبك:

 ${areaText}
 ${budgetText}
 ${guestsText}${filterText}

لحظة واحدة بس وأنا بجيب الأماكن المتاحة ❤️`;
    }

    if (
      !this.filteredPlaces.length
    ) {

      return `دورتلك في الأماكن المتاحة ❤️

بس مفيش مكان مطابق لكل الاختيارات دي حاليًا.

ممكن نعمل واحدة من دول:

 نوسع الميزانية شوية
 نخلي المنطقة مفتوحة
 نشوف كل الأماكن
 نغير نوع المكان

قولي بس تحب نعمل إيه `;
    }

    return `تمام جدًا 

جمعتلك الاختيارات حسب طلبك:

 المنطقة:
${areaText}

 الميزانية:
${budgetText}

 عدد الأشخاص:
${guestsText}${filterText}

لقيتلك ${this.filteredPlaces.length} مكان مناسب ❤️

اختار أي مكان من الكروت اللي تحت، وأنا أقولك كل تفاصيله.`;
  }

  // =====================================================
  // SELECT PLACE
  // =====================================================

  async selectPlace(
    place: Place
  ): Promise<void> {

    if (this.state.completed || this.state.isReplying) {
      return;
    }

    this.state.selectedPlace = place;
    this.state.selectedPackage = null;
    this.state.selectedExtras = [];
    this.state.lastIntent = 'place_selected';


    // Persist the selected place immediately so a later state refresh/realtime
    // update can never make the chat forget what the customer picked.
    void this.updateSession();

    // Selecting a ready-made place means budget/area are no longer
    // prerequisites. Only contact data + guest count are required.
    void this.saveEvent(
      'place_selected',
      {
        place_id: place.id,
        place_name: place.name,
        price: place.price,
        area: place.area
      }
    );

    if (!this.state.name) {
      this.state.awaiting = 'name';
      this.state.currentStep = 'name';

      this.replaceSelectedPlaceInChat(
        place,
        `اختيار جميل جدًا ❤️

قبل ما نكمل، ممكن تقولي اسم حضرتك؟`
      );

      return;
    }

    if (!this.state.phone) {
      this.state.awaiting = 'phone';
      this.state.currentStep = 'phone';

      this.replaceSelectedPlaceInChat(
        place,
        `اختيار جميل يا ${this.state.name} ❤️

ممكن رقم الموبايل علشان نكمل؟`
      );

      return;
    }

    if (!this.state.guests) {
      this.state.awaiting = 'guests';
      this.state.currentStep = 'guests';

      this.replaceSelectedPlaceInChat(
        place,
        `تمام جدًا ❤️

الحجز لعدد كام شخص؟`
      );

      return;
    }

    this.state.currentStep = 'place_selected';
    this.state.awaiting = 'place_selected';

    this.replaceSelectedPlaceInChat(
      place,
      `تمام جدًا ❤️

اختاري السعر أو الباكدجات أو الخدمات أو العنوان، أو ابدئي الحجز.`
    );
  }

  // =====================================================
  // PLACE FROM DAY USE PANEL
  // =====================================================

  async openPlaceFromDayUse(
    place: Place,
    startBooking = false
  ): Promise<void> {

    if (!place || this.state.completed) {
      return;
    }

    await this.selectPlace(place);

    if (
      startBooking &&
      this.state.name &&
      this.state.phone &&
      this.state.guests
    ) {
      this.startBookingForSelectedPlace();
    }
  }

  // =====================================================
  // START BOOKING FOR SELECTED PLACE
  // =====================================================

  startBookingForSelectedPlace(): void {

    if (this.state.completed || this.state.isReplying) {
      return;
    }

    const place = this.state.selectedPlace;

    if (!place) {
      this.addBotMessage('اختاري المكان الأول ❤️');
      return;
    }

    if (!this.state.name) {
      this.state.awaiting = 'name';
      this.state.currentStep = 'name';
      this.addBotMessage('قبل ما نبدأ الحجز، ممكن تقولي اسم حضرتك؟ ❤️');
      return;
    }

    if (!this.state.phone) {
      this.state.awaiting = 'phone';
      this.state.currentStep = 'phone';
      this.addBotMessage(`تمام يا ${this.state.name} ❤️\n\nممكن رقم الموبايل علشان نكمل الحجز؟`);
      return;
    }

    if (!this.state.guests) {
      this.state.awaiting = 'guests';
      this.state.currentStep = 'guests';
      this.addBotMessage(`تمام جدًا ❤️\n\nالحجز في ${place.name} لعدد كام شخص؟`);
      return;
    }

    if (
      this.state.awaiting === 'date' ||
      this.state.currentStep === 'booking_date'
    ) {
      return;
    }

    this.state.awaiting = 'date';
    this.state.currentStep = 'booking_date';
    this.state.lastIntent = 'booking';

    this.addBotMessage(
      `تمام جدًا ❤️

هنبدأ حجز ${place.name}.

تحبي الحجز يكون يوم إيه؟

مثلاً: بكره، السبت، أو 15/9`
    );

    void this.updateSession();
    void this.saveEvent(
      'booking_started',
      {
        place_id: place.id,
        place_name: place.name
      }
    );

    this.scrollMessages();
  }

  // =====================================================
  // PLACE CARD ACTION
  // =====================================================

  sendPlaceAction(action: string): void {

    if (this.state.completed || this.state.isReplying) {
      return;
    }

    // Never send card actions into the normal input parser while
    // personal details are still missing.
    if (!this.state.name) {
      this.state.awaiting = 'name';
      this.state.currentStep = 'name';
      this.addBotMessage('قبل ما نكمل تفاصيل المكان، ممكن تقولي اسم حضرتك الأول؟ ❤️');
      return;
    }

    if (!this.state.phone) {
      this.state.awaiting = 'phone';
      this.state.currentStep = 'phone';
      this.addBotMessage(`تمام يا ${this.state.name} ❤️\n\nممكن رقم الموبايل الأول؟`);
      return;
    }

    if (!this.state.guests) {
      this.state.awaiting = 'guests';
      this.state.currentStep = 'guests';
      this.addBotMessage('تمام جدًا ❤️\n\nالحجز لعدد كام شخص؟');
      return;
    }

    if (action === 'احجز') {
      this.startBookingForSelectedPlace();
      return;
    }

    this.messageText = action;
    void this.sendMessage();
  }

  // =====================================================
  // HANDLE SELECTED PLACE
  // =====================================================

  private handleSelectedPlace(
    userMessage: string
  ): string | null {

    const t =
      this.normalize(userMessage);

    const place =
      this.state.selectedPlace;

    if (!place) {
      return null;
    }

    // ===================================================
    // PACKAGE SELECTION
    // ===================================================

    if (
      this.state.currentStep === 'package_selection' ||
      this.state.awaiting === 'package'
    ) {

      const selectedPackage =
        this.findPackageChoice(
          userMessage,
          this.getItems(place.packages)
        );

      if (selectedPackage) {

        this.state.selectedPackage =
          selectedPackage;

        this.state.awaiting =
          'place_selected';

        this.state.currentStep =
          'place_selected';

        this.state.lastIntent =
          'package_selected';

        void this.updateSession();

        void this.saveEvent(
          'package_selected',
          {
            package_name:
              this.getItemName(selectedPackage),

            selling_price:
              this.getCurrentSellingPrice(),

            cost_price:
              this.getCurrentCostPrice()
          }
        );

        return `تمام ❤️\n\nاخترت باكدج: ${this.getItemName(selectedPackage)}\nالسعر للفرد: ${this.formatEGP(this.getCurrentSellingPrice())}\n\nلو جاهز للحجز اكتب "احجز".`;
      }

      if (
        this.getItems(place.packages).length > 0
      ) {
        return `مش قادر أحدد الباكدج دي.\n\n${this.packageResponse(false)}`;
      }
    }

    // PRICE
    if (
      this.containsAny(
        t,
        [
          'السعر',
          'بكام',
          'كام',
          'سعر',
          'price',
          'التكلفه',
          'التكلفة'
        ]
      )
    ) {

      return this.priceResponse();
    }

    // ADDRESS
    if (
      this.containsAny(
        t,
        [
          'عنوان',
          'لوكيشن',
          'location',
          'فين',
          'موقع',
          'address'
        ]
      )
    ) {

      return this.addressResponse();
    }

    // PACKAGE
    if (
      this.containsAny(
        t,
        [
          'باكدج',
          'باكدجات',
          'package',
          'packages'
        ]
      )
    ) {

      return this.packageResponse();
    }

    // FOOD
    if (
      this.containsAny(
        t,
        [
          'اكل',
          'غداء',
          'غدا',
          'فطار',
          'مشروبات',
          'مطعم',
          'food',
          'drink'
        ]
      )
    ) {

      return this.foodResponse();
    }

    // SERVICES
    if (
      this.containsAny(
        t,
        [
          'خدمات',
          'مميزات',
          'مرافق',
          'facilities',
          'services'
        ]
      )
    ) {

      return this.servicesResponse();
    }

    // SPA
    if (
      this.containsAny(
        t,
        [
          'سبا',
          'spa',
          'مساج',
          'massage'
        ]
      )
    ) {

      return this.spaResponse();
    }

    // AQUA
    if (
      this.containsAny(
        t,
        [
          'aqua',
          'اكوا',
          'العاب مائيه',
          'العاب مائية',
          'ملاهي مائيه',
          'ملاهي مائية'
        ]
      )
    ) {

      return this.waterParkResponse();
    }

    // CHANGE PLACE
    if (
      this.containsAny(
        t,
        [
          'غير المكان',
          'مكان تاني',
          'مكان ثاني',
          'اختيار تاني',
          'اختيارات تانيه',
          'اختيارات تانية'
        ]
      )
    ) {

      this.state.selectedPlace =
        null;

      this.state.selectedPackage =
        null;

      this.state.selectedExtras =
        [];

      this.state.awaiting =
        'recommended';

      this.state.currentStep =
        'recommendations';

      return `ولا يهمك ❤️

نرجع نشوفلك اختيارات تانية.

${this.recommendationResponse()}`;
    }

    // BOOK
    if (
      this.containsAny(
        t,
        [
          'احجز',
          'حجز',
          'احجزلي',
          'عايز احجز',
          'عايزه احجز',
          'نحجز',
          'book'
        ]
      )
    ) {

      this.state.awaiting =
        'date';

      this.state.currentStep =
        'booking_date';

      this.state.lastIntent =
        'booking';

      return `تمام جدًا ❤️

نبدأ الحجز.

تحب الحجز يكون يوم إيه؟ 

مثلاً:

15 سبتمبر

15/9

بكره

السبت`;
    }

    // YES
    if (
      this.isYes(userMessage)
    ) {

      this.state.awaiting =
        'date';

      this.state.currentStep =
        'booking_date';

      this.state.lastIntent =
        'booking';

      return `تمام يا بطل ❤️

نكمل الحجز.

تحب الحجز يكون يوم إيه؟ `;
    }

    return null;
  }

  // =====================================================
  // PRICE RESPONSE
  // =====================================================

  private priceResponse(): string {

    const place =
      this.state.selectedPlace;

    if (!place) {
      return 'اختار مكان الأول ';
    }

    return ` سعر Day Use في ${place.name}

السعر الأساسي:
${this.formatEGP(
  Number(place.price || 0)
)}

 المنطقة:
${place.area || 'غير محددة'}

لو تحب أقولك الباكدجات المتاحة، اكتب "باكدجات".`;
  }

  // =====================================================
  // PACKAGE RESPONSE
  // =====================================================

  private packageResponse(
    startSelection: boolean = true
  ): string {

    const place =
      this.state.selectedPlace;

    if (!place) {
      return 'اختار مكان الأول ';
    }

    const packages =
      this.getItems(
        place.packages
      );

    if (!packages.length) {

      this.state.selectedPackage = null;

      return `المكان ده مفيهوش باكدجات منفصلة ❤️

هنكمل الحجز على سعر المكان الأساسي:
${this.formatEGP(Number(place.price || 0))}

اكتب "احجز" لما تكون جاهز.`;
    }

    if (startSelection) {
      this.state.awaiting = 'package';
      this.state.currentStep = 'package_selection';
      this.state.lastIntent = 'package';
      void this.updateSession();
    }

    return `الباكدجات المتاحة في ${place.name}:

${packages
  .map(
    (item: any, index: number) => {

      const name =
        this.getItemName(item);

      const price =
        this.getItemPrice(item);

      return `${index + 1}. ${name}${
        price !== null
          ? ` — ${this.formatEGP(price)}`
          : ''
      }`;
    }
  )
  .join('\n')}

اختار الباكدج بكتابة رقمه أو اسمه.`;
  }

  // =====================================================
  // SERVICES RESPONSE
  // =====================================================

  private servicesResponse(): string {

    const place =
      this.state.selectedPlace;

    if (!place) {
      return `اختار مكان الأول 

وبعدها أقولك كل الخدمات الموجودة فيه.`;
    }

    const services =
      this.getItems(
        place.services
      );

    if (
      !services.length
    ) {

      return `الخدمات الخاصة بالمكان ده لسه مش مضافة بالكامل.

لكن أقدر أكمل معاك في:

 السعر
 الباكدج
 الحجز`;
    }

    const names =
      services
        .map(
          item =>
            this.getItemName(item)
        )
        .filter(Boolean);

    return ` الخدمات المتاحة في ${place.name}:

${names
  .map(
    item =>
      `• ${item}`
  )
  .join('\n')}`;
  }

  // =====================================================
  // FOOD RESPONSE
  // =====================================================

  private foodResponse(): string {

    const place =
      this.state.selectedPlace;

    if (!place) {
      return 'اختار مكان الأول ';
    }

    const extras =
      this.getItems(
        place.extras
      );

    const food =
      place.food;

    let response =
      ` الأكل والمشروبات في ${place.name}:\n\n`;

    if (food) {

      response +=
        `${food}\n`;
    }

    if (
      extras.length
    ) {

      response +=
        `\nالإضافات المتاحة:\n\n`;

      response +=
        extras
          .map(
            item =>
              `• ${this.getItemName(item)}`
          )
          .join('\n');
    }

    if (
      !food &&
      !extras.length
    ) {

      response +=
        'تفاصيل الأكل لسه مش مضافة بالكامل.';
    }

    return response;
  }

  // =====================================================
  // WATER PARK
  // =====================================================

  private waterParkResponse(): string {

    const place =
      this.state.selectedPlace;

    if (!place) {
      return 'اختار مكان الأول ';
    }

    const text =
      this.normalize(
        [
          ...(place.tags || []),
          ...this.getItemNames(
            place.services
          ),
          place.description || ''
        ].join(' ')
      );

    const hasWater =
      Boolean(
        place.waterPark
      ) ||
      text.includes('aqua') ||
      text.includes('water park') ||
      text.includes('اكوا') ||
      text.includes('العاب مائي');

    if (hasWater) {

      return ` أيوه ❤️

${place.name} عنده خدمات/مرافق مرتبطة بالمياه.

لو عايز أعرفك التفاصيل أو الـPackage المرتبط بيها، اكتب "باكدجات".`;
    }

    return ` حسب البيانات الموجودة عندي، الـAqua Park مش مذكور حاليًا في ${place.name}.

لكن أقدر أقولك الخدمات والـPool الموجودة.`;
  }

  // =====================================================
  // SPA
  // =====================================================

  private spaResponse(): string {

    const place =
      this.state.selectedPlace;

    if (!place) {
      return 'اختار مكان الأول ';
    }

    const names =
      this.getItemNames(
        place.services
      )
        .map(
          item =>
            this.normalize(item)
        );

    const hasSpa =
      Boolean(
        place.spa
      ) ||
      names.some(
        item =>
          item.includes('spa') ||
          item.includes('massage')
      );

    if (hasSpa) {

      return ` أيوه ❤️

${place.name} عنده Spa / خدمات استرخاء.

وممكن يكون فيه Massage كخدمة إضافية حسب البيانات المتاحة.

لو عايز، أقدر أقولك كل الخدمات الموجودة.`;
    }

    return ` حسب البيانات الموجودة عندي، الـSpa مش مذكور كخدمة أساسية في ${place.name}.

تحب أشوفلك الخدمات المتاحة؟`;
  }

  // =====================================================
  // ADDRESS
  // =====================================================

  private addressResponse(): string {

    const place =
      this.state.selectedPlace;

    if (!place) {
      return 'اختار مكان الأول ';
    }

    const address =
      place.address ||
      place.area ||
      'العنوان غير مضاف حاليًا';

    return ` عنوان ${place.name}:

${address}

لو محتاج تفاصيل أكتر عن الموقع، ابعتلي "لوكيشن".`;
  }

  // =====================================================
  // CREATE BOOKING REQUEST
  // =====================================================

  private async createBookingRequest(): Promise<string> {

    const place =
      this.state.selectedPlace;

    if (!place) {
      return `اختار المكان الأول ❤️

وبعدها نكمل الحجز.`;
    }

    if (!this.state.name) {
      return `محتاج اسم حضرتك الأول ❤️`;
    }

    if (!this.state.phone) {
      return `محتاج رقم الموبايل الأول`;
    }

    try {

      this.state.currentStep =
        'creating_request';

      void this.updateSession();

      const packageName =
        this.state.selectedPackage
          ? this.getItemName(
              this.state.selectedPackage
            )
          : null;

      const extrasText =
        this.state.selectedExtras.length
          ? this.state.selectedExtras
              .map(
                item =>
                  this.getItemName(item)
              )
              .join(', ')
          : null;

      const guests =
        this.state.guests || 1;

      const sellingPrice =
        this.getCurrentSellingPrice();

      const costPrice =
        this.getCurrentCostPrice();

      const profitAmount =
        sellingPrice - costPrice;

      const totalSellingPrice =
        sellingPrice * guests;

      const totalCostPrice =
        costPrice * guests;

      const totalProfitAmount =
        totalSellingPrice - totalCostPrice;

      const payload = {

        session_id:
          this.state.sessionId,

        name:
          this.state.name,

        phone:
          this.state.phone,

        place_id:
          place.id,

        place_name:
          place.name,

        date:
          this.convertDateForDatabase(
            this.state.date
          ),

        time:
          this.convertTimeForDatabase(
            this.state.time
          ),

        guests,

        package:
          packageName,

        extras:
          extrasText,

        notes:
          this.state.notes || null,

        budget:
          typeof this.state.budget === 'number'
            ? this.state.budget
            : null,

        area:
          this.state.area === 'any'
            ? 'any'
            : this.state.area,

        selling_price_snapshot:
          sellingPrice,

        cost_price_snapshot:
          costPrice,

        profit_amount:
          profitAmount,

        total_selling_price:
          totalSellingPrice,

        total_cost_price:
          totalCostPrice,

        total_profit_amount:
          totalProfitAmount,

        status:
          'new',

        source:
          'chatbot'
      };

      const bookingResult: any =
        await Promise.race([
          this.supabaseService.client
            .from('day_use_requests')
            .insert(payload)
            .select()
            .single(),

          new Promise((_, reject) =>
            setTimeout(
              () => reject(
                new Error('BOOKING_REQUEST_TIMEOUT')
              ),
              10000
            )
          )
        ]);

      const { data, error } = bookingResult;

      if (error) {

        console.error(
          'Booking request error:',
          error
        );

        this.state.currentStep =
          'booking_confirmation';

        return `حصلت مشكلة بسيطة وأنا بسجل الطلب

بياناتك لسه موجودة عندي.

جرّب تقول "أيوه" مرة تانية.`;
      }

      this.state.requestId =
        data?.id || null;

      this.state.trackingCode =
        data?.tracking_code || null;

      this.state.requestPaymentStatus =
        data?.payment_status || 'pending';

      // بعد إنشاء الطلب لا نبدأ أي خطوة دفع تلقائيًا.
      // الـAgent هو الوحيد الذي يفتح مرحلة الدفع عند الحاجة.
      this.state.requestWorkflowStatus =
        data?.workflow_status || 'new';

      this.state.currentStep =
        'request_tracking';

      this.state.awaiting =
        null;

      this.state.completed = false;
      this.isTyping = false;
      this.state.isReplying = false;

      this.messages = this.messages.filter(
        message =>
          message.kind !== 'place' &&
          message.context !== 'place-selection'
      );

      await this.updateSession({
        status: 'active',
        request_id: this.state.requestId,
        current_step: 'request_tracking',
        completed_at: null
      });

      this.subscribeToRealtime();

      void this.saveEvent(
        'booking_request_created',
        {
          request_id:
            this.state.requestId,

          place_id:
            place.id,

          place_name:
            place.name,

          package:
            packageName,

          guests,

          date:
            this.state.date,

          time:
            this.state.time,

          selling_price_snapshot:
            sellingPrice,

          cost_price_snapshot:
            costPrice,

          profit_amount:
            profitAmount,

          total_selling_price:
            totalSellingPrice,

          total_cost_price:
            totalCostPrice,

          total_profit_amount:
            totalProfitAmount
        }
      );

      this.selectedPaymentMethodCode = '';

    return `🎉 حلو جدًا! طلبك دخل مرحلة التأكيد ❤️

اختيارك:
${place.name}${packageName ? `\n الباكدج: ${packageName}` : ''}

📅 الموعد: ${this.state.date || 'غير محدد'}
🕙 الدخول: ${this.state.time || 'غير محدد'}
👥 العدد: ${guests} شخص

 السعر للفرد: ${this.formatEGP(sellingPrice)}
 إجمالي الحجز التقريبي: ${this.formatEGP(totalSellingPrice)}

🎫 رقم متابعة طلبك:
${data?.tracking_code || this.state.requestId || 'تم التسجيل'}

دلوقتي فريق تساهيل هيراجع تفاصيل الحجز والسعر مع المكان علشان نتأكد إن كل حاجة مظبوطة 

لو الحجز محتاج دفع، الـAgent هيبعتلك طلب الدفع هنا في نفس الشات، وساعتها بس هيظهر لك اختيار طريقة الدفع ورفع إيصال الدفع 💳

خليك معانا هنا ❤️
وأول ما يكون في تحديث على طلبك هتلاقيه في نفس المحادثة.`;

} catch (error) {

  console.error(
    'Create request exception:',
    error
  );

  this.state.currentStep =
    'booking_confirmation';

  return `حصل خطأ بسيط أثناء تسجيل الطلب

بيانات الحجز لسه موجودة.

جرّب تقول "أيوه" مرة تانية ❤️`;
}
}

  // =====================================================
  // ITEMS
  // =====================================================

  private getItems(
    value: any
  ): any[] {

    if (
      !Array.isArray(value)
    ) {

      return [];
    }

    return value;
  }

  // =====================================================
  // ITEM NAMES
  // =====================================================

  private getItemNames(
    value: any
  ): string[] {

    return this.getItems(
      value
    )
      .map(
        item =>
          this.getItemName(item)
      )
      .filter(Boolean);
  }

  // =====================================================
  // ITEM NAME
  // =====================================================

  private getItemName(
    item: any
  ): string {

    if (
      typeof item === 'string'
    ) {

      return item;
    }

    return (
      item?.name ||
      ''
    );
  }

  // =====================================================
  // ITEM PRICE
  // =====================================================

  private getItemPrice(
    item: any
  ): number | null {

    if (
      typeof item === 'object' &&
      item
    ) {

      const raw =
        item.selling_price ??
        item.price;

      if (
        raw !== undefined &&
        raw !== null
      ) {
        const price = Number(raw);

        return Number.isFinite(price)
          ? price
          : null;
      }
    }

    return null;
  }

  // =====================================================
  // CURRENT SELLING / COST PRICE
  // =====================================================

  private getCurrentSellingPrice(): number {

    const place =
      this.state.selectedPlace as any;

    const selectedPackage =
      this.state.selectedPackage;

    const value =
      selectedPackage
        ? Number(
            selectedPackage?.selling_price ??
            selectedPackage?.price ??
            0
          )
        : Number(
            place?.selling_price ??
            place?.price ??
            0
          );

    return Number.isFinite(value)
      ? value
      : 0;
  }

  private getCurrentCostPrice(): number {

    const place =
      this.state.selectedPlace as any;

    const selectedPackage =
      this.state.selectedPackage;

    const value =
      selectedPackage
        ? Number(
            selectedPackage?.cost_price ??
            0
          )
        : Number(
            place?.cost_price ??
            0
          );

    return Number.isFinite(value)
      ? value
      : 0;
  }

  // =====================================================
  // PACKAGE CHOICE
  // =====================================================

  private findPackageChoice(
    text: string,
    packages: any[]
  ): any | null {

    if (!packages.length) {
      return null;
    }

    const normalized =
      this.normalize(text);

    const numberMatch =
      normalized.match(/^\s*(\d+)\s*$/);

    if (numberMatch) {
      const index =
        Number(numberMatch[1]) - 1;

      if (
        index >= 0 &&
        index < packages.length
      ) {
        return packages[index];
      }
    }

    return packages.find(
      item => {
        const name =
          this.normalize(
            this.getItemName(item)
          );

        return !!name && (
          normalized === name ||
          normalized.includes(name) ||
          name.includes(normalized)
        );
      }
    ) || null;
  }

  // =====================================================
  // PAYMENT METHODS
  // =====================================================

private async loadActivePaymentMethods(): Promise<void> {

  if (this.paymentMethodsLoading) {
    return;
  }

  this.paymentMethodsLoading = true;
  this.cdr.detectChanges();

  try {

    const { data, error } =
      await this.supabaseService.client
        .from('payment_methods')
        .select(`
          id,
          name,
          code,
          payment_type,
          payment_url,
          fee_percent,
          active
        `)
        .eq('active', true)
        .order('name', {
          ascending: true
        });

    if (error) {

      console.error(
        'Payment methods loading error:',
        error
      );

      this.paymentMethods = [];

      return;
    }

    this.paymentMethods =
      (data || []).map(
        (item: any) => ({
          ...item,
          fee_percent:
            Number(item?.fee_percent || 0)
        })
      );

    console.log(
      'Payment methods loaded:',
      this.paymentMethods
    );

  } catch (error) {

    console.error(
      'Payment methods loading exception:',
      error
    );

    this.paymentMethods = [];

  } finally {

    this.paymentMethodsLoading = false;

    this.cdr.detectChanges();
  }
}
  private getPaymentMethodsMessage(): string {

    if (!this.paymentMethods.length) {
      return `طرق الدفع غير متاحة حاليًا. فريق تساهيل هيتواصل معاك لإتمام الدفع.`;
    }

    return this.paymentMethods
      .map(
        (method, index) => {

          const fee =
            Number(method.fee_percent || 0);

          const feeText =
            fee > 0
              ? ` — رسوم ${fee}%`
              : ' — بدون رسوم إضافية';

          return `${index + 1}. ${method.name}${feeText}`;
        }
      )
      .join('\n');
  }

  private findPaymentMethodChoice(
    text: string
  ): PaymentMethodOption | null {

    const normalized =
      this.normalize(text);

    const numberMatch =
      normalized.match(/^\s*(\d+)\s*$/);

    if (numberMatch) {
      const index =
        Number(numberMatch[1]) - 1;

      if (
        index >= 0 &&
        index < this.paymentMethods.length
      ) {
        return this.paymentMethods[index];
      }
    }

    return this.paymentMethods.find(
      method => {
        const name =
          this.normalize(method.name);

        const code =
          this.normalize(method.code);

        return (
          normalized === name ||
          normalized === code ||
          normalized.includes(name) ||
          normalized.includes(code)
        );
      }
    ) || null;
  }

  private async handlePaymentMethodSelection(
    text: string,
    request: any
  ): Promise<string> {

    await this.loadActivePaymentMethods();

    const method =
      this.findPaymentMethodChoice(text);

    if (!method) {
      return `اختار طريقة الدفع من القائمة الظاهرة تحت رسالة الحجز `;
    }

    return await this.selectPaymentMethod(
      method,
      request
    );
  }

  private async selectPaymentMethod(
    method: PaymentMethodOption,
    request: any
  ): Promise<string> {

    if (
      !this.state.requestId ||
      !this.state.sessionToken
    ) {
      return `مش قادر أربط طريقة الدفع بالطلب حاليًا. جرّب بعد لحظة.`;
    }

    const { data, error } =
      await this.supabaseService.client.rpc(
        'customer_select_payment_method',
        {
          p_request_id:
            this.state.requestId,

          p_session_token:
            this.state.sessionToken,

          p_payment_code:
            method.code
        }
      );

    if (error) {
      console.error(
        'Payment method selection error:',
        error
      );

      return `حصلت مشكلة أثناء اختيار طريقة الدفع. جرّب تختارها مرة تانية.`;
    }

    const result =
      Array.isArray(data)
        ? data[0]
        : data;

    const feePercent =
      Number(
        result?.payment_fee_percent ??
        method.fee_percent ??
        0
      );

    const feeAmount =
      Number(
        result?.payment_fee_amount ??
        0
      );

    // The agent-requested amount is the source of truth for this payment.
    // Do not fall back to the booking total (which caused 2,000 to appear
    // when the agent had actually requested 11,000).
    const amountDue =
      Number(
        request?.amount_due ??
        result?.amount_due ??
        this.state.paymentAmountDue ??
        0
      );

    const paymentUrl =
      result?.payment_url ??
      method.payment_url ??
      null;

    this.state.currentStep =
      'request_tracking';

    this.state.awaiting =
      null;

    this.state.requestWorkflowStatus =
      'waiting_payment_receipt';

    this.state.requestPaymentStatus =
      'pending';

    this.state.paymentAmountDue =
      amountDue;

    this.state.paymentMethodCode =
      method.code;

    this.state.paymentRequestReason =
      request?.payment_request_reason ||
      this.state.paymentRequestReason;

    await this.updateSession({
      current_step:
        'request_tracking'
    });

    void this.saveEvent(
      'payment_method_selected',
      {
        payment_method_code:
          method.code,

        payment_method_name:
          method.name,

        fee_percent:
          feePercent,

        fee_amount:
          feeAmount,

        amount_due:
          amountDue
      }
    );

    const feeText =
      feePercent > 0
        ? `\nرسوم طريقة الدفع: ${feePercent}% (${this.formatEGP(feeAmount)})`
        : '\nبدون رسوم دفع إضافية';

    const reasonText =
      request?.payment_request_reason
        ? `\nسبب الدفع: ${request.payment_request_reason}`
        : '';

    if (
      method.payment_type === 'payment_link'
    ) {

      if (paymentUrl) {
        return `تم اختيار ${method.name} ✅\n\nالمبلغ المطلوب: ${this.formatEGP(amountDue)}${reasonText}${feeText}\n\nلينك الدفع:\n${paymentUrl}\n\nبعد إتمام الدفع ارفع الإيصال من زر رفع الإيصال هنا في الشات.`;
      }

      return `تم اختيار ${method.name} ✅\n\nالمبلغ المطلوب: ${this.formatEGP(amountDue)}${reasonText}${feeText}\n\nطريقة الدفع دي محتاجة لينك دفع، لكن اللينك مش مضاف حاليًا في لوحة الحسابات. فريق تساهيل هيبعتهولك، وبعد الدفع ارفع الإيصال هنا.`;
    }

    return `تم اختيار ${method.name} ✅\n\nالمبلغ المطلوب: ${this.formatEGP(amountDue)}${reasonText}${feeText}\n\nحوّل المبلغ باستخدام بيانات التحويل الخاصة بالطريقة دي، وبعدها ارفع صورة أو PDF للإيصال من زر رفع الإيصال هنا في الشات.`;
  }

  // =====================================================
  // FORMAT EGP
  // =====================================================

  private formatEGP(
    value: number
  ): string {

    return new Intl.NumberFormat(
      'ar-EG'
    ).format(
      Number(value || 0)
    ) + ' جنيه';
  }

  // =====================================================
  // DATE DATABASE FORMAT
  // =====================================================

  private convertDateForDatabase(
    date: string | null
  ): string | null {

    if (!date) {
      return null;
    }

    const trimmed = date.trim();
    const normalized = this.normalize(trimmed);

    const formatDate = (value: Date): string => {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const today = new Date();
    today.setHours(12, 0, 0, 0);

    if (
      normalized === 'اليوم' ||
      normalized === 'النهارده'
    ) {
      return formatDate(today);
    }

    if (
      normalized === 'غدا' ||
      normalized === 'بكره' ||
      normalized === 'بكرا'
    ) {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return formatDate(tomorrow);
    }

    const weekdays: Record<string, number> = {
      'الاحد': 0,
      'الاثنين': 1,
      'الاتنين': 1,
      'الثلاثاء': 2,
      'التلات': 2,
      'الاربعاء': 3,
      'الاربع': 3,
      'الخميس': 4,
      'الجمعه': 5,
      'السبت': 6
    };

    if (weekdays[normalized] !== undefined) {
      const targetDay = weekdays[normalized];
      const result = new Date(today);
      let diff = (targetDay - result.getDay() + 7) % 7;

      // A named weekday means the next occurrence.
      if (diff === 0) {
        diff = 7;
      }

      result.setDate(result.getDate() + diff);
      return formatDate(result);
    }

    const numeric = trimmed.match(
      /^(\d{1,2})[\/-](\d{1,2})$/
    );

    if (numeric) {
      const day = Number(numeric[1]);
      const month = Number(numeric[2]);
      const year = today.getFullYear();

      if (
        month >= 1 &&
        month <= 12 &&
        day >= 1 &&
        day <= 31
      ) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  }

  // =====================================================
  // TIME DATABASE FORMAT
  // =====================================================

  private convertTimeForDatabase(
    time: string | null
  ): string | null {

    if (!time) {
      return null;
    }

    const normalized = this.normalize(time);

    const dayParts: Record<string, string> = {
      'الصبح': '10:00:00',
      'صباح': '10:00:00',
      'الظهر': '12:00:00',
      'بعد الظهر': '14:00:00',
      'العصر': '16:00:00',
      'المغرب': '18:00:00',
      'المساء': '19:00:00',
      'بالليل': '20:00:00'
    };

    if (dayParts[normalized]) {
      return dayParts[normalized];
    }

    const match = normalized.match(
      /^(\d{1,2})(?::(\d{2}))?\s*(ص|م|am|pm|الصبح|المساء|بالليل|الظهر|بعد الظهر|العصر|المغرب)?/
    );

    if (!match) {
      return null;
    }

    let hour = Number(match[1]);
    const minute = Number(match[2] || 0);
    const period = match[3] || '';

    if (
      period === 'م' ||
      period === 'pm' ||
      ['المساء', 'بالليل', 'بعد الظهر', 'العصر', 'المغرب'].includes(period)
    ) {
      if (hour < 12) {
        hour += 12;
      }
    } else if (
      period === 'ص' ||
      period === 'am' ||
      period === 'الصبح'
    ) {
      if (hour === 12) {
        hour = 0;
      }
    }

    if (
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }

    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  }

  // =====================================================
  // ENTER
  // =====================================================

  onInputKeydown(
    event: KeyboardEvent
  ): void {

    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {

      event.preventDefault();

      void this.sendMessage();
    }
  }

  // =====================================================
  // SCROLL
  // =====================================================

  private scrollMessages(): void {

    setTimeout(() => {

      const container =
        document.querySelector(
          '.messages-area'
        );

      if (container) {

        container.scrollTop =
          container.scrollHeight;
      }

    }, 50);
  }
  // =====================================================
// TEMPLATE HELPERS
// =====================================================

trackByPlace(
  index: number,
  place: Place
): string | number {
  return place.id;
}

formatPlacePrice(
  price: number | undefined
): string {
  return this.formatEGP(
    Number(price || 0)
  );
}

getServiceName(
  service: any
): string {
  return this.getItemName(service);
}

changeSelectedPlace(): void {

  if (this.state.completed) {
    return;
  }

  // Remove the selected-place message from the conversation.
  this.messages = this.messages.filter(
    message =>
      message.kind !== 'place' &&
      message.context !== 'place-selection'
  );

  this.state.selectedPlace = null;

  this.state.selectedPackage = null;

  this.state.selectedExtras = [];

  this.state.awaiting = 'recommended';

  this.state.currentStep = 'recommendations';

  this.state.lastIntent = 'recommendations';

  void this.refreshFilteredPlaces();

  void this.saveEvent(
    'place_selection_cleared',
    {}
  );
}
}
