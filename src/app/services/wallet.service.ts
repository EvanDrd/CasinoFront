// src/app/services/wallet.service.ts
import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, catchError, of } from 'rxjs';

export interface WalletDto {
  id: number;
  solde: number;
}

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  private baseUrl = 'http://localhost:8080/api/wallet';
  private balanceSubject = new BehaviorSubject<number | null>(null);
  balance$ = this.balanceSubject.asObservable();

  private eventSource?: EventSource;
  private reconnectTimeout = 1000;

  constructor(
    private http: HttpClient,
    private ngZone: NgZone
  ) {
    // NE PAS utiliser AuthService ici (pour éviter circular dependency).
    const token = localStorage.getItem('jwt');
    if (token) {
      this.refreshBalance();
      this.connectSse();
    }
  }

  // fetch initial balance and update subject
  public refreshBalance() {
    this.http.get<WalletDto>(`${this.baseUrl}/me`)
      .pipe(catchError(() => of(null)))
      .subscribe(w => {
        if (w && typeof w.solde === 'number') {
          this.balanceSubject.next(w.solde);
        }
      });
  }

  getMyWallet(): Observable<WalletDto> {
    return this.http.get<WalletDto>(`${this.baseUrl}/me`);
  }

  debit(montant: number): Observable<WalletDto> {
    return this.http.post<WalletDto>(`${this.baseUrl}/debit`, { montant });
  }

  credit(montant: number): Observable<WalletDto> {
    return this.http.post<WalletDto>(`${this.baseUrl}/credit`, { montant });
  }

  connectSse() {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    const url = `${this.baseUrl}/stream?token=${encodeURIComponent(token)}`;

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }

    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener('wallet-update', (ev: any) => {
      this.ngZone.run(() => {
        try {
          const data = JSON.parse(ev.data);
          if (data && typeof data.solde === 'number') {
            this.balanceSubject.next(data.solde);
          }
        } catch (e) {
          // ignore
        }
      });
    });

    this.eventSource.onopen = () => {
      this.reconnectTimeout = 1000;
    };

    this.eventSource.onerror = () => {
      this.eventSource?.close();
      this.eventSource = undefined;
      setTimeout(() => this.connectSse(), this.reconnectTimeout);
      this.reconnectTimeout = Math.min(this.reconnectTimeout * 2, 30000);
    };
  }

  disconnectSse() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  clear() {
    this.balanceSubject.next(null);
    this.disconnectSse();
  }
}
