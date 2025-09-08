import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouletteService, RouletteBetResponse } from '../../services/game/roulette.service';
import { WalletService } from '../../services/wallet.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-roulette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roulette.component.html',
  styleUrls: ['./roulette.component.css']
})
export class RouletteComponent implements OnDestroy {
  @ViewChild('wheelEl', { static: false }) wheelEl?: ElementRef<HTMLDivElement>;

  wheelNumbers = [ 0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,
    24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26 ];

  private static readonly RED_SET = new Set<number>([
    1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
  ]);

  // colonnes du tableau de pari (affichage classique)
  tableRows = [
    Array.from({ length: 12 }, (_, i) => i + 1),        // 1..12
    Array.from({ length: 12 }, (_, i) => i + 13),       // 13..24
    Array.from({ length: 12 }, (_, i) => i + 25)        // 25..36
  ];


  readonly wheelSizePx = 360;
  readonly rimRadiusPx = 160;

  sectorAngle = 360 / this.wheelNumbers.length;

  betType: string = 'straight';
  betValue: string = '0';
  montant: number = 100;

  enCours = false;
  lastResult: RouletteBetResponse | null = null;
  resultsHistory: RouletteBetResponse[] = [];
  error: string | null = null;
  currentBalance: number | null = null;
  walletSub?: Subscription;

  // rotation state (degrees, can grow arbitrarily)
  wheelRotation = 0;
  wheelTransition = 'none';
  wheelSpinning = false;

  selectedNumber: number | null = null;

  constructor(private game: RouletteService, private wallet: WalletService) {
    this.walletSub = this.wallet.balance$.subscribe(b => this.currentBalance = b ?? null);
  }

  ngOnDestroy(): void {
    this.walletSub?.unsubscribe();
  }

  isRed(n: number | null | undefined): boolean {
    if (n == null) return false;
    if (n === 0) return false;
    return RouletteComponent.RED_SET.has(Number(n));
  }

  choisirNumero(n: number) {
    this.betType = 'straight';
    this.betValue = '' + n;
    this.selectedNumber = n;
  }

  // normaliser angle en [0,360)
  private normalize(angle: number): number {
    let a = angle % 360;
    if (a < 0) a += 360;
    return a;
  }

  // angle modulo (0..360) qui place l'index idx sous le curseur (curseur en haut)
  private targetModuloForIndex(idx: number): number {
    const offset = 0; // correction : top cursor
    const angleToTarget = idx * this.sectorAngle;
    return this.normalize(offset - angleToTarget);
  }

  autoSpinActive = false;
  autoSpinCount: number | null = null; // si défini, nombre de tours restants
  private autoSpinTimer: any;
  private lastSpinFinished = true;

  jouer(autoTrigger = false) {
    this.error = null;
    this.lastResult = null;

    if (this.betType !== 'straight') {
      this.selectedNumber = null;
    }

    if (!this.montant || this.montant <= 0) {
      this.error = 'Mise invalide';
      return;
    }
    if (!this.betType || this.betValue == null) {
      this.error = 'Pari invalide';
      return;
    }

    // si déjà en cours -> ne rien lancer
    if (this.enCours) return;

    this.enCours = true;
    this.wheelSpinning = true;
    this.wheelTransition = 'none';
    this.lastSpinFinished = false;

    const req = { betType: this.betType, betValue: this.betValue, montant: this.montant };

    this.game.jouerRoulette(req).subscribe({
      next: (res) => {
        const idx = this.wheelNumbers.indexOf(res.number);
        const targetMod = this.targetModuloForIndex(idx);

        const currentAbs = this.wheelRotation;
        const currentMod = this.normalize(currentAbs);

        const delta = (targetMod - currentMod + 360) % 360;
        const fullSpins = 2;
        const finalAbsolute = currentAbs + fullSpins * 360 + delta;

        this.wheelSpinning = false;
        setTimeout(() => {
          const durationSec = 5;
          this.wheelTransition = `transform ${durationSec}s cubic-bezier(.25,.8,.25,1)`;
          this.wheelRotation = finalAbsolute;
        }, 50);

        const totalMs = 5200;
        setTimeout(() => {
          this.lastResult = res;
          // ✅ on empile dans l’historique (dernier en haut)
          this.resultsHistory.unshift(res);
          if (this.resultsHistory.length > 1) {
            this.resultsHistory.pop(); // garder seulement les 20 derniers
          }
          this.enCours = false;
          this.wallet.refreshBalance();


          this.wheelTransition = 'none';
          this.wheelRotation = targetMod;

          this.lastSpinFinished = true;

          // si auto-spin actif -> enchaîner
          if (this.autoSpinActive) {
            if (this.autoSpinCount !== null) {
              if (this.autoSpinCount > 1) {
                this.autoSpinCount--;
                this.jouer(true);
              } else {
                this.stopAutoSpin();
              }
            } else {
              // mode infini
              this.jouer(true);
            }
          }
        }, totalMs);
      },
      error: err => {
        this.error = err?.error?.error || 'Erreur serveur ou solde insuffisant';
        this.enCours = false;
        this.wheelSpinning = false;
        this.lastSpinFinished = true;
        this.stopAutoSpin();
      }
    });
  }

  startAutoSpin(count?: number) {
    this.autoSpinActive = true;
    this.autoSpinCount = count ?? null; // si pas fourni = infini
    if (this.lastSpinFinished) {
      this.jouer(true);
    }
  }

  stopAutoSpin() {
    this.autoSpinActive = false;
    this.autoSpinCount = null;
  }

}
