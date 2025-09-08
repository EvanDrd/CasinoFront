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

  // repetitions for loop effect
  private loops = 6;

  // minimal visual spin duration (ms)
  private minSpinMs = 600;
  private spinStartAt = 0;

  private sub?: Subscription;
  private configSub?: Subscription;

  @ViewChildren('reelStrip') reelStrips!: QueryList<ElementRef<HTMLDivElement>>;

  // timers / fallbacks used by existing code
  private cleanupTimeout: any = null;
  private transitionTimeouts: any[] = [];

  // --- Auto-spin state ---
  autoSpinActive = false;                 // true = auto-spin ON
  autoSpinCount = 0;                      // configuré par l'UI (0 = infini)
  protected remainingAutoSpins: number | null = null; // null = infini
  private autoSpinDelay = 900;            // délai entre spins (ms)
  private autoSpinTimeoutId: any = null;  // timeout id pour enchaîner spins

  constructor(private game: SlotService, private wallet: WalletService, private cdr: ChangeDetectorRef) {
    this.sub = this.wallet.balance$.subscribe(b => this.currentBalance = b ?? null);

    // load config
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

  ngAfterViewInit(): void { /* nothing extra */ }

  private buildReels() {
    if (!this.symbols || this.symbols.length === 0) this.symbols = ['SYM'];
    this.reels = [];
    const pad = this.visibleCells(); // padding to avoid empty tail
    for (let r = 0; r < this.reelsCount; r++) {
      const seq: string[] = [];
      for (let l = 0; l < this.loops; l++) {
        for (const s of this.symbols) seq.push(s);
      }
      for (let p = 0; p < pad; p++) seq.push(this.symbols[p % this.symbols.length]);
      this.reels.push({ sequence: seq });
    }
  }

  // ----------------- play -----------------
  jouer() {
    this.error = null;
    this.lastResult = null;

    if (!this.mise || this.mise <= 0) { this.error = 'Mise invalide.'; return; }
    if (this.currentBalance != null && this.mise > this.currentBalance) { this.error = 'Solde insuffisant.'; return; }
    if (this.enCours) return; // safeguard

    this.enCours = true;
    this.spinStartAt = Date.now();

    this.startVisualSpin();

    this.game.playSlots({ montant: this.mise }).subscribe({
      next: (res) => {
        this.lastResult = res;
        const elapsed = Date.now() - this.spinStartAt;
        const wait = Math.max(0, this.minSpinMs - elapsed);
        setTimeout(() => {
          this.landToResult(res.reels);
          this.wallet.refreshBalance();
        }, wait);
      },
      error: (err) => {
        this.error = err?.error?.error || 'Erreur serveur ou solde insuffisant';
        this.stopAllSpinImmediate();
        this.enCours = false;
        // si auto-spin était actif, on déclenche la logique de terminaison
        this.onSpinComplete();
      }
    });
  }

  // ----------------- auto-spin API -----------------
  startAutoSpin() {
    if (this.autoSpinActive) return;
    // validation rapide
    if (!this.mise || this.mise <= 0) { this.error = 'Mise invalide.'; return; }
    if (this.currentBalance != null && this.mise > this.currentBalance) { this.error = 'Solde insuffisant pour auto-spin.'; return; }

    // configure remaining spins: null = infini
    this.remainingAutoSpins = (this.autoSpinCount && this.autoSpinCount > 0) ? Math.floor(this.autoSpinCount) : null;
    this.autoSpinActive = true;

    // start immediately if possible
    if (!this.enCours) {
      this.jouer();
    }
    // otherwise onSpinComplete() s'occupera d'enchaîner
  }

  stopAutoSpin() {
    this.autoSpinActive = false;
    this.remainingAutoSpins = null;
    if (this.autoSpinTimeoutId != null) {
      clearTimeout(this.autoSpinTimeoutId);
      this.autoSpinTimeoutId = null;
    }
  }

  // appelé systématiquement quand un spin se termine (succès ou erreur)
  private onSpinComplete() {
    // si auto-spin pas actif => rien à faire
    if (!this.autoSpinActive) return;

    // décrémente si on a un compteur
    if (this.remainingAutoSpins != null) {
      this.remainingAutoSpins = Math.max(0, this.remainingAutoSpins - 1);
    }

    // si compteur atteint 0 => stop
    if (this.remainingAutoSpins === 0) {
      this.stopAutoSpin();
      return;
    }

    // vérifie le solde avant d'enchaîner
    if (this.currentBalance != null && this.mise > this.currentBalance) {
      this.stopAutoSpin();
      this.error = 'Solde insuffisant — auto-spin arrêté.';
      return;
    }

    // planifie prochain spin (si auto toujours actif)
    if (this.autoSpinActive) {
      if (this.autoSpinTimeoutId != null) clearTimeout(this.autoSpinTimeoutId);
      this.autoSpinTimeoutId = window.setTimeout(() => {
        this.autoSpinTimeoutId = null;
        if (!this.enCours && this.autoSpinActive) {
          this.jouer();
        }
      }, this.autoSpinDelay);
    }
  }

  // ----------------- visuals & landing (inchangé mais on appelle onSpinComplete) -----------------
  private startVisualSpin() {
    this.buildReels();
    this.clearAllTimers();
    setTimeout(() => {
      this.reelStrips.forEach(elref => {
        const el = elref.nativeElement;
        el.style.transition = '';
        el.style.transform = '';
        el.classList.add('spinning');
      });
    }, 20);
  }

  private landToResult(resultSymbols: string[]) {
    setTimeout(() => {
      const strips = this.reelStrips.toArray();
      const cellHeight = this.getCellHeight();
      const centerOffset = Math.floor((this.visibleCells() / 2)) * cellHeight;

      const maxDuration = 1200 + (strips.length - 1) * 200;
      if (this.cleanupTimeout) clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = setTimeout(() => { this.forceCleanup(); }, maxDuration + 500);

      let lastStripEl: HTMLDivElement | null = null;
      for (let r = 0; r < Math.min(resultSymbols.length, strips.length); r++) {
        const targetSym = resultSymbols[r];
        const stripEl = strips[r].nativeElement as HTMLDivElement;
        lastStripEl = stripEl;

        // find best occurrence to avoid clamp
        const seq = this.reels[r].sequence;
        const seqLen = seq.length || 1;
        const totalHeight = stripEl.scrollHeight || (cellHeight * seqLen);
        const realCellHeight = Math.max(20, Math.round(totalHeight / seqLen));
        const visibleArea = Math.max(1, this.visibleCells()) * realCellHeight;
        const maxTranslate = Math.max(0, (seqLen * realCellHeight) - visibleArea);

        const candidates: number[] = [];
        for (let i = 0; i < seqLen; i++) if (seq[i] === targetSym) candidates.push(i);
        if (candidates.length === 0) candidates.push(Math.floor(Math.random() * seqLen));

        let bestIdx = candidates[0];
        let bestPenalty = Number.POSITIVE_INFINITY;
        for (const idx of candidates) {
          const desiredTranslate = (idx * realCellHeight) - centerOffset;
          const clamped = Math.min(Math.max(desiredTranslate, 0), maxTranslate);
          const penalty = Math.abs(clamped - desiredTranslate);
          if (penalty < bestPenalty || (penalty === bestPenalty && idx > bestIdx)) {
            bestPenalty = penalty;
            bestIdx = idx;
          }
        }

        const targetIndexInSeq = bestIdx;

        stripEl.classList.remove('spinning');
        // force reflow
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        stripEl.offsetWidth;

        let translate = (targetIndexInSeq * realCellHeight) - centerOffset;
        if (translate < 0) translate = 0;
        if (translate > maxTranslate) translate = maxTranslate;

        const duration = 900 + r * 200;
        stripEl.style.transition = `transform ${duration}ms cubic-bezier(.2,.8,.2,1)`;
        stripEl.style.transform = `translateY(-${translate}px)`;

        const onEnd = () => { try { stripEl.removeEventListener('transitionend', onEnd); } catch {} };
        stripEl.addEventListener('transitionend', onEnd);

        const toId = setTimeout(() => { try { stripEl.removeEventListener('transitionend', onEnd); } catch {} }, duration + 400);
        this.transitionTimeouts.push(toId);
      }

      if (lastStripEl) {
        const finalOnEnd = () => {
          try { lastStripEl!.removeEventListener('transitionend', finalOnEnd); } catch {}
          this.clearAllTimers();
          // small delay so player sees result, then mark spin finished
          setTimeout(() => {
            this.enCours = false;
            this.onSpinComplete();
          }, 120);
        };
        lastStripEl.addEventListener('transitionend', finalOnEnd);

        const finalTimeout = setTimeout(() => {
          try { lastStripEl!.removeEventListener('transitionend', finalOnEnd); } catch {}
          this.forceCleanup();
          // ensure auto-spin logic still runs even on fallback
          this.onSpinComplete();
        }, (900 + (strips.length - 1) * 200) + 800);
        this.transitionTimeouts.push(finalTimeout);
      } else {
        this.forceCleanup();
        this.onSpinComplete();
      }
    }, 40);
  }

  private stopAllSpinImmediate() {
    this.reelStrips.forEach(elref => {
      const el = elref.nativeElement;
      el.classList.remove('spinning');
      el.style.transition = '';
    });
    this.clearAllTimers();
  }

  private forceCleanup() {
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
    if (this.autoSpinTimeoutId != null) { clearTimeout(this.autoSpinTimeoutId); this.autoSpinTimeoutId = null; }
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
    this.stopAutoSpin();
  }
}
