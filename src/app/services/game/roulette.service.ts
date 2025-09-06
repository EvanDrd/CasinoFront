import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RouletteBetRequest {
  betType: string;
  betValue: string;
  montant: number;
}

export interface RouletteBetResponse {
  number: number;
  color: string;
  win: boolean;
  montantJoue: number;
  montantGagne: number;
  solde: number;
}

@Injectable({
  providedIn: 'root'
})
export class RouletteService {
  private base = 'http://localhost:8080/api/game';

  constructor(private http: HttpClient) {}

  jouerRoulette(req: RouletteBetRequest): Observable<RouletteBetResponse> {
    return this.http.post<RouletteBetResponse>(`${this.base}/roulette`, req);
  }

  // get bias or other endpoints later
}
