// src/app/services/game/blackjack.service.ts
import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {BJSeat, BJTableState} from './blackjack.models';

// --- DTOs alignés avec ton back ---
export interface BJCreateTableReq {
  privateTable?: boolean;
  maxSeats?: number;
  code?: string;        // optionnel si privé
}

export interface BJTableSummary {
  id: number;           // Long côté back => number ici
  maxSeats: number;
  isPrivate: boolean;
  phase: string;
}

export interface JoinOrCreateMsg {
  tableId?: number | string;
}

export interface SitMsg { tableId: number | string; seatIndex: number; }
export interface BetMsg { tableId: number | string; amount: number; seatIndex?: number; }
export type ActionType = 'HIT'|'STAND'|'DOUBLE'|'SPLIT'|'SURRENDER';
export interface ActionMsg { tableId: number | string; seatIndex: number; type: ActionType; }

@Injectable({ providedIn: 'root' })
export class BlackjackService {
  private apiBase = 'http://localhost:8080/api/bj';
  private wsUrl  = 'http://localhost:8080/ws';

  private lobbySubject = new BehaviorSubject<BJTableSummary[] | null>(null);
  lobby$ = this.lobbySubject.asObservable();

  private tableSubject = new BehaviorSubject<any | null>(null);
  table$ = this.tableSubject.asObservable();

  private stomp?: Client;
  private currentTableId?: number | string;
  private onConnectedResolvers: Array<() => void> = [];

  constructor(private http: HttpClient, private zone: NgZone) {}

  // --- REST ---
  listTables(): Observable<BJTableSummary[]> {
    return this.http.get<BJTableSummary[]>(`${this.apiBase}/tables`);
  }

  createTable(req: BJCreateTableReq) {
    return this.http.post<{ id: number | string; code?: string; private: boolean }>(
      `${this.apiBase}/table`, req
    );
  }

  // --- WS connection promise ---
  private waitConnected(): Promise<void> {
    if (this.stomp && this.stomp.connected) return Promise.resolve();
    return new Promise<void>((resolve) => this.onConnectedResolvers.push(resolve));
  }

