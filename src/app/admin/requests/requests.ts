import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  AdminDashboardService
} from '../services/admin-dashboard.service';


type RequestFilter =
  | 'all'
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';


@Component({
  selector: 'app-admin-requests',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './requests.html',

  styleUrl: './requests.css'
})
export class AdminRequestsComponent implements OnInit {

  requests: any[] = [];

  loading = true;

  errorMessage = '';

  searchTerm = '';

  activeFilter: RequestFilter = 'all';

  selectedRequest: any = null;


  // =========================================================
  // PAGINATION
  // =========================================================

  currentPage = 1;

  readonly pageSize = 10;


  constructor(
    private adminService: AdminDashboardService,
    private cdr: ChangeDetectorRef
  ) {}


  async ngOnInit(): Promise<void> {

    await this.loadRequests();

  }


  // =========================================================
  // LOAD REQUESTS
  // =========================================================

  async loadRequests(): Promise<void> {

    this.loading = true;

    this.errorMessage = '';

    this.cdr.markForCheck();


    try {

      const result =
        await this.adminService
          .getAllRequests();


      this.requests =
        Array.isArray(result)
          ? [...result]
          : [];


      this.currentPage = 1;

      this.cdr.markForCheck();


    } catch (error) {

      console.error(
        'Requests loading error:',
        error
      );


      this.requests = [];


      this.errorMessage =
        'تعذر تحميل طلبات الحجز. يرجى المحاولة مرة أخرى.';


      this.cdr.markForCheck();


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // FILTERED REQUESTS
  // =========================================================

  get filteredRequests(): any[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.requests.filter(
      request => {

        const name =
          String(
            request.name || ''
          ).toLowerCase();


        const phone =
          String(
            request.phone || ''
          ).toLowerCase();


        const place =
          String(
            request.place_name || ''
          ).toLowerCase();


        const status =
          String(
            request.status || ''
          ).toLowerCase();


        let matchesFilter = true;


        if (
          this.activeFilter !== 'all'
        ) {

          /*
           * بعض الطلبات القديمة أو الحالية
           * ممكن تكون status = new
           * ونعتبرها ضمن الطلبات الجديدة.
           */
          if (
            this.activeFilter === 'pending'
          ) {

            matchesFilter =
              status === 'pending' ||
              status === 'new';

          } else {

            matchesFilter =
              status === this.activeFilter;

          }

        }


        const matchesSearch =
          !search ||

          name.includes(search) ||

          phone.includes(search) ||

          place.includes(search);


        return (
          matchesFilter &&
          matchesSearch
        );

      }
    );

  }


  // =========================================================
  // PAGINATED REQUESTS
  // =========================================================

  get paginatedRequests(): any[] {

    const start =
      (
        this.currentPage - 1
      ) * this.pageSize;


    const end =
      start +
      this.pageSize;


    return this.filteredRequests.slice(
      start,
      end
    );

  }


  get totalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.filteredRequests.length /
        this.pageSize
      )
    );

  }


  get pageStart(): number {

    if (
      this.filteredRequests.length === 0
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

      this.filteredRequests.length
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


  // =========================================================
  // SEARCH
  // =========================================================

  onSearchChange(
    value: string
  ): void {

    this.searchTerm =
      value;

    this.currentPage =
      1;

  }


  // =========================================================
  // FILTERS
  // =========================================================

  setFilter(
    filter: RequestFilter
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
    filter: RequestFilter
  ): number {

    if (
      filter === 'all'
    ) {

      return this.requests.length;

    }


    if (
      filter === 'pending'
    ) {

      return this.requests.filter(
        request => {

          const status =
            String(
              request.status || ''
            ).toLowerCase();


          return (
            status === 'pending' ||
            status === 'new'
          );

        }
      ).length;

    }


    return this.requests.filter(
      request =>
        String(
          request.status || ''
        ).toLowerCase() === filter
    ).length;

  }


  // =========================================================
  // REQUEST DRAWER
  // =========================================================

  openRequest(
    request: any
  ): void {

    this.selectedRequest =
      request;

  }


  closeRequest(): void {

    this.selectedRequest =
      null;

  }


  // =========================================================
  // STATUS LABEL
  // =========================================================

  getStatusLabel(
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


    return (
      labels[status || ''] ||
      status ||
      'الحالة غير محددة'
    );

  }


  // =========================================================
  // TRACK BY
  // =========================================================

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