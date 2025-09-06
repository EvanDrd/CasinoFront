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

  wheelNumbers = [
    0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,
    24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26
  ];

  private static readonly RED_SET = new Set<number>([
    1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
  ]);

  readonly wheelSizePx = 360;
  readonly rimRadiusPx = 160;

  sectorAngle = 360 / this.wheelNumbers.length;

  betType: string = 'straight';
  betValue: string = '0';
  montant: number = 100;

  enCours = false;
  lastResult: RouletteBetResponse | null = null;
  error: string | null = null;
  currentBalance: number | null = null;
  walletSub?: Subscription;

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

  private computeFinalRelativeRotationForIndex(idx: number, fullSpins = 2): number {
    const base = fullSpins * 360;
    const angleToTarget = idx * this.sectorAngle;
    const jitter = (Math.random() - 0.5) * (this.sectorAngle * 0.3);
    return base - angleToTarget + jitter;
  }

  jouer() {
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

    this.enCours = true;
    this.wheelSpinning = true;
    this.wheelTransition = 'none';

    const req = { betType: this.betType, betValue: this.betValue, montant: this.montant };

    this.game.jouerRoulette(req).subscribe({
      next: (res) => {
        const idx = this.wheelNumbers.indexOf(res.number);
        const finalRel = this.computeFinalRelativeRotationForIndex(idx, 2);
        const finalAbsolute = this.wheelRotation + finalRel;

        this.wheelSpinning = false;
        setTimeout(() => {
          const durationSec = 5;
          this.wheelTransition = `transform ${durationSec}s cubic-bezier(.25,.8,.25,1)`;
          this.wheelRotation = finalAbsolute;
        }, 50);

        setTimeout(() => {
          this.lastResult = res;
          this.enCours = false;
          this.wallet.refreshBalance();

          setTimeout(() => {
            this.wheelTransition = 'none';
            this.wheelRotation = this.wheelRotation % 360;
          }, 200);
        }, 5200);
      },
      error: err => {
        this.error = err?.error?.error || 'Erreur serveur ou solde insuffisant';
        this.enCours = false;
        this.wheelSpinning = false;
      }
    });
  }
}
