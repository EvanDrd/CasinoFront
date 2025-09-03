// src/app/app.config.ts  (ou le fichier où tu as appConfig)
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HTTP_INTERCEPTORS } from '@angular/common/http';

import { routes } from './app.routes';
import { AuthInterceptor } from './interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    // IMPORTANT : withInterceptorsFromDi() permet d'utiliser les interceptors enregistrés via DI
    provideHttpClient(withInterceptorsFromDi()),

    // enregistrement de l'interceptor via le token HTTP_INTERCEPTORS
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
};
