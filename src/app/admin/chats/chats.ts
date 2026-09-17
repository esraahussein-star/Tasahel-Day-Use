import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  LucideAngularModule,
  MessagesSquare,
  UserRound,
  MapPinned,
  CircleCheckBig,
  Clock3,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-angular';

import {
  AdminDashboardService
} from '../services/admin-dashboard.service';


type ChatFilter =
  | 'all'
  | 'with-name'
  | 'without-name'
  | 'with-place'
  | 'without-place';


@Component({
  selector: 'app-admin-chats',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule
  ],

  templateUrl: './chats.html',
  styleUrl: './chats.css'
})
export class AdminChatsComponent implements OnInit {

  sessions: any[] = [];

  loading = true;

  errorMessage = '';

  selectedSession: any = null;

  messages: any[] = [];

  messagesLoading = false;

  searchTerm = '';

  activeFilter: ChatFilter = 'all';


  // ==========================================
  // PAGINATION
  // ==========================================

  currentPage = 1;

  readonly pageSize = 10;


  readonly MessagesSquare =
    MessagesSquare;

  readonly UserRound =
    UserRound;

  readonly MapPinned =
    MapPinned;

  readonly CircleCheckBig =
    CircleCheckBig;

  readonly Clock3 =
    Clock3;

  readonly Search =
    Search;

  readonly SlidersHorizontal =
    SlidersHorizontal;

  readonly ChevronLeft =
    ChevronLeft;

  readonly ChevronRight =
    ChevronRight;

  readonly Eye =
    Eye;


  constructor(
    private adminService: AdminDashboardService,
    private cdr: ChangeDetectorRef
  ) {}


  async ngOnInit(): Promise<void> {

    await this.loadSessions();

  }


