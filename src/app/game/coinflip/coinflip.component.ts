import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CoinflipService } from '../../services/game/coinflip.service';
import { WalletService } from '../../services/wallet.service';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-coinflip',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
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

  constructor(private game: CoinflipService, private wallet: WalletService) {
    this.wallet.balance$.subscribe(b => this.currentBalance = b ?? null);
  }

  jouer() {
    this.error = null;
    this.message = null;
    this.lastResult = null;
    if (!this.mise || this.mise <= 0) {
      this.error = 'Mise invalide.';
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
