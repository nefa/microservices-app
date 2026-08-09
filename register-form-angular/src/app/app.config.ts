import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Required by LmaApi (HttpClient) and by validateHttp() in
    // registration-model.ts's schema, which builds an httpResource under
    // the hood - both need HttpClient provided at the app level.
    provideHttpClient(withFetch()),
  ],
};
