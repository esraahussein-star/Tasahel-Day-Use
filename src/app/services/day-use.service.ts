import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Place } from '../models/place.model';

@Injectable({
  providedIn: 'root'
})
export class DayUseService {

  constructor(private supabaseService: SupabaseService) {}

  async loadPlaces(): Promise<Place[]> {
    const { data, error } = await this.supabaseService.client
      .from('places')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error loading places:', error);
      throw error;
    }

    return (data ?? []) as Place[];
  }
}