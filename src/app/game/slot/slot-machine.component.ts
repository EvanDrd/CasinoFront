import { Component, OnDestroy, AfterViewInit, ViewChildren, QueryList, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WalletService } from '../../services/wallet.service';
import { Subscription } from 'rxjs';
import { SlotPlayResponse, SlotService, SlotConfigResponse } from '../../services/game/slot.service';
import { RouterLink } from '@angular/router';

interface ReelModel {
  sequence: string[];   // séquence visuelle (symbols répétés)
}

@Component({
  selector: 'app-slot-machine',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './slot-machine.component.html',
  styleUrls: ['./slot-machine.component.css']
})
export class SlotMachineComponent implements OnDestroy, AfterViewInit {
  mise: number = 100;
  enCours = false;
  error: string | null = null;
  lastResult: SlotPlayResponse | null = null;
  currentBalance: number | null = null;

  symbols: string[] = [];
  reelsCount = 3;
  reels: ReelModel[] = [];

  // combien de répétitions des symbols pour créer l'effet de loop
  private loops = 6;

  private sub?: Subscription;
  private configSub?: Subscription;

  // refs to reel DOM elements (the inner strip)
  @ViewChildren('reelStrip') reelStrips!: QueryList<ElementRef<HTMLDivElement>>;

  constructor(private game: SlotService, private wallet: WalletService, private cdr: ChangeDetectorRef) {
    this.sub = this.wallet.balance$.subscribe(b => this.currentBalance = b ?? null);

    // charger config initiale
    this.configSub = this.game.getSlotsConfig().subscribe({
      next: (cfg: SlotConfigResponse) => {
        this.symbols = cfg.symbols || [];
        this.reelsCount = cfg.reelsCount || 3;
        this.buildReels();
        this.cdr.detectChanges();
      },
      error: () => { /* ignore */ }
    });
  }

  ngAfterViewInit(): void {
    // nothing immediate — reelStrips becomes available after view init
  }

  private buildReels() {
    // construit les reels: sequence = symbols répétées `loops` fois
    if (!this.symbols || this.symbols.length === 0) this.symbols = ['SYM'];
    this.reels = [];
    for (let r = 0; r < this.reelsCount; r++) {
      const seq: string[] = [];
      for (let l = 0; l < this.loops; l++) {
        for (const s of this.symbols) seq.push(s);
      }
      this.reels.push({ sequence: seq });
    }
  }

  jouer() {
    this.error = null;
    this.lastResult = null;

    if (!this.mise || this.mise <= 0) { this.error = 'Mise invalide.'; return; }

    // disable UI
    this.enCours = true;

    // start visual spinning animation
    this.startVisualSpin();

    // call backend
    this.game.playSlots({ montant: this.mise }).subscribe({
      next: (res) => {
        this.lastResult = res;
        // land reels onto result
        //this.stopAndLand(re: any => {}); // placeholder to ensure TypeScript happy
        this.landToResult(res.reels);
        // refresh balance
        this.wallet.refreshBalance();
      },
      error: (err) => {
        this.error = err?.error?.error || 'Erreur serveur ou solde insuffisant';
        // stop visual spin gracefully
        this.stopAllSpinImmediate();
        this.enCours = false;
      },
      complete: () => {
        this.enCours = false;
        // will be set to false after landing animation ends
      }
    });
  }

  /** Ajoute la classe spinning aux strips (animation CSS continue) */
  private startVisualSpin() {
    // ensure reels built
    this.buildReels();
    // apply class
    setTimeout(() => {
      this.reelStrips.forEach(elref => {
        const el = elref.nativeElement;
        el.classList.add('spinning');
        // clear any inline transform/transition
        el.style.transition = '';
        el.style.transform = '';
      });
    }, 20);
  }

  /** Stoppe l'animation en cours et positionne chaque reel pour correspondre au résultat */
  private landToResult(resultSymbols: string[]) {
    // Wait until DOM children are ready
    setTimeout(() => {
      const strips = this.reelStrips.toArray();
      const cellHeight = this.getCellHeight();
      const centerOffset = Math.floor((this.visibleCells() / 2)) * cellHeight; // to center the symbol if needed

      // for each reel compute target index in sequence: choose last loop occurrence of the symbol
      for (let r = 0; r < Math.min(resultSymbols.length, strips.length); r++) {
        const targetSym = resultSymbols[r];
        const stripEl = strips[r].nativeElement;

        // find index of the symbol in the last loop
        const symbolsPerLoop = this.symbols.length;
        // prefer the last loop (loops-1)
        let targetIndexInSeq = -1;
        // search from end for matching symbol
        for (let idx = this.reels[r].sequence.length - 1; idx >= 0; idx--) {
          if (this.reels[r].sequence[idx] === targetSym) {
            targetIndexInSeq = idx;
            break;
          }
        }
        if (targetIndexInSeq < 0) {
          // fallback: pick random index
          targetIndexInSeq = Math.floor(Math.random() * this.reels[r].sequence.length);
        }

        // pause animation loop
        stripEl.classList.remove('spinning');

        // compute desired translateY so that the target cell appears centered (or at top)
        // translate px = targetIndexInSeq * cellHeight - centerOffset
        const translate = (targetIndexInSeq * cellHeight) - centerOffset;

        // apply smooth transition to final position
        // stagger durations a bit (longer for rightmost reels)
        const duration = 800 + r * 150; // ms
        stripEl.style.transition = `transform ${duration}ms cubic-bezier(.2,.8,.2,1)`;
        stripEl.style.transform = `translateY(-${translate}px)`;

        // after transition for last reel, re-enable UI
        if (r === strips.length - 1) {
          const cleanup = () => {
            this.enCours = false;
            // clear inline transition after short delay to let user spin again smoothly
            setTimeout(() => {
              try {
                stripEl.style.transition = '';
              } catch {}
            }, 200);
          };
          // attach event once
          const onEnd = () => {
            cleanup();
            stripEl.removeEventListener('transitionend', onEnd);
          };
          stripEl.addEventListener('transitionend', onEnd);
        }
      }
    }, 50);
  }

  /** Stops all spins immediately (used on error) */
  private stopAllSpinImmediate() {
    this.reelStrips.forEach(elref => {
      const el = elref.nativeElement;
      el.classList.remove('spinning');
      el.style.transition = '';
    });
  }

  /** helper pour récupérer hauteur d'une cellule (assume toutes identiques) */
  private getCellHeight(): number {
    const firstStrip = this.reelStrips.first;
    if (!firstStrip) return 64;
    const cell = firstStrip.nativeElement.querySelector('.cell') as HTMLElement | null;
    if (!cell) return 64;
    return Math.max(32, Math.round(cell.getBoundingClientRect().height));
  }

  /** Combien de cellules visibles verticalement (pour centrer) */
  private visibleCells(): number {
    // Ici on affiche 3 cellules visibles par reel (centré). Ajuste si tu changes le CSS.
    return 3;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.configSub?.unsubscribe();
  }
}
