import {
  Routes
} from '@angular/router';

import {
  DayUsePageComponent
} from './day-use-page/day-use-page';

import {
  LoginComponent
} from './auth/login/login';


import {
  authGuard
} from './guards/auth.guard';

import {
  adminRoleGuard
} from './guards/role.guard';

import {
  agentRoleGuard
} from './guards/agent-role.guard';

import {
  managerRoleGuard
} from './guards/manager-role.guard';

import {
  accountRoleGuard
} from './guards/account-role.guard';


// =========================================================
// ADMIN
// =========================================================

import {
  AdminLayoutComponent
} from './admin/admin-layout/admin-layout';

import {
  AdminDashboardComponent
} from './admin/dashboard/dashboard';

import {
  AdminChatsComponent
} from './admin/chats/chats';

import {
  AdminRequestsComponent
} from './admin/requests/requests';

// import {
//   AdminPlacesComponent
// } from './admin/places/places';

import {
  AdminLogsComponent
} from './admin/logs/logs';

import {
  KnowledgeManagementComponent
} from './admin/knowledge-management/knowledge-management';

import {
  KnowledgePlaceComponent
} from './admin/knowledge-place/knowledge-place';

import {
  AdminTeamComponent
} from './admin/team/team';

import {
  AdminAssignmentsComponent
} from './admin/assignments/assignments';

import {
  AdminUsersComponent
} from './admin/admin-users/admin-users';


// =========================================================
// AGENT
// =========================================================

import {
  AgentLayoutComponent
} from './agent/agent-layout/agent-layout';

import {
  AgentDashboardComponent
} from './agent/agent-dashboard/agent-dashboard';

import {
  AgentRequestsComponent
} from './agent/agent-requests/agent-requests';

import {
  AgentPlacesComponent
} from './agent/places/agent-places';

import {
  AgentPlaceDetailsComponent
} from './agent/place-details/agent-place-details';


// =========================================================
// MANAGER
// =========================================================

import {
  ManagerLayoutComponent
} from './manager/manager-layout/manager-layout';

import {
  ManagerDashboardComponent
} from './manager/manager-dashboard/manager-dashboard';


// =========================================================
// ACCOUNT
// =========================================================

import {
  AccountLayoutComponent
} from './accounts/account-layout/account-layout';

import {
  AccountDashboardComponent
} from './accounts/account-dashboard/account-dashboard';

import {
  AccountRequestsComponent
} from './accounts/account-requests/account-requests';

import {
  AccountPricesComponent
} from './accounts/account-prices/account-prices';

import {
  AccountPaymentMethodsComponent
} from './accounts/account-payment-methods/account-payment-methods';


// =========================================================
// ROUTES
// =========================================================

export const routes: Routes = [

  // =======================================================
  // PUBLIC
  // =======================================================

  {
    path: '',
    component: DayUsePageComponent
  },

  {
    path: 'login',
    component: LoginComponent
  },


  // =======================================================
  // ADMIN
  // =======================================================

  {
    path: 'admin',

    component:
      AdminLayoutComponent,

    canActivate: [
      authGuard,
      adminRoleGuard
    ],

    children: [

      {
        path: '',
        component:
          AdminDashboardComponent
      },


      // ---------------------------------------------------
      // CHATS
      // ---------------------------------------------------

      {
        path: 'chats',
        component:
          AdminChatsComponent
      },


      // ---------------------------------------------------
      // REQUESTS
      // ---------------------------------------------------

      {
        path: 'requests',
        component:
          AdminRequestsComponent
      },


      // ---------------------------------------------------
      // PLACES
      // ---------------------------------------------------

      // {
      //   path: 'places',
      //   component:
      //     AdminPlacesComponent
      // },


      // ---------------------------------------------------
      // LOGS
      // ---------------------------------------------------

      {
        path: 'logs',
        component:
          AdminLogsComponent
      },


      // ---------------------------------------------------
      // KNOWLEDGE MANAGEMENT
      // ---------------------------------------------------

      {
        path: 'knowledge-base',
        component:
          KnowledgeManagementComponent
      },


      // ---------------------------------------------------
      // KNOWLEDGE PLACE DETAILS
      // IMPORTANT:
      // This must come after knowledge-base
      // ---------------------------------------------------

      {
        path: 'knowledge-base/:id',
        component:
          KnowledgePlaceComponent
      },


      // ---------------------------------------------------
      // TEAM
      // ---------------------------------------------------

      {
        path: 'team',
        component:
          AdminTeamComponent
      },


      // ---------------------------------------------------
      // ASSIGNMENTS
      // ---------------------------------------------------

      {
        path: 'assignments',
        component:
          AdminAssignmentsComponent
      },


      // ---------------------------------------------------
      // USERS
      // ---------------------------------------------------

      {
        path: 'users',
        component:
          AdminUsersComponent
      }

    ]

  },


  // =======================================================
  // AGENT
  // =======================================================

  {
    path: 'agent',

    component:
      AgentLayoutComponent,

    canActivate: [
      authGuard,
      agentRoleGuard
    ],

    children: [

      {
        path: '',
        component:
          AgentDashboardComponent
      },


      {
        path: 'requests',
        component:
          AgentRequestsComponent
      },


      {
        path: 'places',
        component:
          AgentPlacesComponent
      },


      {
        path: 'places/:id',
        component:
          AgentPlaceDetailsComponent
      }

    ]

  },


  // =======================================================
  // MANAGER
  // =======================================================

  {
    path: 'manager',

    component:
      ManagerLayoutComponent,

    canActivate: [
      authGuard,
      managerRoleGuard
    ],

    children: [

      {
        path: '',
        component:
          ManagerDashboardComponent
      }

    ]

  },


  // =======================================================
  // ACCOUNT
  // =======================================================

  {
    path: 'account',

    component:
      AccountLayoutComponent,

    canActivate: [
      authGuard,
      accountRoleGuard
    ],

    children: [

      {
        path: '',
        component:
          AccountDashboardComponent
      },


      {
        path: 'requests',
        component:
          AccountRequestsComponent
      },


      {
        path: 'prices',
        component:
          AccountPricesComponent
      },


      {
        path: 'payment-methods',
        component:
          AccountPaymentMethodsComponent
      }

    ]

  },


  // =======================================================
  // FALLBACK
  // =======================================================

  {
    path: '**',
    redirectTo: ''
  }

];