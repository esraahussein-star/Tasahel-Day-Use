import {
  Injectable,
  PLATFORM_ID,
  inject
} from '@angular/core';

import {
  isPlatformBrowser
} from '@angular/common';

import {
  createClient,
  SupabaseClient
} from '@supabase/supabase-js';

import {
  environment
} from '../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class SupabaseService {

  private readonly supabase:
    SupabaseClient;


  constructor() {

    const platformId =
      inject(PLATFORM_ID);


    const isBrowser =
      isPlatformBrowser(
        platformId
      );


    this.supabase =
      createClient(
        environment.supabaseUrl,
        environment.supabaseAnonKey,
        {
          auth: {

            persistSession:
              isBrowser,

            autoRefreshToken:
              isBrowser,

            detectSessionInUrl:
              isBrowser,

            storage:
              isBrowser
                ? window.localStorage
                : undefined

          }
        }
      );

  }


  get client():
    SupabaseClient {

    return this.supabase;

  }

}