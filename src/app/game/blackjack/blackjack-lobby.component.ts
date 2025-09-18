import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BlackjackService, BJTableSummary } from '../../services/game/blackjack.service';
import { Subscription, combineLatest, timer } from 'rxjs';
import { AuthService } from '../../services/auth.service';

type Visibility = 'PUBLIC' | 'PRIVATE';

interface CreateForm {
  name: string;       // uniquement UI (pas envoyé au back pour l’instant)
  maxSeats: number;
  minBet: number;     // UI
  maxBet: number;     // UI
  visibility: Visibility;
  code?: string;      // si PRIVÉE
}

@Component({
  selector: 'app-blackjack-lobby',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blackjack-lobby.component.html',
  styleUrls: ['./blackjack-lobby.component.css']
})
export class BlackjackLobbyComponent implements OnInit, OnDestroy {
  tables: BJTableSummary[] = [];
  loading = false;
  error: string | null = null;
  isLoggedIn = false;

  // Modèle pour le formulaire d’UI (pas strictement aligné avec l’API)
  create: CreateForm = {
    name: '',
    maxSeats: 5,
    minBet: 100,
    maxBet: 5000,
    visibility: 'PUBLIC',
    code: ''
  };

  private sub?: Subscription;

  constructor(
    private bj: BlackjackService,
    private router: Router,
    private auth: AuthService
  ) {
    this.isLoggedIn = this.auth.isLoggedIn();
  }

  ngOnInit(): void {
    // Connexion WS pour recevoir le lobby en temps réel
    this.bj.connectIfNeeded();

    // Pull initial + push via WS
    this.loading = true;
    this.sub = combineLatest([this.bj.lobby$, timer(0)]).subscribe(([ws]) => {
      if (ws) {
        this.tables = ws;
        this.loading = false;
      } else {
        this.bj.listTables().subscribe({
          next: (t) => { this.tables = t; this.loading = false; },
          error: () => { this.error = 'Impossible de charger les tables.'; this.loading = false; }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  goTable(t: BJTableSummary) {
    this.router.navigate(['/play/blackjack/table', t.id]);
  }

  async onCreate() {
    if (!this.isLoggedIn) { this.error = 'Connecte-toi pour créer une table.'; return; }
    this.loading = true; this.error = null;

    // Map UI -> DTO API
    const req = {
      privateTable: this.create.visibility === 'PRIVATE',
      maxSeats: Number(this.create.maxSeats) || 5,
      code: this.create.visibility === 'PRIVATE' ? (this.create.code || '') : undefined
    };

    this.bj.createTable(req).subscribe({
      next: async (res) => {
        this.loading = false;
        const id = res.id;
        // Navigue, s’abonne, puis auto-join + auto-sit(0) pour démarrer direct en solo
        this.router.navigate(['/play/blackjack/table', id]);
        await this.bj.watchTable(id);
        await this.bj.wsJoin(id);
        await this.bj.wsSit(id, 0);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error || 'Création impossible';
      }
    });
  }
}
