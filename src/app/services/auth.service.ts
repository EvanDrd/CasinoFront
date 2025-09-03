// src/app/services/auth.service.ts
import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { WalletService } from './wallet.service';

export interface AuthResponse {
  token: string;
  email: string;
  pseudo: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8080/api/auth';

  constructor(
    private http: HttpClient,
    private injector: Injector // injection de l'injector, pas du WalletService directement
  ) {}

  inscription(payload: { email: string; pseudo: string; motDePasse: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload);
  }

  login(email: string, motDePasse: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, { email, motDePasse }).pipe(
      tap((res: AuthResponse) => {
        this.saveToken(res.token);
        localStorage.setItem('user', JSON.stringify(res));

        // on récupère WalletService AU MOMENT BESOIN via l'injector pour éviter circular DI
        try {
          const walletService = this.injector.get(WalletService);
          // démarre SSE et rafraîchit le solde
          walletService.connectSse();
          walletService.refreshBalance();
        } catch (e) {
          // si pour une raison quelconque WalletService n'est pas fourni, on ignore (sécurité)
          // console.warn('WalletService not available yet', e);
        }
      })
    );
  }

  private saveToken(token: string) {
    localStorage.setItem('jwt', token);
  }

  getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  logout() {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user');

    try {
      const walletService = this.injector.get(WalletService);
      walletService.clear();
    } catch (e) {
      // ignore
    }
  }

  isLoggedIn(): boolean {
    return this.getToken() != null;
  }
}
