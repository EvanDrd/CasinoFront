import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

  // plus tard : connexion, logout, getProfile...
}
