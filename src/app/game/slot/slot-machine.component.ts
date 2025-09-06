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

  // minimale durée visuelle du spin (ms) pour éviter arret instantané)
  private minSpinMs = 600;
  private spinStartAt = 0;

  private sub?: Subscription;
  private configSub?: Subscription;

  // refs to reel DOM elements (the inner strip)
  @ViewChildren('reelStrip') reelStrips!: QueryList<ElementRef<HTMLDivElement>>;

  // fallback timers pour transición / nettoyage
  private cleanupTimeout: any = null;
  private transitionTimeouts: any[] = [];

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
    // reelStrips devient disponible après l'initialisation de la vue
  }

  private buildReels() {
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
    this.spinStartAt = Date.now();

    // start visual spinning animation
    this.startVisualSpin();

    // call backend
    this.game.playSlots({ montant: this.mise }).subscribe({
      next: (res) => {
        this.lastResult = res;
        // on attend la durée minimale pour que l'utilisateur voie l'animation
        const elapsed = Date.now() - this.spinStartAt;
        const wait = Math.max(0, this.minSpinMs - elapsed);
        setTimeout(() => {
          this.landToResult(res.reels);
          // refresh balance (SSE ou pull)
          this.wallet.refreshBalance();
        }, wait);
      },
      error: (err) => {
        this.error = err?.error?.error || 'Erreur serveur ou solde insuffisant';
        this.stopAllSpinImmediate();
        this.enCours = false;
      }
    });
  }

  /** Ajoute la classe spinning aux strips (animation CSS continue) */
  private startVisualSpin() {
    this.buildReels();
    // clear any previous timeouts/listeners
    this.clearAllTimers();
    setTimeout(() => {
      this.reelStrips.forEach(elref => {
        const el = elref.nativeElement;
        // remove inline transform/transition before anim
        el.style.transition = '';
        el.style.transform = '';
        // add class that triggers CSS animation
        el.classList.add('spinning');
      });
    }, 20);
  }

  /** Stoppe l'animation en cours et positionne chaque reel pour correspondre au résultat */
  private landToResult(resultSymbols: string[]) {
    // Wait a tick so DOM is stable
    setTimeout(() => {
      const strips = this.reelStrips.toArray();
      const cellHeight = this.getCellHeight();
      const centerOffset = Math.floor((this.visibleCells() / 2)) * cellHeight;

      // cleanup timer fallback (au cas où transitionend ne s'exécute pas) :
      const maxDuration = 1200 + (strips.length - 1) * 200;
      if (this.cleanupTimeout) clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = setTimeout(() => { this.forceCleanup(); }, maxDuration + 500);

      let lastStripEl: HTMLDivElement | null = null;
      for (let r = 0; r < Math.min(resultSymbols.length, strips.length); r++) {
        const targetSym = resultSymbols[r];
        const stripEl = strips[r].nativeElement as HTMLDivElement;
        lastStripEl = stripEl;

        // find index of the symbol in the last loop (from end)
        let targetIndexInSeq = -1;
        for (let idx = this.reels[r].sequence.length - 1; idx >= 0; idx--) {
          if (this.reels[r].sequence[idx] === targetSym) {
            targetIndexInSeq = idx;
            break;
          }
        }
        if (targetIndexInSeq < 0) targetIndexInSeq = Math.floor(Math.random() * this.reels[r].sequence.length);

        // stop CSS loop: remove class then force reflow to "freeze" animation
        stripEl.classList.remove('spinning');
        // force reflow
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        stripEl.offsetWidth;

        // compute translate so target is centered
        const translate = (targetIndexInSeq * cellHeight) - centerOffset;

        // transition duration (stagger by reel)
        const duration = 900 + r * 200;
        stripEl.style.transition = `transform ${duration}ms cubic-bezier(.2,.8,.2,1)`;
        stripEl.style.transform = `translateY(-${translate}px)`;

        // attach transitionend listener on each strip (but final cleanup on last strip)
        const onEnd = (ev: TransitionEvent) => {
          // remove listener
          stripEl.removeEventListener('transitionend', onEnd);
        };
        stripEl.addEventListener('transitionend', onEnd);

        // also set a per-strip fallback in case transitionend doesn't fire
        const toId = setTimeout(() => {
          try { stripEl.removeEventListener('transitionend', onEnd); } catch {}
        }, duration + 400);
        this.transitionTimeouts.push(toId);
      }

      // attach final listener on last strip to re-enable UI
      if (lastStripEl) {
        const finalOnEnd = () => {
          // clear fallback cleanup
          this.clearAllTimers();
          // small timeout to allow user to see result
          setTimeout(() => { this.enCours = false; }, 120);
          lastStripEl!.removeEventListener('transitionend', finalOnEnd);
        };
        lastStripEl.addEventListener('transitionend', finalOnEnd);

        // ensure fallback cleanup after expected duration
        const finalTimeout = setTimeout(() => {
          try {
            lastStripEl!.removeEventListener('transitionend', finalOnEnd);
          } catch {}
          this.forceCleanup();
        }, (900 + (strips.length - 1) * 200) + 800);
        this.transitionTimeouts.push(finalTimeout);
      } else {
        // pas de strips trouvés -> cleanup immédiat
        this.forceCleanup();
      }
    }, 40);
  }

  /** Removes spinning classes and inline transitions (immediate stop) */
  private stopAllSpinImmediate() {
    this.reelStrips.forEach(elref => {
      const el = elref.nativeElement;
      el.classList.remove('spinning');
      el.style.transition = '';
    });
    this.clearAllTimers();
  }

  private forceCleanup() {
    // stop all animation classes and inline transitions
    this.reelStrips.forEach(elref => {
      const el = elref.nativeElement;
      el.classList.remove('spinning');
      el.style.transition = '';
    });
    this.clearAllTimers();
    this.enCours = false;
  }

  private clearAllTimers() {
    if (this.cleanupTimeout) { clearTimeout(this.cleanupTimeout); this.cleanupTimeout = null; }
    this.transitionTimeouts.forEach(t => clearTimeout(t));
    this.transitionTimeouts = [];
  }

  private getCellHeight(): number {
    const firstStrip = this.reelStrips.first;
    if (!firstStrip) return 64;
    const cell = firstStrip.nativeElement.querySelector('.cell') as HTMLElement | null;
    if (!cell) return 64;
    return Math.max(32, Math.round(cell.getBoundingClientRect().height));
  }

  private visibleCells(): number {
    return 3;
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.configSub?.unsubscribe();
    this.clearAllTimers();
  }
}
