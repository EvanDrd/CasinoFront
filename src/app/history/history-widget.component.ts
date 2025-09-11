import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {HistoryEntry, HistoryService} from '../services/history/history.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-history-widget',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="padding:12px;border:1px solid #eee;border-radius:8px;background:#fff;">
      <h3 style="margin:0 0 8px 0;">Historique récent</h3>
      <div *ngIf="loading">Chargement...</div>
      <div *ngIf="!loading && items.length === 0">Aucune partie récente.</div>

      <ul *ngIf="!loading && items.length > 0" style="list-style:none;padding:0;margin:0;">
        <li *ngFor="let it of items" style="padding:8px 0;border-top:1px solid #f6f6f6;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:600">{{ it.game | uppercase }}</div>
              <div style="font-size:0.9rem;color:#666">
                {{ it.outcome ? it.outcome : '—' }} • {{ it.createdAt | date:'short' }}
              </div>
            </div>
            <div style="text-align:right">
              <div [style.color]="it.montantGagne>0 ? 'green' : '#b00020'">
                {{ it.montantGagne > 0 ? '+' + it.montantGagne : '-' + it.montantJoue }}
              </div>
              <div style="font-size:0.85rem;color:#666">
                x{{ it.multiplier ? (it.multiplier | number:'1.2-2') : '—' }}
              </div>
            </div>
          </div>
        </li>
      </ul>

      <div style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;">
        <button routerLink="/history" style="padding:6px 10px;border-radius:6px;border:1px solid #ddd;background:white;cursor:pointer;">Voir tout</button>
      </div>
    </div>
  `
})
export class HistoryWidgetComponent implements OnInit {
  items: HistoryEntry[] = [];
  loading = true;

  constructor(private svc: HistoryService) {}

  ngOnInit(): void {
    // on veut afficher 15 paris sur la page /home
    this.svc.getMySummary(5).subscribe({
      next: (res: any) => {
        // res.items expected
        this.items = res?.items ?? [];
        this.loading = false;
      },
      error: () => {
        this.items = [];
        this.loading = false;
      }
    });
  }
}
