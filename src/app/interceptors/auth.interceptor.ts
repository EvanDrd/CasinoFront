// src/app/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // adapte si ton backend n'est pas à cet url en dev
  private apiBase = 'http://localhost:8080';

  constructor(private auth: AuthService, private router: Router) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();
    let cloned = req;

    // n'ajoute le header Authorization que pour les appels vers ton API backend
    if (token && req.url.startsWith(this.apiBase)) {
      cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }

    return next.handle(cloned).pipe(
      catchError((err: any) => {
        if (err instanceof HttpErrorResponse) {
          // si 401 -> probable token expiré ou non autorisé : logout et redirection
          if (err.status === 401) {
            this.auth.logout();
            // protège contre boucle infinie : vérifie l'URL courante avant de naviguer
            this.router.navigate(['/login']);
          }
        }
        return throwError(() => err);
      })
    );
  }
}
