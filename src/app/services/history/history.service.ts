// src/app/services/history/history.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface HistoryEntry {
  id?: number;
  game: string;
  outcome?: string;
  montantJoue: number;
  montantGagne: number;
  multiplier?: number | null;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private base = 'http://localhost:8080/api/history';
  private cacheLimit = 15;
  private entries$ = new BehaviorSubject<HistoryEntry[]>([]);
  public entriesObservable$ = this.entries$.asObservable();

  constructor(private http: HttpClient) {}

  private hasToken(): boolean {
    return !!localStorage.getItem('jwt');
  }

  getMyHistory(limit = this.cacheLimit): Observable<HistoryEntry[]> {
    if (!this.hasToken()) {
      this.entries$.next([]);
      return of([]);
    }
    const q = `?limit=${limit}`;
    return this.http.get<HistoryEntry[]>(`${this.base}/me${q}`).pipe(
      tap(list => this.entries$.next(list ?? []))
    );
  }

  getMyHistoryByGame(game: string, limit = 10): Observable<HistoryEntry[]> {
    if (!this.hasToken()) return of([]);
    const q = `?game=${encodeURIComponent(game)}&limit=${limit}`;
    return this.http.get<HistoryEntry[]>(`${this.base}/me${q}`);
  }

  getMySummary(limit = 5) {
    if (!this.hasToken()) return of({ items: [] });
    return this.http.get<{ items: HistoryEntry[] }>(`${this.base}/me/summary?limit=${limit}`);
  }

  refresh(limit = this.cacheLimit) {
    if (!this.hasToken()) {
      this.entries$.next([]);
      return;
    }
    this.getMyHistory(limit).subscribe({ next: () => {}, error: () => {} });
  }

  pushLocal(entry: HistoryEntry) {
    const current = this.entries$.getValue();
    const copy = [entry, ...current];
    if (copy.length > this.cacheLimit) copy.splice(this.cacheLimit);
    this.entries$.next(copy);
  }

  prependFromServerForGame(game: string, limit = 10) {
    if (!this.hasToken()) return;
    this.getMyHistoryByGame(game, limit).subscribe({
      next: list => {
        const serverList = list ?? [];
        const current = this.entries$.getValue();
        const ids = new Set(serverList.map(i => i.id));
        const merged = [...serverList, ...current.filter(i => !ids.has(i.id))].slice(0, this.cacheLimit);
        this.entries$.next(merged);
      },
      error: () => {}
    });
  }
}
