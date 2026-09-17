import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  AuthService
} from '../../services/auth.service';

import {
  AdminDashboardService
} from '../../admin/services/admin-dashboard.service';


@Component({
  selector: 'app-manager-dashboard',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl: './manager-dashboard.html',

  styleUrl: './manager-dashboard.css'
})
export class ManagerDashboardComponent implements OnInit {

  currentUser: any = null;

  agents: any[] = [];

  assignments: any[] = [];

  requests: any[] = [];

  loading = true;

  errorMessage = '';


  constructor(
    private authService: AuthService,
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

      const user =
        await this.authService
          .getCurrentAdminUser();


      if (
        !user ||
        user.role !== 'manager'
      ) {

        throw new Error(
          'INVALID_MANAGER_USER'
        );

      }


      this.currentUser = user;


      const [
        usersResult,
        assignmentsResult,
        requestsResult
      ] = await Promise.all([

        this.adminService
          .getAdminUsers(),

        this.adminService
          .getRequestAssignments(),

        this.adminService
          .getAllRequests()

      ]);


      this.agents =
        (usersResult || [])
          .filter(
            user =>
              user.role === 'agent'
          );


      this.assignments =
        assignmentsResult || [];


      this.requests =
        requestsResult || [];


    } catch (error) {

      console.error(
        'Manager dashboard error:',
        error
      );


      this.errorMessage =
        'تعذر تحميل لوحة المدير.';


    } finally {

      this.loading = false;

      this.cdr.markForCheck();

    }

  }


  // =========================================================
  // AGENT STATS
  // =========================================================

  getAgentAssignments(
    agentId: string
  ): any[] {

    return this.assignments.filter(
      assignment =>
        assignment.assigned_to ===
        agentId
    );

  }


  getAgentAssignedCount(
    agentId: string
  ): number {

    return this.getAgentAssignments(
      agentId
    ).filter(
      assignment =>
        assignment.status ===
        'assigned'
    ).length;

  }


  getAgentInProgressCount(
    agentId: string
  ): number {

    return this.getAgentAssignments(
      agentId
    ).filter(
      assignment =>
        assignment.status ===
        'in_progress'
    ).length;

  }


  getAgentCompletedCount(
    agentId: string
  ): number {

    return this.getAgentAssignments(
      agentId
    ).filter(
      assignment =>
        assignment.status ===
        'completed'
    ).length;

  }


  getAgentActiveCount(
    agentId: string
  ): number {

    return this.getAgentAssignments(
      agentId
    ).filter(
      assignment =>
        assignment.status ===
          'assigned' ||
        assignment.status ===
          'in_progress'
    ).length;

  }


  getAgentCapacity(
    agent: any
  ): number {

    return Number(
      agent?.max_active_requests || 0
    );

  }


  getAgentRemaining(
    agent: any
  ): number {

    return Math.max(
      0,
      this.getAgentCapacity(agent) -
      this.getAgentActiveCount(agent.id)
    );

  }


  getAgentLoadPercent(
    agent: any
  ): number {

    const capacity =
      this.getAgentCapacity(agent);


    if (
      capacity <= 0
    ) {

      return 0;

    }


    return Math.min(
      100,
      Math.round(
        (
          this.getAgentActiveCount(agent.id) /
          capacity
        ) * 100
      )
    );

  }


  // =========================================================
  // GLOBAL STATS
  // =========================================================

  get totalAgents(): number {

    return this.agents.length;

  }


  get activeAgents(): number {

    return this.agents.filter(
      agent =>
        agent.active === true
    ).length;

  }


  get totalActiveAssignments(): number {

    return this.assignments.filter(
      assignment =>
        assignment.status ===
          'assigned' ||
        assignment.status ===
          'in_progress'
    ).length;

  }


  get totalCompletedAssignments(): number {

    return this.assignments.filter(
      assignment =>
        assignment.status ===
        'completed'
    ).length;

  }


  get unassignedRequests(): number {

    return this.requests.filter(
      request => {

        const assignment =
          this.assignments.find(
            item =>
              item.request_id ===
                request.id &&
              (
                item.status ===
                  'assigned' ||
                item.status ===
                  'in_progress'
              )
          );


        return !assignment;

      }
    ).length;

  }


  // =========================================================
  // STATUS
  // =========================================================

  getAgentStatusLabel(
    agent: any
  ): string {

    if (
      !agent.active
    ) {

      return 'غير نشط';

    }


    const active =
      this.getAgentActiveCount(
        agent.id
      );


    const capacity =
      this.getAgentCapacity(
        agent
      );


    if (
      capacity > 0 &&
      active >= capacity
    ) {

      return 'ممتلئ';

    }


    if (
      active === 0
    ) {

      return 'متاح';

    }


    return 'يعمل حاليًا';

  }


  // =========================================================
  // TRACK BY
  // =========================================================

  trackByAgentId(
    index: number,
    agent: any
  ): string | number {

    return (
      agent?.id ||
      index
    );

  }

}