import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  LucideAngularModule,
  MessageCircleMore,
  CalendarCheck2,
  CircleAlert,
  Building2,
  TrendingUp,
  MapPin,
  UserRoundCheck,
  Clock3
} from 'lucide-angular';

import {
  AdminDashboardService
} from '../services/admin-dashboard.service';


@Component({
  selector: 'app-admin-dashboard',

  standalone: true,

  imports: [
    CommonModule,
    LucideAngularModule
  ],

  templateUrl: './dashboard.html',

  styleUrl: './dashboard.css'
})
export class AdminDashboardComponent implements OnInit {

  stats: any = null;

  sessions: any[] = [];

  requests: any[] = [];

  loading = true;

  errorMessage = '';


  readonly MessageCircleMore =
    MessageCircleMore;

  readonly CalendarCheck2 =
    CalendarCheck2;

  readonly CircleAlert =
    CircleAlert;

  readonly Building2 =
    Building2;

  readonly TrendingUp =
    TrendingUp;

  readonly MapPin =
    MapPin;

  readonly UserRoundCheck =
    UserRoundCheck;

  readonly Clock3 =
    Clock3;


  constructor(
    private adminService: AdminDashboardService,
    private cdr: ChangeDetectorRef
  ) {}


  async ngOnInit(): Promise<void> {

    await this.loadDashboard();

  }


  async loadDashboard(): Promise<void> {

    this.loading = true;

    this.errorMessage = '';

    this.cdr.markForCheck();


    try {

      const [
        stats,
        sessions,
        requests
      ] = await Promise.all([

        this.adminService
          .getDashboardStats(),

        this.adminService
          .getRecentSessions(),

        this.adminService
          .getRecentRequests()

      ]);


      this.stats =
        stats || this.getEmptyStats();


      this.sessions =
        Array.isArray(sessions)
          ? [...sessions]
          : [];


      this.requests =
        Array.isArray(requests)
          ? [...requests]
          : [];


      this.cdr.markForCheck();


    } catch (error) {

      console.error(
        'Admin dashboard loading error:',
        error
      );


      this.stats =
        this.getEmptyStats();


      this.sessions = [];

      this.requests = [];


      this.errorMessage =
        'تعذر تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.';


      this.cdr.markForCheck();


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  private getEmptyStats(): any {

    return {

      chats_today: 0,

      completed_chats: 0,

      incomplete_chats: 0,

      conversion_rate: 0,

      requests_today: 0,

      pending_requests: 0,

      confirmed_requests: 0,

      completed_requests: 0,

      cancelled_requests: 0,

      top_place_name: null,

      top_place_requests: 0,

      top_dropoff_step: null,

      top_dropoff_count: 0,

      active_places: 0

    };

  }


  getStepLabel(
    step: string | null
  ): string {

    const labels:
      Record<string, string> = {

        name:
          'بانتظار الاسم',

        phone:
          'بانتظار رقم الهاتف',

        requirements:
          'استكمال بيانات العميل',

        guests:
          'بانتظار عدد الأفراد',

        budget:
          'بانتظار الميزانية',

        area:
          'بانتظار المنطقة',

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
          'بانتظار تأكيد العميل',

        creating_request:
          'جاري تسجيل الطلب',

        completed:
          'تم تسجيل الطلب'

      };


    if (!step) {

      return 'غير محدد';

    }


    return (
      labels[step] ||
      step
    );

  }


  getRequestStatusLabel(
    status: string | null
  ): string {

    const labels:
      Record<string, string> = {

        new:
          'طلب جديد',

        pending:
          'قيد المراجعة',

        confirmed:
          'تم التأكيد',

        completed:
          'مكتمل',

        cancelled:
          'ملغي'

      };


    if (!status) {

      return 'غير محدد';

    }


    return (
      labels[status] ||
      status
    );

  }


  getConversionRate(): number {

    const value =
      Number(
        this.stats?.conversion_rate
        ?? 0
      );


    if (
      Number.isNaN(value)
    ) {

      return 0;

    }


    return value;

  }


  getCompletedChatsPercentage(): number {

    const total =
      Number(
        this.stats?.chats_today
        ?? 0
      );


    const completed =
      Number(
        this.stats?.completed_chats
        ?? 0
      );


    if (
      !total ||
      total <= 0
    ) {

      return 0;

    }


    return Math.round(
      (
        completed /
        total
      ) * 100
    );

  }


  getTopPlaceName(): string {

    const placeName =
      String(
        this.stats
          ?.top_place_name
        ?? ''
      ).trim();


    return (
      placeName ||
      'لا توجد بيانات'
    );

  }


  getDropoffLabel(): string {

    const step =
      this.stats
        ?.top_dropoff_step;


    if (!step) {

      return 'لا توجد بيانات';

    }


    return this.getStepLabel(
      step
    );

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


  trackByRequestId(
    index: number,
    request: any
  ): string | number {

    return (
      request?.id ||
      index
    );

  }

}