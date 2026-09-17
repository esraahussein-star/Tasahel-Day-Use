import { Injectable } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AgentWorkspaceService {

  constructor(
    private supabaseService: SupabaseService
  ) {}

  private get supabase() {
    return this.supabaseService.client;
  }

  // =========================================================
  // ASSIGNMENTS
  // =========================================================

  async getMyAssignments(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('request_assignments')
      .select('*')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Agent assignments error:', error);
      throw error;
    }

    return data || [];
  }

  // =========================================================
  // REQUESTS
  // =========================================================

  async getMyRequests(requestIds: string[]): Promise<any[]> {
    if (requestIds.length === 0) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('day_use_requests')
      .select('*')
      .in('id', requestIds)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Agent requests error:', error);
      throw error;
    }

    return data || [];
  }

  async updateRequest(
    requestId: string,
    payload: any
  ): Promise<any> {
    const { data, error } = await this.supabase
      .from('day_use_requests')
      .update(payload)
      .eq('id', requestId)
      .select('*')
      .single();

    if (error) {
      console.error('Update request error:', error);
      throw error;
    }

    return data;
  }

  // =========================================================
  // ASSIGNMENT STATUS
  // =========================================================

  async updateAssignmentStatus(
    assignmentId: string,
    status: 'assigned' | 'in_progress' | 'completed' | 'cancelled',
    actorId: string
  ): Promise<any> {
    const { data, error } = await this.supabase.rpc(
      'update_assignment_status',
      {
        p_assignment_id: assignmentId,
        p_new_status: status,
        p_actor_id: actorId
      }
    );

    if (error) {
      console.error('Assignment status error:', error);
      throw error;
    }

    return data;
  }

  // =========================================================
  // COMPLETE REQUEST
  // =========================================================

  async completeRequest(
    requestId: string,
    assignmentId: string,
    actorId: string
  ): Promise<void> {
    const { error: requestError } = await this.supabase
      .from('day_use_requests')
      .update({
        status: 'completed',
        workflow_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (requestError) {
      console.error('Complete request error:', requestError);
      throw requestError;
    }

    await this.updateAssignmentStatus(
      assignmentId,
      'completed',
      actorId
    );
  }

  // =========================================================
  // NOTES
  // =========================================================

  async getRequestNotes(requestId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('request_notes')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Request notes error:', error);
      throw error;
    }

    return data || [];
  }

  async createRequestNote(payload: {
    request_id: string;
    user_id: string;
    note_type: string;
    content: string;
  }): Promise<any> {
    const { data, error } = await this.supabase
      .from('request_notes')
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Create request note error:', error);
      throw error;
    }

    return data;
  }

  // =========================================================
  // NOTIFICATIONS
  // =========================================================

  async getNotifications(userId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('admin_notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Notifications error:', error);
      throw error;
    }

    return data || [];
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const { error } = await this.supabase
      .from('admin_notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);

    if (error) {
      throw error;
    }
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('admin_notifications')
      .update({
        read: true,
        read_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      throw error;
    }
  }

  subscribeToNotifications(
    userId: string,
    callback: (notification: any) => void
  ): RealtimeChannel {
    return this.supabase
      .channel(`agent-notifications-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
          filter: `user_id=eq.${userId}`
        },
        payload => callback(payload.new)
      )
      .subscribe();
  }

  async removeChannel(
    channel: RealtimeChannel | null
  ): Promise<void> {
    if (!channel) {
      return;
    }

    await this.supabase.removeChannel(channel);
  }

  // =========================================================
  // CUSTOMER CHAT - NEW
  // =========================================================

  async getRequestChat(requestId: string): Promise<any> {
    const { data, error } = await this.supabase.rpc(
      'agent_get_request_chat',
      {
        p_request_id: requestId
      }
    );

    if (error) {
      console.error('Agent request chat error:', error);
      throw error;
    }

    return data || {
      session: null,
      messages: []
    };
  }

  async takeRequestChat(requestId: string): Promise<any> {
    const { data, error } = await this.supabase.rpc(
      'agent_take_request_chat',
      {
        p_request_id: requestId
      }
    );

    if (error) {
      console.error('Take request chat error:', error);
      throw error;
    }

    return data;
  }

  async sendRequestChatMessage(
    requestId: string,
    message: string
  ): Promise<string | null> {
    const { data, error } = await this.supabase.rpc(
      'agent_send_request_message',
      {
        p_request_id: requestId,
        p_message: message
      }
    );

    if (error) {
      console.error('Send request chat message error:', error);
      throw error;
    }

    return data || null;
  }

  async releaseRequestChat(requestId: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc(
      'agent_release_request_chat',
      {
        p_request_id: requestId
      }
    );

    if (error) {
      console.error('Release request chat error:', error);
      throw error;
    }

    return Boolean(data);
  }

  subscribeToRequestChat(
    sessionId: string,
    onMessage: (message: any) => void,
    onSessionUpdate: (session: any) => void
  ): RealtimeChannel {
    return this.supabase
      .channel(`agent-request-chat-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        payload => onMessage(payload.new)
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_sessions',
          filter: `id=eq.${sessionId}`
        },
        payload => onSessionUpdate(payload.new)
      )
      .subscribe();
  }

  // =========================================================
  // PLACES
  // =========================================================

  async getPlaces(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('places')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Agent places error:', error);
      throw error;
    }

    return data || [];
  }

  async getPlaceById(placeId: string): Promise<any | null> {
    const { data, error } = await this.supabase
      .from('places')
      .select('*')
      .eq('id', placeId)
      .eq('active', true)
      .maybeSingle();

    if (error) {
      console.error('Agent place details error:', error);
      throw error;
    }

    return data;
  }

  async getPlaceKnowledge(placeId: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('knowledge_base')
      .select(`
        id,
        title,
        category,
        content,
        keywords,
        place_id,
        active,
        priority,
        created_at,
        updated_at
      `)
      .eq('place_id', placeId)
      .eq('active', true)
      .order('priority', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Place knowledge error:', error);
      throw error;
    }

    return data || [];
  }

  // =========================================================
  // AGENT CHAT MEDIA
  // =========================================================

  async uploadRequestChatMedia(
    requestId: string,
    sessionId: string,
    file: File,
    messageType: 'image' | 'voice',
    durationSeconds: number | null = null
  ): Promise<any> {
    const extension = (
      file.name.split('.').pop() ||
      (messageType === 'image' ? 'jpg' : 'webm')
    )
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    const storageName =
      `${Date.now()}-${crypto.randomUUID()}.${extension || (messageType === 'image' ? 'jpg' : 'webm')}`;

    const mediaPath =
      `${requestId}/${sessionId}/agent/${storageName}`;

    const { error: uploadError } =
      await this.supabase.storage
        .from('chat-media')
        .upload(mediaPath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined
        });

    if (uploadError) {
      console.error('Agent chat media storage error:', uploadError);
      throw uploadError;
    }

    try {
      const { data, error: rpcError } =
        await this.supabase.rpc(
          'agent_send_request_chat_media',
          {
            p_request_id: requestId,
            p_message_type: messageType,
            p_media_path: mediaPath,
            p_media_name: file.name,
            p_media_mime_type: file.type || (messageType === 'image' ? 'image/jpeg' : 'audio/webm'),
            p_media_duration_seconds: durationSeconds
          }
        );

      if (rpcError) {
        console.error('Agent chat media RPC error:', {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint
        });
        throw rpcError;
      }

      const signedUrl =
        await this.createChatMediaSignedUrl(mediaPath);

      return {
        ...(data || {}),
        media_path: mediaPath,
        media_name: file.name,
        media_mime_type: file.type || '',
        media_duration_seconds: durationSeconds,
        message_type: messageType,
        media_url: signedUrl
      };

    } catch (error) {
      await this.supabase.storage
        .from('chat-media')
        .remove([mediaPath]);

      throw error;
    }
  }

  async getRequestChatMedia(requestId: string): Promise<any[]> {
    const { data, error } = await this.supabase.rpc(
      'agent_get_request_chat_media',
      { p_request_id: requestId }
    );

    if (error) {
      console.error('Agent get chat media error:', error);
      throw error;
    }

    return Array.isArray(data) ? data : [];
  }

  async createChatMediaSignedUrl(
    mediaPath: string,
    expiresInSeconds = 60 * 60
  ): Promise<string | null> {
    const { data, error } =
      await this.supabase.storage
        .from('chat-media')
        .createSignedUrl(mediaPath, expiresInSeconds);

    if (error) {
      console.error('Chat media signed URL error:', error);
      return null;
    }

    return data?.signedUrl || null;
  }

}
