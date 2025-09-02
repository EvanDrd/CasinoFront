import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {Observable, tap} from 'rxjs';

export interface AuthResponse {
  token: string;
  email: string;
  pseudo: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // si ton backend tourne localement sur 8080
  private baseUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  inscription(payload: { email: string; pseudo: string; motDePasse: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, payload);
  }

  login(email: string, motDePasse: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl }/login`, { email, motDePasse }).pipe(
      tap((res: AuthResponse) => {
        this.saveToken(res.token);
        localStorage.setItem('user', JSON.stringify(res)); // sauvegarde email + pseudo
      }))
  }

  private saveToken(token: string) {
    localStorage.setItem('jwt', token);
  }

  getToken(): string | null {
    return localStorage.getItem('jwt');
  }

  logout() {
    localStorage.removeItem('jwt');
    localStorage.removeItem('user')
  }

  isLoggedIn(): boolean {
    return this.getToken() != null;
  }
}
