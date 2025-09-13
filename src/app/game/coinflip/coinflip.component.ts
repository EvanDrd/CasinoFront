import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CoinflipService } from '../../services/game/coinflip.service';
import { WalletService } from '../../services/wallet.service';
import { GameHistoryListComponent } from '../../history/game-history-list.component';
import { HistoryService } from '../../services/history/history.service';

@Component({
  selector: 'app-coinflip',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, GameHistoryListComponent],
  templateUrl: './coinflip.component.html',
  styleUrls: ['./coinflip.component.css']
})
export class CoinflipComponent {
  mise: number = 100;
  choix: 'pile' | 'face' = 'pile';
  enCours = false;
  error: string | null = null;
  message: string | null = null;
  lastResult: any = null;
  currentBalance: number | null = null;
  maxBet = 1000000;

  minBet = 100;

  constructor(
    private game: CoinflipService,
    private wallet: WalletService,
    private history: HistoryService
  ) {
    this.wallet.balance$.subscribe(b => this.currentBalance = b ?? null);
  }

  jouer() {
    this.error = null;
    this.message = null;
    this.lastResult = null;

    // AJOUT: validation sur la mise minimale
    if (!this.mise || this.mise < this.minBet) {
      this.error = `Mise invalide : la mise minimale est de ${this.minBet} crédits.`;
      return;
    }

    if (!this.choix) {
      this.error = 'Choix requis.';
      return;
    }

    this.enCours = true;
    this.game.jouerPiece({ choix: this.choix, montant: this.mise }).subscribe({
      next: (res) => {
        this.lastResult = res;
        this.message = res.win ? 'Bravo !' : 'Dommage.';
        this.wallet.refreshBalance();
        const entry = {
          game: 'coinflip',
          outcome: `choice=${this.choix},outcome=${res.outcome}`,
          montantJoue: (res.montantJoue ?? this.mise),
          montantGagne: (res.montantGagne ?? 0),
          multiplier: (res.montantJoue ? ((res.montantGagne ?? 0) / res.montantJoue) : (res.win ? 2 : 0)),
          createdAt: new Date().toISOString()
        };
        this.history.pushLocal(entry);
        this.enCours = false;
      },
      error: (err) => {
        this.error = err?.error?.error || 'Erreur serveur ou solde insuffisant';
        this.enCours = false;
      }
    });
  }

  refreshBalance() {
    this.wallet.refreshBalance();
  }
}
