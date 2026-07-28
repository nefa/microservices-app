import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeng/themes/aura';

import { routes } from './app.routes';
import { authInterceptor } from './auth/auth-interceptor';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // provideHttpClient is the standalone-app equivalent of importing
    // HttpClientModule the old way - required by any component/service
    // that calls the gateway API (the login form we're about to build).
    // withFetch() switches HttpClient's transport to the native Fetch API
    // instead of XMLHttpRequest - the modern recommended default.
    // withInterceptors registers authInterceptor to run on every outgoing
    // HttpClient request - the functional-interceptor equivalent of
    // adding middleware to a pipeline, but scoped to just HTTP requests.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    // providePrimeNG wires up PrimeNG's component theming globally, once,
    // instead of per-component. Aura is one of PrimeNG's built-in design
    // presets (others: Lara, Nora) - controls colors/spacing/etc. for
    // every PrimeNG component used anywhere in the app.
    //
    // The license key comes from environment.ts, which Angular's build
    // system physically swaps out per configuration (see angular.json's
    // "development" fileReplacements) - `ng serve` gets the real key from
    // the gitignored environment.development.ts, while this imported
    // symbol/path never changes. Note this doesn't make the key secret at
    // runtime (it still ends up in the shipped JS bundle, readable by
    // anyone) - it only keeps it out of git history.
    providePrimeNG({
      theme: {
        preset: Aura,
      },
      license: environment.primeNgLicenseKey,
    }),
  ],
};
