import { Injectable } from '@angular/core';

import {
  SupabaseService
} from '../../services/supabase.service';


@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {

  constructor(
    private supabaseService: SupabaseService
  ) {}


  private get supabase() {
    return this.supabaseService.client;
  }


  // =========================================================
  // OVERVIEW
  // =========================================================

  async getTodayOverview(): Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('admin_today_overview')
      .select('*')
      .single();


    if (error) {

      console.error(
        'Overview error:',
        error
      );

      throw error;
    }


    return data;
  }


  // =========================================================
  // DASHBOARD STATS
  // =========================================================

  async getDashboardStats(): Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('admin_dashboard_stats')
      .select('*')
      .maybeSingle();


    if (error) {

      console.error(
        'Dashboard stats error:',
        error
      );

      throw error;
    }


    return data || {

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


  // =========================================================
  // RECENT CHAT SESSIONS
  // =========================================================

  async getRecentSessions(): Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('admin_sessions')
      .select('*')
      .order(
        'last_activity_at',
        {
          ascending: false
        }
      )
      .limit(10);


    if (error) {

      console.error(
        'Sessions error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // ALL CHAT SESSIONS
  // =========================================================

  async getAllSessions(): Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('admin_sessions')
      .select('*')
      .order(
        'last_activity_at',
        {
          ascending: false
        }
      );


    if (error) {

      console.error(
        'All sessions error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // SESSION MESSAGES
  // =========================================================

  async getSessionMessages(
    sessionId: string
  ): Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq(
        'session_id',
        sessionId
      )
      .order(
        'created_at',
        {
          ascending: true
        }
      );


    if (error) {

      console.error(
        'Session messages error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // RECENT REQUESTS
  // =========================================================

  async getRecentRequests(): Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('admin_requests')
      .select('*')
      .order(
        'created_at',
        {
          ascending: false
        }
      )
      .limit(10);


    if (error) {

      console.error(
        'Requests error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // ALL REQUESTS
  // =========================================================

  async getAllRequests(): Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('admin_requests')
      .select('*')
      .order(
        'created_at',
        {
          ascending: false
        }
      );


    if (error) {

      console.error(
        'All requests error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // REQUEST EVENTS
  // =========================================================

  async getRequestEvents(): Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('request_events')
      .select('*')
      .order(
        'created_at',
        {
          ascending: false
        }
      );


    if (error) {

      console.error(
        'Request events error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // PLACES
  // =========================================================

  async getAllPlaces(): Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('places')
      .select('*')
      .order(
        'sort_order',
        {
          ascending: true
        }
      );


    if (error) {

      console.error(
        'All places error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // CREATE PLACE
  // =========================================================

  async createPlace(
    payload: any
  ): Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('places')
      .insert(payload)
      .select('*');


    if (error) {

      console.error(
        'Create place error:',
        error
      );

      throw error;
    }


    if (
      !data ||
      data.length === 0
    ) {

      console.error(
        'Insert returned 0 rows.',
        payload
      );


      throw new Error(
        'لم يتم إنشاء المكان. المستخدم الحالي لا يملك صلاحية الإضافة.'
      );
    }


    return data[0];
  }


  // =========================================================
  // UPDATE PLACE
  // =========================================================

 async updatePlace(
  placeId: string,
  payload: any
):
  Promise<any> {

  // =========================================================
  // VERIFY SESSION BEFORE UPDATE
  // =========================================================

  const {
    data: sessionData,
    error: sessionError
  } = await this.supabase.auth
    .getSession();


  if (sessionError) {

    console.error(
      'Update place session error:',
      sessionError
    );

    throw sessionError;

  }


  let session =
    sessionData.session;


  // =========================================================
  // TRY REFRESHING SESSION
  // =========================================================

  if (!session?.access_token) {

    const {
      data: refreshedData,
      error: refreshError
    } = await this.supabase.auth
      .refreshSession();


    if (refreshError) {

      console.error(
        'Refresh session error:',
        refreshError
      );

    }


    session =
      refreshedData.session;

  }


  console.log(
    'UPDATE PLACE AUTH:',
    {
      hasSession:
        !!session,

      userId:
        session?.user?.id,

      role:
        session?.user?.role,

      expiresAt:
        session?.expires_at
    }
  );


  if (
    !session?.user?.id
    ||
    !session?.access_token
  ) {

    throw new Error(
      'No authenticated session available for updating place.'
    );

  }


  // =========================================================
  // UPDATE
  // =========================================================

  const {
    data,
    error
  } = await this.supabase
    .from('places')
    .update(payload)
    .eq(
      'id',
      placeId
    )
    .select('*')
    .single();


  if (error) {

    console.error(
      'Update place error:',
      error
    );

    throw error;

  }


  return data;

}


  // =========================================================
  // KNOWLEDGE BASE
  // =========================================================

  async getKnowledgeBase(): Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
      .from('knowledge_base')
      .select('*')
      .order(
        'priority',
        {
          ascending: false
        }
      )
      .order(
        'updated_at',
        {
          ascending: false
        }
      );


    if (error) {

      console.error(
        'Knowledge base loading error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // CREATE KNOWLEDGE ITEM
  // =========================================================

  async createKnowledgeItem(
    payload: any
  ): Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('knowledge_base')
      .insert(payload)
      .select('*');


    if (error) {

      console.error(
        'Create knowledge item error:',
        error
      );

      throw error;
    }


    if (
      !data ||
      data.length === 0
    ) {

      console.error(
        'Knowledge insert returned 0 rows.',
        payload
      );


      throw new Error(
        'لم يتم إنشاء المحتوى. المستخدم الحالي لا يملك صلاحية الإضافة.'
      );
    }


    return data[0];
  }


  // =========================================================
  // UPDATE KNOWLEDGE ITEM
  // =========================================================

  async updateKnowledgeItem(
    itemId: string,
    payload: any
  ): Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('knowledge_base')
      .update(payload)
      .eq(
        'id',
        itemId
      )
      .select('*');


    if (error) {

      console.error(
        'Update knowledge item error:',
        error
      );

      throw error;
    }


    if (
      !data ||
      data.length === 0
    ) {

      console.error(
        'Knowledge update returned 0 rows.',
        {
          itemId,
          payload
        }
      );


      throw new Error(
        'لم يتم تعديل المحتوى. المستخدم الحالي لا يملك صلاحية التعديل.'
      );
    }


    return data[0];
  }


  // =========================================================
  // TOGGLE KNOWLEDGE ITEM
  // =========================================================

  async toggleKnowledgeItem(
    itemId: string,
    active: boolean
  ): Promise<any> {

    return this.updateKnowledgeItem(
      itemId,
      {
        active
      }
    );
  }


  // =========================================================
  // DELETE KNOWLEDGE ITEM
  // =========================================================

  async deleteKnowledgeItem(
    itemId: string
  ): Promise<void> {

    const {
      data,
      error
    } = await this.supabase
      .from('knowledge_base')
      .delete()
      .eq(
        'id',
        itemId
      )
      .select('id');


    if (error) {

      console.error(
        'Delete knowledge item error:',
        error
      );

      throw error;
    }


    if (
      !data ||
      data.length === 0
    ) {

      throw new Error(
        'لم يتم حذف المحتوى. المستخدم الحالي لا يملك صلاحية الحذف.'
      );
    }
  }
// =========================================================
// ADMIN USERS
// =========================================================

async getAdminUsers(): Promise<any[]> {

  const {
    data,
    error
  } = await this.supabase
    .from('admin_users')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      'Admin users loading error:',
      error
    );

    throw error;
  }


  return data || [];
}


// =========================================================
// CREATE ADMIN USER
// =========================================================

async createAdminUser(
  payload: any
): Promise<any> {

  const {
    data,
    error
  } = await this.supabase
    .from('admin_users')
    .insert(payload)
    .select('*');


  if (error) {

    console.error(
      'Create admin user error:',
      error
    );

    throw error;
  }


  if (
    !data ||
    data.length === 0
  ) {

    console.error(
      'Admin user insert returned 0 rows.',
      payload
    );

    throw new Error(
      'لم يتم إنشاء المستخدم. المستخدم الحالي لا يملك صلاحية الإضافة.'
    );
  }


  return data[0];
}


// =========================================================
// UPDATE ADMIN USER
// =========================================================

async updateAdminUser(
  userId: string,
  payload: any
): Promise<any> {

  const {
    data,
    error
  } = await this.supabase
    .from('admin_users')
    .update(payload)
    .eq(
      'id',
      userId
    )
    .select('*');


  if (error) {

    console.error(
      'Update admin user error:',
      error
    );

    throw error;
  }


  if (
    !data ||
    data.length === 0
  ) {

    console.error(
      'Admin user update returned 0 rows.',
      {
        userId,
        payload
      }
    );

    throw new Error(
      'لم يتم تعديل المستخدم. المستخدم الحالي لا يملك صلاحية التعديل.'
    );
  }


  return data[0];
}
// =========================================================
// TOGGLE ADMIN USER
// =========================================================

async toggleAdminUser(
  userId: string,
  active: boolean
): Promise<any> {

  return this.updateAdminUser(
    userId,
    {
      active
    }
  );
}


// =========================================================
// DELETE ADMIN USER
// =========================================================

async deleteAdminUser(
  userId: string
): Promise<void> {

  const {
    data,
    error
  } = await this.supabase
    .from('admin_users')
    .delete()
    .eq(
      'id',
      userId
    )
    .select('id');


  if (error) {

    console.error(
      'Delete admin user error:',
      error
    );

    throw error;
  }


  if (
    !data ||
    data.length === 0
  ) {

    throw new Error(
      'لم يتم حذف المستخدم. المستخدم الحالي لا يملك صلاحية الحذف.'
    );
  }
}
async getRequestAssignments(): Promise<any[]> {

  const {
    data,
    error
  } = await this.supabase
    .from('request_assignments')
    .select('*')
    .order(
      'created_at',
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      'Request assignments error:',
      error
    );

    throw error;

  }


  return data || [];
}


async createRequestAssignment(
  payload: any
): Promise<any> {

  const {
    data,
    error
  } = await this.supabase
    .from('request_assignments')
    .insert(payload)
    .select('*');


  if (error) {

    console.error(
      'Create request assignment error:',
      error
    );

    throw error;

  }


  if (
    !data ||
    data.length === 0
  ) {

    throw new Error(
      'لم يتم إنشاء الإسناد.'
    );

  }


  return data[0];
}


async updateRequestAssignment(
  assignmentId: string,
  payload: any
): Promise<any> {

  const {
    data,
    error
  } = await this.supabase
    .from('request_assignments')
    .update(payload)
    .eq(
      'id',
      assignmentId
    )
    .select('*');


  if (error) {

    console.error(
      'Update request assignment error:',
      error
    );

    throw error;

  }


  if (
    !data ||
    data.length === 0
  ) {

    throw new Error(
      'لم يتم تعديل الإسناد.'
    );

  }


  return data[0];
}
async autoAssignRequest(
  requestId: string
): Promise<any> {

  const {
    data,
    error
  } = await this.supabase
    .rpc(
      'auto_assign_request',
      {
        p_request_id: requestId
      }
    );


  if (error) {

    console.error(
      'Auto assign request error:',
      error
    );

    throw error;
  }


  return data;
}
// =========================================================
// UPDATE ASSIGNMENT STATUS
// =========================================================

async updateAssignmentStatus(
  assignmentId: string,
  status:
    | 'assigned'
    | 'in_progress'
    | 'completed'
    | 'cancelled',
  actorId: string | null = null
): Promise<any> {

  const {
    data,
    error
  } = await this.supabase
    .rpc(
      'update_assignment_status',
      {
        p_assignment_id:
          assignmentId,

        p_new_status:
          status,

        p_actor_id:
          actorId
      }
    );


  if (error) {

    console.error(
      'Update assignment status error:',
      error
    );

    throw error;
  }


  return data;
}
// =========================================================
// ASSIGNMENT EVENTS
// =========================================================

async getAssignmentEvents(
  requestId: string
): Promise<any[]> {

  const {
    data,
    error
  } = await this.supabase
    .from('assignment_events')
    .select('*')
    .eq(
      'request_id',
      requestId
    )
    .order(
      'created_at',
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      'Assignment events error:',
      error
    );

    throw error;
  }


  return data || [];
}
// =========================================================
// USER NOTIFICATIONS
// =========================================================

async getUserNotifications(
  userId: string
): Promise<any[]> {

  const {
    data,
    error
  } = await this.supabase
    .from('admin_notifications')
    .select('*')
    .eq(
      'user_id',
      userId
    )
    .order(
      'created_at',
      {
        ascending: false
      }
    )
    .limit(50);


  if (error) {

    console.error(
      'Notifications loading error:',
      error
    );

    throw error;
  }


  return data || [];
}


// =========================================================
// UNREAD NOTIFICATIONS COUNT
// =========================================================

async getUnreadNotificationsCount(
  userId: string
): Promise<number> {

  const {
    count,
    error
  } = await this.supabase
    .from('admin_notifications')
    .select(
      '*',
      {
        count: 'exact',
        head: true
      }
    )
    .eq(
      'user_id',
      userId
    )
    .eq(
      'read',
      false
    );


  if (error) {

    console.error(
      'Unread notifications count error:',
      error
    );

    throw error;
  }


  return count || 0;
}


// =========================================================
// MARK NOTIFICATION AS READ
// =========================================================

async markNotificationAsRead(
  notificationId: string
): Promise<void> {

  const {
    error
  } = await this.supabase
    .from('admin_notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq(
      'id',
      notificationId
    );


  if (error) {

    console.error(
      'Mark notification read error:',
      error
    );

    throw error;
  }
}


// =========================================================
// MARK ALL NOTIFICATIONS AS READ
// =========================================================

async markAllNotificationsAsRead(
  userId: string
): Promise<void> {

  const {
    error
  } = await this.supabase
    .from('admin_notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq(
      'user_id',
      userId
    )
    .eq(
      'read',
      false
    );


  if (error) {

    console.error(
      'Mark all notifications read error:',
      error
    );

    throw error;
  }
}
async updateDayUseRequest(
  requestId: string,
  payload: any
): Promise<any> {

  const {
    data,
    error
  } = await this.supabase
    .from('day_use_requests')
    .update(payload)
    .eq(
      'id',
      requestId
    )
    .select('*')
    .maybeSingle();


  if (error) {

    console.error(
      'Update day use request error:',
      error
    );

    throw error;

  }


  return data;
}


async getRequestNotes(
  requestId: string
): Promise<any[]> {

  const {
    data,
    error
  } = await this.supabase
    .from('request_notes')
    .select('*')
    .eq(
      'request_id',
      requestId
    )
    .order(
      'created_at',
      {
        ascending: false
      }
    );


  if (error) {

    console.error(
      'Request notes error:',
      error
    );

    throw error;

  }


  return data || [];
}


async createRequestNote(
  payload: any
): Promise<any> {

  const {
    data,
    error
  } = await this.supabase
    .from('request_notes')
    .insert(payload)
    .select('*')
    .maybeSingle();


  if (error) {

    console.error(
      'Create request note error:',
      error
    );

    throw error;

  }


  return data;
}
}