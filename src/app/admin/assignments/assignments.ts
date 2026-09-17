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


type AssignmentFilter =
  | 'all'
  | 'unassigned'
  | 'assigned'
  | 'in_progress'
  | 'completed';

interface AssignmentRow {
  id?: string;

  request_id: string;

  assigned_to?: string | null;

  assigned_by?: string | null;

  assignment_type?: 'manual' | 'auto';

  status?: string;

  reason?: string | null;

  created_at?: string;

  started_at?: string | null;

  completed_at?: string | null;
}


@Component({
  selector: 'app-admin-assignments',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './assignments.html',

  styleUrl: './assignments.css'
})
export class AdminAssignmentsComponent implements OnInit {

  // =========================================================
  // DATA
  // =========================================================

  requests: any[] = [];

  agents: any[] = [];

  assignments: AssignmentRow[] = [];

  loading = true;

  saving = false;

  errorMessage = '';

  assignError = '';


  // =========================================================
  // FILTERS
  // =========================================================

  searchTerm = '';

  activeFilter: AssignmentFilter = 'all';

  selectedAgentFilter = '';


  // =========================================================
  // PAGINATION
  // =========================================================

  currentPage = 1;

  readonly pageSize = 10;


  // =========================================================
  // ASSIGN DRAWER
  // =========================================================

  drawerOpen = false;

  selectedRequest: any = null;

  selectedAgentId = '';

  assignmentReason = '';


  constructor(
    private adminService: AdminDashboardService,
    private cdr: ChangeDetectorRef
  ) {}


  // =========================================================
  // INIT
  // =========================================================

  async ngOnInit(): Promise<void> {

    await this.loadData();

  }


  // =========================================================
  // LOAD DATA
  // =========================================================

