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
          <div style="display:flex;align-items:center;gap:10px;">
            <div *ngIf="formatOutcome(it) as fo">
              <span *ngIf="fo.number!=null" [style.background]="colorFor(fo.color)" style="display:inline-flex;width:34px;height:34px;border-radius:50%;justify-content:center;align-items:center;color:white;font-weight:700;">
                {{ fo.number }}
              </span>
            </div>
            <div>
              <div style="font-weight:600">{{ it.game | uppercase }} • {{ formatOutcome(it)?.label || '—' }}</div>
              <div style="font-size:0.9rem;color:#666">{{ it.createdAt | date:'short' }}</div>
            </div>
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
      } else {
        this.items = list.filter(i => i.game === this.game).slice(0, this.limit);
      }
      this.loading = false;
    });
    if (this.game) {
      this.svc.prependFromServerForGame(this.game, this.limit);
    } else {
      this.svc.refresh();
    }
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  formatOutcome(it: HistoryEntry) {
    if (!it || !it.outcome) return null;
    const o = it.outcome;
    if (it.game === 'roulette') {
      const map: Record<string,string> = {};
      o.split(',').forEach(p => {
        const [k,v] = p.split('=');
        if (v !== undefined) map[k.trim()] = v.trim();
      });
      const num = map['number'] ? Number(map['number']) : (/\b\d+\b/.exec(o) ? Number(/\b\d+\b/.exec(o)![0]) : null);
      const color = (map['color'] ?? (o.includes('red') ? 'red' : o.includes('black') ? 'black' : o.includes('green') ? 'green' : null));
      return { number: num, color, label: num != null ? `${num} ${color ? '(' + capitalize(color) + ')' : ''}`.trim() : o };
    }
    if (it.game === 'coinflip') {
      return { number: null, color: null, label: o.toUpperCase() };
    }
    return { number: null, color: null, label: o };
  }

  colorFor(c?: string|null) {
    if (!c) return '#666';
    if (c === 'red') return '#d32f2f';
    if (c === 'black') return '#212121';
    if (c === 'green') return '#2e7d32';
    return '#666';
  }
}

function capitalize(s: string|null|undefined) { if (!s) return ''; return s.charAt(0).toUpperCase() + s.slice(1); }
