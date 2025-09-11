import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface HistoryEntry {
  id: number;
  game: string;
  outcome?: string;
  montantJoue: number;
  montantGagne: number;
  multiplier?: number | null;
  createdAt: string; // ISO string
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private base = 'http://localhost:8080/api/history';

  constructor(private http: HttpClient) {}

  // liste générique (tous jeux) pour l'utilisateur courant
  getMyHistory(limit = 50): Observable<HistoryEntry[]> {
    const q = `?limit=${limit}`;
    return this.http.get<HistoryEntry[]>(`${this.base}/me${q}`);
  }

  // liste filtrée par jeu (ex: 'coinflip', 'slots', 'roulette')
  getMyHistoryByGame(game: string, limit = 15): Observable<HistoryEntry[]> {
    const q = `?game=${encodeURIComponent(game)}&limit=${limit}`;
    return this.http.get<HistoryEntry[]>(`${this.base}/me${q}`);
  }

  // petite synthèse (pour widget) — retourne { items: HistoryEntry[] }
  getMySummary(limit = 15) {
    return this.http.get<{ items: HistoryEntry[] }>(`${this.base}/me/summary?limit=${limit}`);
  }
}