  async loadData(): Promise<void> {

    this.loading = true;

    this.errorMessage = '';

    this.cdr.markForCheck();


    try {

      const [
        requestsResult,
        usersResult,
        assignmentsResult
      ] = await Promise.all([

        this.adminService
          .getAllRequests(),

        this.adminService
          .getAdminUsers(),

        this.adminService
          .getRequestAssignments()

      ]);


      this.requests =
        Array.isArray(requestsResult)
          ? [...requestsResult]
          : [];


      this.agents =
        Array.isArray(usersResult)
          ? usersResult.filter(
              user =>
                user.active === true &&
                user.role === 'agent'
            )
          : [];


      this.assignments =
        Array.isArray(assignmentsResult)
          ? [...assignmentsResult]
          : [];


      this.currentPage = 1;


    } catch (error) {

      console.error(
        'Assignments loading error:',
        error
      );


      this.requests = [];

      this.agents = [];

      this.assignments = [];


      this.errorMessage =
        'تعذر تحميل بيانات توزيع الطلبات. يرجى المحاولة مرة أخرى.';


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // MERGED REQUESTS
  // =========================================================

  get assignmentRows(): any[] {

    return this.requests.map(
      request => {

        const assignment =
          this.getActiveAssignment(
            request.id
          );


        const agent =
          assignment?.assigned_to
            ? this.agents.find(
                current =>
                  current.id ===
                  assignment.assigned_to
              )
            : null;


        return {

          ...request,

          assignment,

          assigned_agent:
            agent || null

        };

      }
    );

  }


  // =========================================================
  // FILTERED
  // =========================================================

  get filteredRows(): any[] {

    const search =
      this.searchTerm
        .trim()
        .toLowerCase();


    return this.assignmentRows.filter(
      row => {

        const name =
          String(
            row.name || ''
          ).toLowerCase();


        const phone =
          String(
            row.phone || ''
          ).toLowerCase();


        const place =
          String(
            row.place_name || ''
          ).toLowerCase();


        const agentName =
          String(
            row.assigned_agent
              ?.full_name || ''
          ).toLowerCase();


        const assignmentStatus =
          String(
            row.assignment?.status || ''
          ).toLowerCase();


        const hasAssignment =
          !!row.assignment;


        let matchesFilter = true;


        if (
          this.activeFilter === 'unassigned'
        ) {

          matchesFilter =
            !hasAssignment;

        }


        if (
          this.activeFilter === 'assigned'
        ) {

          matchesFilter =
            assignmentStatus === 'assigned';

        }


        if (
          this.activeFilter === 'in_progress'
        ) {

          matchesFilter =
            assignmentStatus ===
            'in_progress';

        }


        if (
          this.activeFilter === 'completed'
        ) {

          matchesFilter =
            assignmentStatus ===
            'completed';

        }


        const matchesAgent =
          !this.selectedAgentFilter ||
          row.assignment?.assigned_to ===
            this.selectedAgentFilter;


        const matchesSearch =
          !search ||
          name.includes(search) ||
          phone.includes(search) ||
          place.includes(search) ||
          agentName.includes(search);


        return (
          matchesFilter &&
          matchesAgent &&
          matchesSearch
        );

      }
    );

  }


  // =========================================================
  // PAGINATION
  // =========================================================

  get paginatedRows(): any[] {

    const start =
      (
        this.currentPage - 1
      ) * this.pageSize;


    return this.filteredRows.slice(
      start,
      start + this.pageSize
    );

  }


  get totalPages(): number {

    return Math.max(
      1,
      Math.ceil(
        this.filteredRows.length /
        this.pageSize
      )
    );

  }


  get pageStart(): number {

    if (
      this.filteredRows.length === 0
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

      this.filteredRows.length
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


  // =========================================================
  // FILTER ACTIONS
  // =========================================================

  onSearchChange(
    value: string
  ): void {

    this.searchTerm = value;

    this.currentPage = 1;

  }


  setFilter(
    filter: AssignmentFilter
  ): void {

    this.activeFilter =
      filter;

    this.currentPage = 1;

  }


  setAgentFilter(
    agentId: string
  ): void {

    this.selectedAgentFilter =
      agentId;

    this.currentPage = 1;

  }


  clearFilters(): void {

    this.searchTerm = '';

    this.activeFilter = 'all';

    this.selectedAgentFilter = '';

    this.currentPage = 1;

  }


  // =========================================================
  // COUNTS
  // =========================================================

  get totalRequests(): number {

    return this.requests.length;

  }


  get unassignedCount(): number {

    return this.assignmentRows.filter(
      row =>
        !row.assignment
    ).length;

  }


  get assignedCount(): number {

    return this.assignments.filter(
      assignment =>
        assignment.status === 'assigned'
    ).length;

  }


  get inProgressCount(): number {

    return this.assignments.filter(
      assignment =>
        assignment.status ===
        'in_progress'
    ).length;

  }


  get completedCount(): number {

    return this.assignments.filter(
      assignment =>
        assignment.status ===
        'completed'
    ).length;

  }


  getFilterCount(
    filter: AssignmentFilter
  ): number {

    if (
      filter === 'all'
    ) {

      return this.totalRequests;

    }


    if (
      filter === 'unassigned'
    ) {

      return this.unassignedCount;

    }


    if (
      filter === 'assigned'
    ) {

      return this.assignedCount;

    }


    if (
      filter === 'in_progress'
    ) {

      return this.inProgressCount;

    }


    return this.completedCount;

  }


  // =========================================================
  // ASSIGNMENT HELPERS
  // =========================================================

  getActiveAssignment(
    requestId: string
  ): AssignmentRow | null {

    return (
      this.assignments.find(
        assignment =>
          assignment.request_id ===
            requestId &&
          (
            assignment.status ===
              'assigned' ||
            assignment.status ===
              'in_progress'
          )
      ) || null
    );

  }


  getAgentActiveCount(
    agentId: string
  ): number {

    return this.assignments.filter(
      assignment =>
        assignment.assigned_to ===
          agentId &&
        (
          assignment.status ===
            'assigned' ||
          assignment.status ===
            'in_progress'
        )
    ).length;

  }


  getAgentCapacity(
    agent: any
  ): number {

    return Number(
      agent?.max_active_requests || 0
    );

  }


  getAgentRemainingCapacity(
    agent: any
  ): number {

    const max =
      this.getAgentCapacity(agent);


    const current =
      this.getAgentActiveCount(
        agent.id
      );


    return Math.max(
      0,
      max - current
    );

  }


  isAgentAvailable(
    agent: any
  ): boolean {

    return (
      agent.active === true &&
      this.getAgentRemainingCapacity(agent) > 0
    );

  }


  // =========================================================
  // OPEN ASSIGN DRAWER
  // =========================================================

  openAssign(
    request: any
  ): void {

    this.selectedRequest =
      request;

    this.assignError = '';

    const currentAssignment =
      this.getActiveAssignment(
        request.id
      );


    this.selectedAgentId =
      currentAssignment?.assigned_to ||
      '';


    this.assignmentReason =
      currentAssignment?.reason ||
      '';


    this.drawerOpen = true;

  }


  // =========================================================
  // CLOSE DRAWER
  // =========================================================

  closeDrawer(): void {

    if (
      this.saving
    ) {

      return;

    }


    this.drawerOpen = false;

    this.selectedRequest = null;

    this.selectedAgentId = '';

    this.assignmentReason = '';

    this.assignError = '';

  }


  // =========================================================
  // SAVE ASSIGNMENT
  // =========================================================

  async saveAssignment(): Promise<void> {

    if (
      !this.selectedRequest
    ) {

      return;

    }


    if (
      !this.selectedAgentId
    ) {

      this.assignError =
        'يرجى اختيار موظف مسؤول عن الطلب.';

      return;

    }


    const agent =
      this.agents.find(
        item =>
          item.id ===
          this.selectedAgentId
      );


    if (
      !agent
    ) {

      this.assignError =
        'الموظف المحدد غير متاح.';

      return;

    }


    if (
      !this.isAgentAvailable(agent)
    ) {

      const current =
        this.getActiveAssignment(
          this.selectedRequest.id
        );


      if (
        current?.assigned_to !==
        agent.id
      ) {

        this.assignError =
          'الموظف وصل إلى الحد الأقصى للطلبات النشطة.';

        return;

      }

    }


    this.saving = true;

    this.assignError = '';

    this.cdr.markForCheck();


    try {

      const existing =
        this.getActiveAssignment(
          this.selectedRequest.id
        );


      if (
        existing
      ) {

        await this.adminService
          .updateRequestAssignment(
            existing.id!,
            {
              assigned_to:
                this.selectedAgentId,

              reason:
                this.assignmentReason
                  .trim() || null,

              assignment_type:
                'manual'
            }
          );

      } else {

        await this.adminService
          .createRequestAssignment(
            {
              request_id:
                this.selectedRequest.id,

              assigned_to:
                this.selectedAgentId,

              assigned_by:
                null,

              reason:
                this.assignmentReason
                  .trim() || null,

              assignment_type:
                'manual',

              status:
                'assigned'
            }
          );

      }


      this.drawerOpen = false;

      this.selectedRequest = null;


      await this.loadData();


    } catch (error) {

      console.error(
        'Save assignment error:',
        error
      );


      this.assignError =
        'تعذر حفظ توزيع الطلب. يرجى المحاولة مرة أخرى.';


    } finally {

      this.saving = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // STATUS LABELS
  // =========================================================

  getAssignmentStatusLabel(
    status:
      string |
      null |
      undefined
  ): string {

    const labels:
      Record<string, string> = {

        assigned:
          'تم الإسناد',

        in_progress:
          'قيد التنفيذ',

        completed:
          'مكتمل',

        cancelled:
          'ملغي'

      };


    return (
      labels[status || ''] ||
      'غير مسند'
    );

  }


  // =========================================================
  // TRACK BY
  // =========================================================

  trackByRequestId(
    index: number,
    row: any
  ): string | number {

    return (
      row?.id ||
      index
    );

  }


  trackByAgentId(
    index: number,
    agent: any
  ): string | number {

    return (
      agent?.id ||
      index
    );

  }
autoAssigningRequestId: string | null = null;


async autoAssign(
  request: any
): Promise<void> {

  if (
    !request?.id
  ) {
    return;
  }


  this.autoAssigningRequestId =
    request.id;

  this.cdr.markForCheck();


  try {

    await this.adminService
      .autoAssignRequest(
        request.id
      );


    await this.loadData();


  } catch (error: any) {

    console.error(
      'Auto assignment error:',
      error
    );


    if (
      error?.message?.includes(
        'NO_AVAILABLE_AGENT'
      )
    ) {

      alert(
        'لا يوجد موظف متاح حاليًا لاستقبال طلب جديد.'
      );

      return;
    }


    alert(
      'تعذر تنفيذ التوزيع التلقائي.'
    );


  } finally {

    this.autoAssigningRequestId =
      null;

    this.cdr.markForCheck();

  }

}
}