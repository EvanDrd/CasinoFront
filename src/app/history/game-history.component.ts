// src/app/history/game-history.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {HistoryEntry, HistoryService} from '../services/history/history.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-game-history',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div style="max-width:900px;margin:20px auto;padding:18px;border:1px solid #eee;border-radius:8px;">
      <h2>Historique {{ game ? ('— ' + (game | uppercase)) : '' }}</h2>

      <div style="margin-top:12px;">
        <label>Filtrer par jeu :</label>
        <input [(ngModel)]="gameInput" placeholder="ex: coinflip, slots, roulette" style="padding:6px;border:1px solid #ccc;border-radius:4px;" />
        <button (click)="loadForGame()" style="padding:6px 10px;margin-left:8px">Filtrer</button>
        <button (click)="loadAll()" style="padding:6px 10px;margin-left:8px">Tout</button>
      </div>

      <div *ngIf="loading" style="margin-top:12px">Chargement...</div>

      <table *ngIf="!loading && items.length>0" style="width:100%;margin-top:12px;border-collapse:collapse;">
        <thead>
        <tr style="text-align:left;border-bottom:1px solid #eee">
          <th style="padding:8px">Jeu</th>
          <th style="padding:8px">Issue / détails</th>
          <th style="padding:8px">Mise</th>
          <th style="padding:8px">Gain</th>
          <th style="padding:8px">Multiplicateur</th>
          <th style="padding:8px">Date</th>
        </tr>
        </thead>
        <tbody>
        <tr *ngFor="let it of items">
          <td style="padding:8px">{{ it.game }}</td>
          <td style="padding:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px">{{ it.outcome }}</td>
          <td style="padding:8px">{{ it.montantJoue }}</td>
          <td style="padding:8px" [style.color]="it.montantGagne>0 ? 'green' : '#b00020'">
            {{ it.montantGagne }}
          </td>
          <td style="padding:8px">{{ it.multiplier ? (it.multiplier | number:'1.2-2') : '—' }}</td>
          <td style="padding:8px">{{ it.createdAt | date:'short' }}</td>
        </tr>
        </tbody>
      </table>

      <div *ngIf="!loading && items.length === 0" style="margin-top:12px">Aucune partie trouvée.</div>

      <div style="margin-top:12px">
        <button routerLink="/home" style="padding:6px 10px;border-radius:6px;border:1px solid #ddd;background:white;">Retour</button>
      </div>
    </div>
  `
})
export class GameHistoryComponent implements OnInit {
  items: HistoryEntry[] = [];
  loading = true;
  game: string | null = null;
  gameInput = '';

  constructor(private svc: HistoryService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    // try to read query param or route param if you set one
    this.route.queryParams.subscribe(params => {
      const g = params['game'];
      if (g) {
        this.game = g;
        this.gameInput = g;
        this.loadForGame();
      } else {
        this.loadAll();
      }
    });
  }

  loadAll() {
    this.loading = true;
    this.svc.getMyHistory().subscribe({
      next: res => { this.items = res; this.loading = false; },
      error: () => { this.items = []; this.loading = false; }
    });
  }

  loadForGame() {
    const g = this.gameInput && this.gameInput.trim() !== '' ? this.gameInput.trim() : null;
    if (!g) { this.loadAll(); return; }
    this.loading = true;
    this.svc.getMyHistoryByGame(g).subscribe({
      next: res => { this.items = res; this.loading = false; },
      error: () => { this.items = []; this.loading = false; }
    });
  }
}