  async loadSessions(): Promise<void> {

    this.loading = true;

    this.errorMessage = '';

    this.cdr.markForCheck();


    try {

      const result =
        await this.adminService
          .getAllSessions();


      this.sessions =
        Array.isArray(result)
          ? [...result]
          : [];


      this.currentPage = 1;

      this.cdr.markForCheck();


    } catch (error) {

      console.error(
        'Chats loading error:',
        error
      );


      this.sessions = [];


      this.errorMessage =
        'تعذر تحميل بيانات المحادثات. يرجى المحاولة مرة أخرى.';


      this.cdr.markForCheck();


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // ==========================================
  // FILTERED SESSIONS
  // ==========================================

  get filteredSessions(): any[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.sessions.filter(
      session => {

        const name =
          String(
            session.name || ''
          ).trim();


        const phone =
          String(
            session.phone || ''
          ).trim();


        const place =
          String(
            session.selected_place_name || ''
          ).trim();


        let matchesFilter = true;


        if (
          this.activeFilter === 'with-name'
        ) {

          matchesFilter =
            name.length > 0;

        }


        if (
          this.activeFilter === 'without-name'
        ) {

          matchesFilter =
            name.length === 0;

        }


        if (
          this.activeFilter === 'with-place'
        ) {

          matchesFilter =
            place.length > 0;

        }


        if (
          this.activeFilter === 'without-place'
        ) {

          matchesFilter =
            place.length === 0;

        }


        const matchesSearch =
          !search ||

          name
            .toLowerCase()
            .includes(search) ||

          phone
            .toLowerCase()
            .includes(search) ||

          place
            .toLowerCase()
            .includes(search);


        return (
          matchesFilter &&
          matchesSearch
        );

      }
    );

  }


  // ==========================================
  // PAGINATED SESSIONS
  // ==========================================

  get paginatedSessions(): any[] {

    const start =
      (this.currentPage - 1) *
      this.pageSize;


    const end =
      start +
      this.pageSize;


    return this.filteredSessions.slice(
      start,
      end
    );

  }


  get totalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.filteredSessions.length /
        this.pageSize
      )
    );

  }


  get pageStart(): number {

    if (
      this.filteredSessions.length === 0
    ) {

      return 0;

    }


    return (
      (this.currentPage - 1) *
      this.pageSize
    ) + 1;

  }


  get pageEnd(): number {

    return Math.min(
      this.currentPage *
      this.pageSize,

      this.filteredSessions.length
    );

  }


  previousPage(): void {

    if (
      this.currentPage > 1
    ) {

      this.currentPage--;

    }

  }


  nextPage(): void {

    if (
      this.currentPage <
      this.totalPages
    ) {

      this.currentPage++;

    }

  }


  goToPage(
    page: number
  ): void {

    if (
      page < 1 ||
      page > this.totalPages
    ) {

      return;

    }


    this.currentPage =
      page;

  }


  // ==========================================
  // SEARCH
  // ==========================================

  onSearchChange(
    value: string
  ): void {

    this.searchTerm =
      value;

    this.currentPage =
      1;

  }


  // ==========================================
  // STATS
  // ==========================================

  get totalSessions(): number {

    return this.sessions.length;

  }


  get completedSessions(): number {

    return this.sessions.filter(
      session =>
        session.status ===
        'completed'
    ).length;

  }


  get activeSessions(): number {

    return this.sessions.filter(
      session =>
        session.status !==
        'completed'
    ).length;

  }


  get sessionsWithPlace(): number {

    return this.sessions.filter(
      session =>
        String(
          session.selected_place_name ||
          ''
        ).trim().length > 0
    ).length;

  }


  // ==========================================
  // FILTERS
  // ==========================================

  setFilter(
    filter: ChatFilter
  ): void {

    this.activeFilter =
      filter;

    this.currentPage =
      1;

  }


  clearFilters(): void {

    this.activeFilter =
      'all';

    this.searchTerm =
      '';

    this.currentPage =
      1;

  }


  getFilterCount(
    filter: ChatFilter
  ): number {

    switch (filter) {

      case 'with-name':

        return this.sessions.filter(
          session =>
            String(
              session.name || ''
            ).trim().length > 0
        ).length;


      case 'without-name':

        return this.sessions.filter(
          session =>
            String(
              session.name || ''
            ).trim().length === 0
        ).length;


      case 'with-place':

        return this.sessions.filter(
          session =>
            String(
              session.selected_place_name ||
              ''
            ).trim().length > 0
        ).length;


      case 'without-place':

        return this.sessions.filter(
          session =>
            String(
              session.selected_place_name ||
              ''
            ).trim().length === 0
        ).length;


      default:

        return this.sessions.length;

    }

  }


  // ==========================================
  // OPEN SESSION
  // ==========================================

  async openSession(
    session: any
  ): Promise<void> {

    this.selectedSession =
      session;

    this.messages = [];

    this.messagesLoading =
      true;

    this.cdr.markForCheck();


    try {

      const result =
        await this.adminService
          .getSessionMessages(
            session.id
          );


      this.messages =
        Array.isArray(result)
          ? [...result]
          : [];


      this.cdr.markForCheck();


    } catch (error) {

      console.error(
        'Session messages error:',
        error
      );


      this.messages = [];

      this.cdr.markForCheck();


    } finally {

      this.messagesLoading =
        false;

      this.cdr.markForCheck();

    }

  }


  closeSession(): void {

    this.selectedSession =
      null;

    this.messages =
      [];

  }


  // ==========================================
  // LABELS
  // ==========================================

  getStepLabel(
    step: string | null
  ): string {

    const labels:
      Record<string, string> = {

        name:
          'بانتظار تسجيل الاسم',

        phone:
          'بانتظار رقم الهاتف',

        requirements:
          'استكمال بيانات العميل',

        guests:
          'بانتظار عدد الأفراد',

        budget:
          'بانتظار تحديد الميزانية',

        area:
          'بانتظار تحديد المنطقة',

        recommendations:
          'استعراض الأماكن المقترحة',

        recommended:
          'استعراض الأماكن المقترحة',

        place_selected:
          'تم اختيار المكان',

        booking_date:
          'بانتظار تاريخ الحجز',

        date:
          'بانتظار تاريخ الحجز',

        booking_time:
          'بانتظار وقت الحجز',

        time:
          'بانتظار وقت الحجز',

        booking_confirmation:
          'بانتظار تأكيد الحجز',

        creating_request:
          'جاري تسجيل الطلب',

        completed:
          'تم تسجيل الطلب'

      };


    return (
      labels[step || ''] ||
      step ||
      'المرحلة غير محددة'
    );

  }


  getSessionStatusLabel(
    session: any
  ): string {

    return (
      session?.status ===
      'completed'
    )
      ? 'مكتملة'
      : 'قيد المتابعة';

  }


  trackBySessionId(
    index: number,
    session: any
  ): string | number {

    return (
      session?.id ||
      index
    );

  }


  trackByMessageId(
    index: number,
    message: any
  ): string | number {

    return (
      message?.id ||
      index
    );

  }

}