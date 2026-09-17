import {
  Injectable,
  Inject,
  PLATFORM_ID
} from '@angular/core';

import {
  isPlatformBrowser
} from '@angular/common';

import {
  SupabaseService
} from './supabase.service';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(
    private supabaseService:
      SupabaseService,

    @Inject(PLATFORM_ID)
    private platformId:
      Object
  ) {}


  private get supabase() {
    return this.supabaseService.client;
  }


  // =========================================================
  // BROWSER CHECK
  // =========================================================

  isBrowser():
    boolean {

    return isPlatformBrowser(
      this.platformId
    );

  }


  // =========================================================
  // SIGN IN
  // =========================================================

  async signIn(
    email: string,
    password: string
  ):
    Promise<any> {

    const {
      data,
      error
    } = await this.supabase.auth
      .signInWithPassword({

        email:
          email
            .trim()
            .toLowerCase(),

        password

      });


    if (error) {

      console.error(
        'Sign in error:',
        error
      );

      throw error;
    }


    return data;

  }


  // =========================================================
  // SIGN OUT
  // =========================================================

  async signOut():
    Promise<void> {

    const {
      error
    } = await this.supabase.auth
      .signOut();


    if (error) {

      console.error(
        'Sign out error:',
        error
      );

      throw error;
    }

  }


  // =========================================================
  // CURRENT SESSION
  // =========================================================

  async getSession():
    Promise<any | null> {

    /*
     * أثناء SSR لا يوجد browser storage.
     * لذلك لا نحاول اعتبار عدم وجود session
     * على السيرفر logout حقيقي.
     */

    if (!this.isBrowser()) {

      return null;

    }


    const {
      data,
      error
    } = await this.supabase.auth
      .getSession();


    if (error) {

      console.error(
        'Get session error:',
        error
      );

      return null;
    }


    return (
      data?.session
      ||
      null
    );

  }


  // =========================================================
  // CURRENT AUTH USER
  // =========================================================

  async getAuthUser():
    Promise<any | null> {

    if (!this.isBrowser()) {

      return null;

    }


    const session =
      await this.getSession();


    if (
      !session?.user?.id
    ) {

      return null;

    }


    try {

      const {
        data,
        error
      } = await this.supabase.auth
        .getUser();


      if (
        !error
        &&
        data?.user
      ) {

        return data.user;

      }


      if (error) {

        console.warn(
          'Get auth user warning:',
          error
        );

      }


      return session.user;


    } catch (error) {

      console.warn(
        'Get auth user fallback:',
        error
      );


      return session.user;

    }

  }


  // =========================================================
  // CURRENT SYSTEM USER
  // =========================================================

  async getCurrentAdminUser():
    Promise<any | null> {

    if (!this.isBrowser()) {

      return null;

    }


    const authUser =
      await this.getAuthUser();


    if (
      !authUser?.id
    ) {

      return null;

    }


    // -------------------------------------------------------
    // admin_users.id = auth.uid()
    // -------------------------------------------------------

    const {
      data: directProfile,
      error: directError
    } = await this.supabase
      .from('admin_users')
      .select('*')
      .eq(
        'id',
        authUser.id
      )
      .maybeSingle();


    if (directError) {

      console.error(
        'Direct admin profile error:',
        directError
      );

      throw directError;
    }


    if (directProfile) {

      return directProfile;

    }


    // -------------------------------------------------------
    // fallback: admin_users.auth_user_id = auth.uid()
    // -------------------------------------------------------

    const {
      data: linkedProfile,
      error: linkedError
    } = await this.supabase
      .from('admin_users')
      .select('*')
      .eq(
        'auth_user_id',
        authUser.id
      )
      .maybeSingle();


    if (linkedError) {

      console.error(
        'Linked admin profile error:',
        linkedError
      );

      throw linkedError;
    }


    return (
      linkedProfile
      ||
      null
    );

  }


  // =========================================================
  // AUTH STATE
  // =========================================================

  onAuthStateChange(
    callback: (
      event: string,
      session: any
    ) => void
  ) {

    return this.supabase.auth
      .onAuthStateChange(
        (
          event,
          session
        ) => {

          callback(
            event,
            session
          );

        }
      );

  }


  // =========================================================
  // IS LOGGED IN
  // =========================================================

  async isLoggedIn():
    Promise<boolean> {

    if (!this.isBrowser()) {

      return true;

    }


    const session =
      await this.getSession();


    return !!session?.user;

  }


  // =========================================================
  // CURRENT ROLE
  // =========================================================

  async getCurrentRole(): Promise<
    | 'admin'
    | 'manager'
    | 'agent'
    | 'account'
    | null
  > {

    const user =
      await this.getCurrentAdminUser();


    const role =
      user?.role;


    if (
      role === 'admin'
      ||
      role === 'manager'
      ||
      role === 'agent'
      ||
      role === 'account'
    ) {

      return role;

    }


    return null;

  }


  // =========================================================
  // ACTIVE
  // =========================================================

  async isActiveAdminUser():
    Promise<boolean> {

    if (!this.isBrowser()) {

      return true;

    }


    const user =
      await this.getCurrentAdminUser();


    return !!(
      user
      &&
      user.active === true
    );

  }


  // =========================================================
  // ROLE CHECK
  // =========================================================

  async hasRole(
    allowedRoles: string[]
  ):
    Promise<boolean> {

    if (!this.isBrowser()) {

      return true;

    }


    const user =
      await this.getCurrentAdminUser();


    if (
      !user
      ||
      user.active !== true
    ) {

      return false;

    }


    return allowedRoles.includes(
      user.role
    );

  }


  async isAdmin():
    Promise<boolean> {

    return this.hasRole([
      'admin'
    ]);

  }


  async isManager():
    Promise<boolean> {

    return this.hasRole([
      'manager'
    ]);

  }


  async isAgent():
    Promise<boolean> {

    return this.hasRole([
      'agent'
    ]);

  }


  async isAccount():
    Promise<boolean> {

    return this.hasRole([
      'account'
    ]);

  }

}