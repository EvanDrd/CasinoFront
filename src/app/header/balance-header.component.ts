// src/app/header/balance-header.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { WalletService } from '../services/wallet.service';

@Component({
  selector: 'app-balance-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display:flex;gap:12px;align-items:center;">
      <div *ngIf="(balance$ | async) as bal; else loading">
        Solde : <strong>{{ bal }} crédits</strong>
      </div>
      <ng-template #loading>
        <div>Solde : <small>—</small></div>
      </ng-template>
    </div>
  `
})
export class BalanceHeaderComponent {
  balance$: Observable<number | null>;

  constructor(private wallet: WalletService) {
    // initialise ici (après injection) pour éviter l'erreur TS2729
    this.balance$ = this.wallet.balance$;
  }
}
