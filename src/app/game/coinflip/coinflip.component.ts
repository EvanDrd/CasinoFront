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
  resolutionEnCours = false;
  targetRot: string = '0deg';
  rotateDuration: string = '950ms';
  baseRotDeg: number = 0;

  constructor(
    private game: CoinflipService,
    private wallet: WalletService,
    private history: HistoryService
  ) {
    this.wallet.balance$.subscribe(b => this.currentBalance = b ?? null);
  }

  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  jouer() {
    this.error = null;
    this.message = null;

    if (!this.mise || this.mise < this.minBet) {
      this.error = `Mise invalide : la mise minimale est de ${this.minBet} crédits.`;
      return;
    }

    if (!this.choix) {
      this.error = 'Choix requis.';
      return;
    }

    this.enCours = true;
    this.resolutionEnCours = false;
    this.rotateDuration = '950ms';

    this.game.jouerPiece({ choix: this.choix, montant: this.mise }).subscribe({
      next: (res) => {
        const base = (res.outcome === 'face') ? 180 : 0;

        // on met la base tout de suite pour que l'état visuel de départ soit correct
        this.baseRotDeg = base;

        const tours = this.randInt(6, 10);
        const totalDeg = base + tours * 360;
        this.targetRot = `${totalDeg}deg`;
        this.rotateDuration = `${this.randInt(800, 1100)}ms`;

        this.resolutionEnCours = true;

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

        const totalAnimMs = Math.max(680, parseInt(this.rotateDuration)) + 120;
        setTimeout(() => {
          this.enCours = false;
          this.resolutionEnCours = false;
          // garder baseRotDeg à la valeur finale (0 ou 180) pour le rendu statique
          this.baseRotDeg = base;
        }, totalAnimMs);
      },
      error: (err) => {
        this.error = err?.error?.error || 'Erreur serveur ou solde insuffisant';
        this.enCours = false;
        this.resolutionEnCours = false;
      }
    });
  }

  refreshBalance() {
    this.wallet.refreshBalance();
  }
}
