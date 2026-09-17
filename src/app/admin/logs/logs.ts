import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminDashboardService } from '../services/admin-dashboard.service';

@Component({
  selector: 'app-admin-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './logs.html',
  styleUrl: './logs.css'
})
export class AdminLogsComponent implements OnInit {

  events: any[] = [];

  loading = true;
  errorMessage = '';

  searchTerm = '';
  selectedEventType = 'all';

  selectedEvent: any = null;


  constructor(
    private adminService: AdminDashboardService
  ) {}


  async ngOnInit(): Promise<void> {
    await this.loadEvents();
  }


  async loadEvents(): Promise<void> {

    this.loading = true;
    this.errorMessage = '';

    try {

      const result =
        await this.adminService.getRequestEvents();

      this.events =
        Array.isArray(result)
          ? result
          : [];

    } catch (error) {

      console.error(
        'Request events loading error:',
        error
      );

      this.errorMessage =
        'حصلت مشكلة أثناء تحميل السجل.';

    } finally {

      this.loading = false;

    }
  }


  get eventTypes(): string[] {

    const types =
      this.events
        .map(event =>
          String(event.event_type || '').trim()
        )
        .filter(Boolean);

    return Array.from(
      new Set(types)
    ).sort();
  }


  get filteredEvents(): any[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.events.filter(event => {

      const eventType =
        String(
          event.event_type || ''
        ).toLowerCase();

      const requestId =
        String(
          event.request_id || ''
        ).toLowerCase();

      const sessionId =
        String(
          event.session_id || ''
        ).toLowerCase();

      const eventData =
        this.formatEventData(
          event.event_data
        ).toLowerCase();


      const matchesType =
        this.selectedEventType === 'all'
          ? true
          : event.event_type ===
            this.selectedEventType;


      const matchesSearch =
        !search ||
        eventType.includes(search) ||
        requestId.includes(search) ||
        sessionId.includes(search) ||
        eventData.includes(search);


      return (
        matchesType &&
        matchesSearch
      );

    });
  }


  getEventTypeCount(
    eventType: string
  ): number {

    if (eventType === 'all') {
      return this.events.length;
    }

    return this.events.filter(
      event =>
        event.event_type === eventType
    ).length;
  }


  selectEventType(
    eventType: string
  ): void {

    this.selectedEventType =
      eventType;
  }


  clearFilters(): void {

    this.searchTerm = '';

    this.selectedEventType =
      'all';
  }


  openEvent(
    event: any
  ): void {

    this.selectedEvent =
      event;
  }


  closeEvent(): void {

    this.selectedEvent =
      null;
  }


  formatEventData(
    eventData: any
  ): string {

    if (
      eventData === null ||
      eventData === undefined
    ) {
      return '—';
    }


    if (
      typeof eventData === 'string'
    ) {
      return eventData;
    }


    try {

      return JSON.stringify(
        eventData,
        null,
        2
      );

    } catch {

      return String(
        eventData
      );

    }
  }


  getEventLabel(
    eventType: string | null
  ): string {

    const labels:
      Record<string, string> = {

        request_created:
          'إنشاء طلب',

        request_updated:
          'تحديث الطلب',

        request_confirmed:
          'تأكيد الطلب',

        request_completed:
          'اكتمال الطلب',

        request_cancelled:
          'إلغاء الطلب',

        place_selected:
          'اختيار مكان',

        booking_created:
          'إنشاء حجز',

        booking_confirmed:
          'تأكيد الحجز',

        session_started:
          'بدء محادثة',

        session_completed:
          'اكتمال المحادثة'

      };


    if (!eventType) {
      return 'حدث';
    }


    return (
      labels[eventType] ||
      eventType
    );
  }


  getShortId(
    value: string | null
  ): string {

    if (!value) {
      return '—';
    }

    return value.length > 12
      ? `${value.slice(0, 8)}...`
      : value;
  }

}