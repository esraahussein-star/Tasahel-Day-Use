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


export const authGuard:
  CanActivateFn =
    async () => {

      const authService =
        inject(AuthService);

      const router =
        inject(Router);


      /*
       * أثناء SSR لا نعمل redirect.
       * الـbrowser هو اللي يتحقق من الجلسة الحقيقية.
       */

      if (
        !authService.isBrowser()
      ) {

        return true;

      }


      const session =
        await authService
          .getSession();


      if (
        session?.user
      ) {

        return true;

      }


      return router.createUrlTree([
        '/login'
      ]);

    };