  // src/app/services/game/blackjack.service.ts
  // src/app/services/game/blackjack.service.ts (méthode connectIfNeeded)
  connectIfNeeded() {
    if (this.stomp && this.stomp.active) return;

    const token = localStorage.getItem('jwt') || '';
    const urlWithToken = `${this.wsUrl}?token=${encodeURIComponent(token)}`;

    this.stomp = new Client({
      webSocketFactory: () => new SockJS(urlWithToken),
      // ⬇️ très important: envoyer le JWT aussi dans les headers STOMP CONNECT
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        token
      },
      reconnectDelay: 1500,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        // débloque les promesses d'attente
        const toResolve = [...this.onConnectedResolvers];
        this.onConnectedResolvers.length = 0;
        toResolve.forEach(r => r());

        // (ré)abonnements
        this.stomp!.subscribe('/topic/bj/lobby', (msg) => this.zone.run(() => this.onLobby(msg)));
        if (this.currentTableId != null) {
          this.subscribeTableTopic(this.currentTableId);
        }
      },
      onStompError: () => {}
    });

    this.stomp.activate();
  }




  private onLobby(msg: IMessage) {
    try {
      const payload: BJTableSummary[] = JSON.parse(msg.body);
      this.lobbySubject.next(payload);
    } catch {}
  }

  private subscribeTableTopic(tableId: number | string) {
    // Assure-toi que ça matche bien le back: "/topic/bj/table/{id}"
    this.stomp?.subscribe(`/topic/bj/table/${tableId}`, (msg) =>
      this.zone.run(() => this.onTableEvent(msg))
    );
  }
  private onTableEvent(msg: IMessage) {
    try {
      const evt = JSON.parse(msg.body);
      if (!evt || !evt.type) return;
      const curr = this.tableSubject.value ? { ...this.tableSubject.value } : null;

      switch (evt.type) {
        case 'TABLE_STATE': {
          const state = this.normalizeState(evt.payload);
          this.tableSubject.next(state);
          break;
        }
        case 'HAND_START': {
          if (!curr) break;
          const s = { ...curr };
          s.seats = this.normalizeSeatsMap(evt.payload.players);
          // s.dealerUp possible mais on affiche via phase
          s.phase = 'PLAYING';
          s.deadline = evt.payload.deadline ?? s.deadline;
          this.tableSubject.next(s);
          break;
        }
        case 'PLAYER_TURN': {
          if (!curr) break;
          const s = { ...curr, currentSeatIndex: evt.payload.seat, deadline: evt.payload.deadline };
          this.tableSubject.next(s);
          break;
        }
        case 'BET_UPDATE': {
          if (!curr) break;
          const s = { ...curr };
          const i = evt.payload.seat;
          const bet = evt.payload.bet;
          if (s.seats?.[i]) s.seats[i] = { ...s.seats[i], hand: { ...s.seats[i].hand, bet } };
          this.tableSubject.next(s);
          break;
        }
        case 'ACTION_RESULT': {
          if (!curr) break;
          const s = { ...curr };
          const i = evt.payload.seat;
          if (s.seats?.[i] && evt.payload.hand) {
            s.seats[i] = { ...s.seats[i], hand: { ...s.seats[i].hand, ...evt.payload.hand } };
          }
          this.tableSubject.next(s);
          break;
        }
        case 'DEALER_TURN_START': {
          if (!curr) break;
          const s = { ...curr, phase: 'DEALER_TURN' };
          // evt.payload.dealer a la main en cours du dealer (révélée progressivement)
          if (evt.payload?.dealer) s.dealer = evt.payload.dealer;
          s.currentSeatIndex = undefined;
          this.tableSubject.next(s);
          break;
        }
        case 'DEALER_TURN_END': {
          if (!curr) break;
          const s = { ...curr };
          if (evt.payload?.dealer) s.dealer = evt.payload.dealer; // main finale révélée
          this.tableSubject.next(s);
          break;
        }
        case 'PAYOUTS': {
          if (!curr) break;
          const s = { ...curr, phase: 'PAYOUT', lastPayouts: evt.payload?.payouts ?? [] };
          this.tableSubject.next(s);
          break;
        }
        default:
          break;
      }
    } catch {}
  }

  // ---- NOUVEAU: normalisations ----
  private normalizeState(payload: any): {
    phase: any;
    createdAt: any;
    maxBet: any;
    minBet: any;
    name: any;
    dealer: any;
    currentSeatIndex: any;
    maxSeats: any;
    id: string;
    seats: BJSeat[];
    shoeCount: any
  } {
    return {
      id: String(payload.tableId ?? payload.id ?? ''),
      name: payload.name ?? undefined,
      maxSeats: payload.maxSeats ?? (payload.seats ? Object.keys(payload.seats).length : 5),
      seats: this.normalizeSeatsMap(payload.seats),
      dealer: payload.dealer ?? { cards: [], total: 0 },
      phase: this.normPhase(payload.phase),
      minBet: payload.minBet ?? 0,
      maxBet: payload.maxBet ?? 0,
      createdAt: payload.createdAt ?? undefined,
      shoeCount: payload.shoeCount ?? undefined,
      currentSeatIndex: payload.currentSeatIndex ?? undefined
    };
  }

  private normalizeSeatsMap(seatsMap: any): BJSeat[] {
    if (!seatsMap) return [];
    // seatsMap est un objet: { "0": Seat, "1": Seat, ... }
    return Object.keys(seatsMap)
      .map(k => Number(k))
      .sort((a, b) => a - b)
      .map(i => {
        const s = seatsMap[i];
        return {
          index: i,
          userId: s.userId,
          email: s.email,
          status: s.status,
          hand: s.hand
        } as BJSeat;
      });
  }

  private normPhase(p: any): any {
    if (!p) return 'WAITING';
    if (typeof p === 'string') return p;
    // enum serialisé → .name ?
    return p.name ?? 'WAITING';
  }

  private onTableState(msg: IMessage) {
    try {
      const payload = JSON.parse(msg.body);
      this.tableSubject.next(payload);
    } catch {}
  }

  /** Commence à recevoir l’état de la table (abonnement garanti après connexion). */
  async watchTable(tableId: number | string) {
    this.currentTableId = tableId;
    this.connectIfNeeded();
    await this.waitConnected();
    this.subscribeTableTopic(tableId);
  }

  // --- Envois d’actions via WS ---
  async wsJoin(tableId: number | string) {
    await this.waitConnected();
    this.publish('/app/bj/join', <JoinOrCreateMsg>{ tableId });
  }

  async wsSit(tableId: number | string, seatIndex: number) {
    await this.waitConnected();
    this.publish('/app/bj/sit', <SitMsg>{ tableId, seatIndex });
  }

  async wsBet(tableId: number | string, amount: number, seatIndex?: number) {
    await this.waitConnected();
    this.publish('/app/bj/bet', <BetMsg>{ tableId, amount, seatIndex });
  }

  async wsAction(tableId: number | string, type: ActionType, seatIndex: number) {
    await this.waitConnected();
    this.publish('/app/bj/action', <ActionMsg>{ tableId, seatIndex, type });
  }

  async wsLeave(tableId: number | string, seatIndex: number) {
    await this.waitConnected();
    this.publish('/app/bj/leave', <SitMsg>{ tableId, seatIndex });
  }

  private publish(dest: string, body: any) {
    if (!this.stomp || !this.stomp.connected) return;
    this.stomp.publish({ destination: dest, body: JSON.stringify(body) });
  }

  disconnectTable() {
    this.currentTableId = undefined;
    this.tableSubject.next(null);
  }

  disconnectAll() {
    this.currentTableId = undefined;
    this.lobbySubject.next(null);
    this.tableSubject.next(null);
    try { this.stomp?.deactivate(); } catch {}
    this.stomp = undefined;
  }
}
