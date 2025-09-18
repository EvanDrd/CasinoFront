import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BlackjackService } from '../../services/game/blackjack.service';
import { BJSeat, BJTableState } from '../../services/game/blackjack.models';
import { Subscription } from 'rxjs';
import { WalletService } from '../../services/wallet.service';

@Component({
  selector: 'app-blackjack-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blackjack-table.component.html',
  styleUrls: ['./blackjack-table.component.css']
})
export class BlackjackTableComponent implements OnInit, OnDestroy {
  tableId!: number | string;
  state: BJTableState | null = null;
  loading = true;
  error: string | null = null;

  betAmount = 100;
  private sub?: Subscription;

  meEmail = (() => {
    try { return JSON.parse(localStorage.getItem('user')||'{}')?.email || null; }
    catch { return null; }
  })();

  constructor(private route: ActivatedRoute, private bj: BlackjackService,private wallet: WalletService) {}

  async ngOnInit(): Promise<void> {
    const raw = this.route.snapshot.paramMap.get('id');
    if (!raw) { this.error = 'Identifiant de table manquant'; this.loading = false; return; }
    this.tableId = /^\d+$/.test(raw) ? Number(raw) : raw;

    await this.bj.watchTable(this.tableId);
    await this.bj.wsJoin(this.tableId);
    // auto-sit seat 0 (solo)
    await this.bj.wsSit(this.tableId, 0);

    this.sub = this.bj.table$.subscribe(s => {
      this.state = s;
      this.loading = false;
      if (s?.phase === 'PAYOUT') {
        // re-synchronise pour éviter tout décalage perçu
        this.wallet.refreshBalance();
      }
    });
  }


  ngOnDestroy(): void {
    try {
      const me = this.mySeat();
      if (me) { this.bj.wsLeave(this.tableId, me.index); }
    } catch {}
    this.sub?.unsubscribe();
    this.bj.disconnectTable();
  }

  @HostListener('window:beforeunload')
  beforeUnload() {
    try {
      const me = this.mySeat();
      if (me) this.bj.wsLeave(this.tableId, me.index);
    } catch {}
  }

  // helpers
  mySeat(): BJSeat | null {
    if (!this.state || !this.state.seats || !this.meEmail) return null;
    return this.state.seats.find(s => s.email === this.meEmail) || null;
  }

  myTurn(): boolean {
    const me = this.mySeat();
    if (!me || !this.state) return false;
    const idx = this.state.currentSeatIndex;
    return typeof idx === 'number'
      ? idx === me.index && !me.hand.busted && !me.hand.standing
      : !!me.hand && !me.hand.busted && !me.hand.standing;
  }

  // actions via WS
  async join(index?: number) {
    await this.bj.wsJoin(this.tableId);
    if (index != null) await this.bj.wsSit(this.tableId, index);
  }

  async sit(index: number)             { await this.bj.wsSit(this.tableId, index); }
  async leave()                        { const me = this.mySeat(); if (me) await this.bj.wsLeave(this.tableId, me.index); }

  async bet() {
    if (!this.betAmount || this.betAmount <= 0) return;
    const me = this.mySeat();
    if (!me) return;
      this.bj.wsBet(this.tableId, this.betAmount, me.index);
  }

  async hit()        { const me = this.mySeat(); if (me) await this.bj.wsAction(this.tableId, 'HIT', me.index); }
  async stand()      { const me = this.mySeat(); if (me) await this.bj.wsAction(this.tableId, 'STAND', me.index); }
  async double()     { const me = this.mySeat(); if (me) await this.bj.wsAction(this.tableId, 'DOUBLE', me.index); }
  async split()      { const me = this.mySeat(); if (me) await this.bj.wsAction(this.tableId, 'SPLIT', me.index); }
  async surrender()  { const me = this.mySeat(); if (me) await this.bj.wsAction(this.tableId, 'SURRENDER', me.index); }

  asCardText(rank: string, suit: string) { return `${rank}${suit}`; }

  protected readonly Date = Date;
}
