import {
  Injectable
} from '@angular/core';

import {
  SupabaseService
} from '../../services/supabase.service';


@Injectable({
  providedIn: 'root'
})
export class AdminKnowledgeService {

  constructor(
    private supabaseService:
      SupabaseService
  ) {}


  private get supabase() {
    return this.supabaseService.client;
  }


  // =========================================================
  // PLACES
  // =========================================================

  async getPlaces():
    Promise<any[]> {

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
      )
      .order(
        'name',
        {
          ascending: true
        }
      );


    if (error) {

      console.error(
        'Admin places error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // SINGLE PLACE
  // =========================================================

  async getPlaceById(
    placeId: string
  ):
    Promise<any | null> {

    const {
      data,
      error
    } = await this.supabase
      .from('places')
      .select('*')
      .eq(
        'id',
        placeId
      )
      .maybeSingle();


    if (error) {

      console.error(
        'Admin place details error:',
        error
      );

      throw error;
    }


    return data;
  }


  // =========================================================
  // CREATE PLACE
  // =========================================================

  async createPlace(
    payload: {
      name: string;
      area: string;
      price: number;
      cost_price?: number;
      image?: string | null;
      description?: string | null;
      tags?: string[];
      active?: boolean;
      sort_order?: number;
    }
  ):
    Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('places')
      .insert({

        name:
          payload.name,

        area:
          payload.area,

        price:
          Number(
            payload.price || 0
          ),

        cost_price:
          Number(
            payload.cost_price || 0
          ),

        image:
          payload.image || null,

        description:
          payload.description || null,

        tags:
          payload.tags || [],

        services:
          [],

        packages:
          [],

        extras:
          [],

        active:
          payload.active !== false,

        sort_order:
          Number(
            payload.sort_order || 0
          )

      })
      .select('*')
      .single();


    if (error) {

      console.error(
        'Create place error:',
        error
      );

      throw error;
    }


    return data;
  }


  // =========================================================
  // UPDATE PLACE
  // =========================================================

  async updatePlace(
    placeId: string,
    payload: {
      name?: string;
      area?: string;
      price?: number;
      cost_price?: number;
      image?: string | null;
      description?: string | null;
      tags?: string[];
      active?: boolean;
      sort_order?: number;
    }
  ):
    Promise<any> {

    const updatePayload: any = {

      ...payload,

      updated_at:
        new Date().toISOString()

    };


    if (
      payload.price !== undefined
    ) {

      updatePayload.price =
        Number(
          payload.price
        );

    }


    if (
      payload.cost_price !== undefined
    ) {

      updatePayload.cost_price =
        Number(
          payload.cost_price
        );

    }


    if (
      payload.sort_order !== undefined
    ) {

      updatePayload.sort_order =
        Number(
          payload.sort_order
        );

    }


    const {
      data,
      error
    } = await this.supabase
      .from('places')
      .update(
        updatePayload
      )
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
  // TOGGLE PLACE
  // =========================================================

  async togglePlace(
    placeId: string,
    active: boolean
  ):
    Promise<any> {

    return this.updatePlace(
      placeId,
      {
        active
      }
    );

  }


  // =========================================================
  // DELETE PLACE
  // =========================================================

  async deletePlace(
    placeId: string
  ):
    Promise<void> {

    const {
      error
    } = await this.supabase
      .from('places')
      .delete()
      .eq(
        'id',
        placeId
      );


    if (error) {

      console.error(
        'Delete place error:',
        error
      );

      throw error;
    }

  }


  // =========================================================
  // UPDATE PACKAGES
  // =========================================================

  async updatePackages(
    placeId: string,
    packages: any[]
  ):
    Promise<any> {

    return this.updatePlace(
      placeId,
      {
        packages
      } as any
    );

  }


  // =========================================================
  // UPDATE SERVICES
  // =========================================================

  async updateServices(
    placeId: string,
    services: any[]
  ):
    Promise<any> {

    return this.updatePlace(
      placeId,
      {
        services
      } as any
    );

  }


  // =========================================================
  // UPDATE EXTRAS
  // =========================================================

  async updateExtras(
    placeId: string,
    extras: any[]
  ):
    Promise<any> {

    return this.updatePlace(
      placeId,
      {
        extras
      } as any
    );

  }


  // =========================================================
  // KNOWLEDGE BASE
  // =========================================================

  async getPlaceKnowledge(
    placeId: string
  ):
    Promise<any[]> {

    const {
      data,
      error
    } = await this.supabase
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
      .eq(
        'place_id',
        placeId
      )
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
        'Admin knowledge error:',
        error
      );

      throw error;
    }


    return data || [];
  }


  // =========================================================
  // CREATE KNOWLEDGE
  // =========================================================

 async createKnowledge(
  payload: {
    place_id: string;
    title: string;
    category: string;
    content: string;
    keywords?: string[];
    active?: boolean;
    priority?: number;
  }
):
  Promise<any> {

  console.log(
    'CREATE KNOWLEDGE PAYLOAD:',
    payload
  );


  const insertPayload = {

    place_id:
      payload.place_id,

    title:
      payload.title,

    category:
      'faq',

    content:
      payload.content,

    keywords:
      payload.keywords || [],

    active:
      payload.active !== false,

    priority:
      Number(
        payload.priority || 0
      )

  };


  console.log(
    'FINAL KNOWLEDGE INSERT:',
    insertPayload
  );


  const {
    data,
    error
  } = await this.supabase
    .from('knowledge_base')
    .insert(
      insertPayload
    )
    .select('*')
    .single();


  if (error) {

    console.error(
      'Create knowledge error:',
      {
        code:
          error?.code,

        message:
          error?.message,

        details:
          error?.details,

        hint:
          error?.hint
      }
    );

    throw error;
  }


  return data;

}

  // =========================================================
  // UPDATE KNOWLEDGE
  // =========================================================

  async updateKnowledge(
    knowledgeId: string,
    payload: {
      title?: string;
      category?: string;
      content?: string;
      keywords?: string[];
      active?: boolean;
      priority?: number;
    }
  ):
    Promise<any> {

    const {
      data,
      error
    } = await this.supabase
      .from('knowledge_base')
      .update({

        ...payload,

        updated_at:
          new Date().toISOString()

      })
      .eq(
        'id',
        knowledgeId
      )
      .select('*')
      .single();


    if (error) {

      console.error(
        'Update knowledge error:',
        error
      );

      throw error;
    }


    return data;
  }


  // =========================================================
  // TOGGLE KNOWLEDGE
  // =========================================================

  async toggleKnowledge(
    knowledgeId: string,
    active: boolean
  ):
    Promise<any> {

    return this.updateKnowledge(
      knowledgeId,
      {
        active
      }
    );

  }


  // =========================================================
  // DELETE KNOWLEDGE
  // =========================================================

  async deleteKnowledge(
    knowledgeId: string
  ):
    Promise<void> {

    const {
      error
    } = await this.supabase
      .from('knowledge_base')
      .delete()
      .eq(
        'id',
        knowledgeId
      );


    if (error) {

      console.error(
        'Delete knowledge error:',
        error
      );

      throw error;
    }

  }

}