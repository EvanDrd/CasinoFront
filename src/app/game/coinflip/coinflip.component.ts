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

  // AJOUT: états/variables d’animation
  resolutionEnCours = false;               // vrai au moment où on “résout” vers la face cible
  targetRot: string = '0deg';              // angle final CSS (ex: '1980deg')
  rotateDuration: string = '950ms';        // durée de rotation pour la résolution

  constructor(
    private game: CoinflipService,
    private wallet: WalletService,
    private history: HistoryService
  ) {
    this.wallet.balance$.subscribe(b => this.currentBalance = b ?? null);
  }

  // AJOUT: utilitaire pour un entier aléatoire inclusif
  private randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  jouer() {
    this.error = null;
    this.message = null;
    this.lastResult = null;

    // Validation mise minimale (déjà en place)
    if (!this.mise || this.mise < this.minBet) {
      this.error = `Mise invalide : la mise minimale est de ${this.minBet} crédits.`;
      return;
    }

    if (!this.choix) {
      this.error = 'Choix requis.';
      return;
    }

    // MODIF: active l’état “en-attente” (rotation continue + flottement)
    this.enCours = true;
    this.resolutionEnCours = false;     // on attend le résultat
    this.targetRot = '0deg';            // on repart d’un état neutre (l’anim d’attente tourne en continu)
    this.rotateDuration = '950ms';      // durée par défaut

    this.game.jouerPiece({ choix: this.choix, montant: this.mise }).subscribe({
      next: (res) => {
        // On a le résultat → on construit un angle final qui finit sur la bonne face
        // PILE = 0°, FACE = 180°, + N tours complets pour l’effet “wow”
        const base = (res.outcome === 'face') ? 180 : 0; // AJOUT
        const tours = this.randInt(6, 10);               // AJOUT: nombre de tours complets
        const totalDeg = base + tours * 360;             // AJOUT: angle final
        this.targetRot = `${totalDeg}deg`;               // AJOUT: injection CSS variable
        this.rotateDuration = `${this.randInt(800, 1100)}ms`; // AJOUT: durée un peu aléatoire pour naturel

        // Lance la phase de “résolution” (arc + rotation vers la face cible)
        this.resolutionEnCours = true;                   // AJOUT

        // On met aussi à jour les infos de jeu (inchangé)
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

        // AJOUT: on relâche l’état "en cours" après la fin des animations
        // (durée ~ max(arc 680ms, rotation ~950ms) + marge)
        const totalAnimMs = Math.max(680, parseInt(this.rotateDuration)) + 120;
        setTimeout(() => {
          this.enCours = false;
          this.resolutionEnCours = false;
        }, totalAnimMs);
      },
      error: (err) => {
        this.error = err?.error?.error || 'Erreur serveur ou solde insuffisant';
        this.enCours = false;
        this.resolutionEnCours = false; // AJOUT: on stoppe toute anim en cas d’erreur
      }
    });
  }

  refreshBalance() {
    this.wallet.refreshBalance();
  }
}
