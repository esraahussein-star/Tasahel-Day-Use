import {
  inject
} from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  AuthService
} from '../services/auth.service';


export const accountRoleGuard:
  CanActivateFn =
    async () => {

      const authService =
        inject(AuthService);

      const router =
        inject(Router);


      if (
        !authService.isBrowser()
      ) {

        return true;

      }


      const user =
        await authService
          .getCurrentAdminUser();


      if (
        user
        &&
        user.active === true
        &&
        user.role === 'account'
      ) {

        return true;

      }


      return router.createUrlTree([
        '/login'
      ]);

    };