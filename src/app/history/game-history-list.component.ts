import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryEntry, HistoryService } from '../services/history/history.service';
import { Subscription } from 'rxjs';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-game-history-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="margin-top:18px;padding:12px;border:1px solid #eee;border-radius:8px;background:#fff;">
      <h4 style="margin:0 0 8px 0;">Historique — {{ game ? (game | uppercase) : 'TOUS' }}</h4>
      <div *ngIf="loading">Chargement...</div>
      <div *ngIf="!loading && items.length === 0">Aucune entrée.</div>
      <ul *ngIf="!loading && items.length>0" style="list-style:none;padding:0;margin:0;">
        <li *ngFor="let it of items" style="padding:8px 0;border-top:1px solid #f6f6f6;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:600">{{ it.game | uppercase }}</div>
            <div style="font-size:0.9rem;color:#666">{{ it.outcome ? it.outcome : '—' }} • {{ it.createdAt | date:'short' }}</div>
          </div>
          <div style="text-align:right;min-width:120px">
            <div [style.color]="it.montantGagne>0 ? 'green' : '#b00020'">{{ it.montantGagne>0 ? '+' + it.montantGagne : '-' + it.montantJoue }}</div>
            <div style="font-size:0.85rem;color:#666">x{{ it.multiplier ? (it.multiplier | number:'1.2-2') : '—' }}</div>
          </div>
        </li>
      </ul>
      <div style="margin-top:10px;display:flex;gap:8px;justify-content:flex-end;">
        <a [routerLink]="['/history']" style="padding:6px 10px;border-radius:6px;border:1px solid #ddd;background:white;color:#333;text-decoration:none;">Voir tout</a>
      </div>
    </div>
  `
})
export class GameHistoryListComponent implements OnInit, OnDestroy {
  @Input() game: string | null = null;
  @Input() limit = 10;
  items: HistoryEntry[] = [];
  loading = true;
  private sub?: Subscription;

  constructor(private svc: HistoryService) {}

  ngOnInit(): void {
    this.loading = true;
    this.sub = this.svc.entriesObservable$.subscribe(list => {
      if (!this.game) {
        this.items = list.slice(0, this.limit);
        this.loading = false;
      } else {
        // if filtering by game, fetch server filtered list (keeps it accurate)
        this.loading = true;
        this.svc.getMyHistoryByGame(this.game, this.limit).subscribe({
          next: res => { this.items = res ?? []; this.loading = false; },
          error: () => { this.items = []; this.loading = false; }
        });
      }
    });
    // initial population
    this.svc.refresh();
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
