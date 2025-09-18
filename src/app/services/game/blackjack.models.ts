// src/app/services/game/blackjack.models.ts
export type BJSeatStatus = 'EMPTY' | 'OCCUPIED' | 'DISCONNECTED';
export type BJPhase = 'WAITING' | 'BETTING' | 'PLAYING' | 'SETTLING';

export interface BJCard {
  rank: string;               // "A","2",...,"K"
  suit: '♠' | '♥' | '♦' | '♣';
  value: number;
}

export interface BJPlayerState {
  cards: BJCard[];
  standing: boolean;
  busted: boolean;
  bet: number;
  total: number;
  hasTurn?: boolean;
  canDouble?: boolean;
}

export interface BJSeat {
  index: number;
  userId?: number;
  email?: string;
  status: BJSeatStatus;
  hand: BJPlayerState;
}

export interface BJDealer {
  cards: BJCard[];
  total: number;
}

export interface BJTableState {
  id: string;
  name?: string;
  maxSeats: number;
  seats: BJSeat[];
  dealer: BJDealer;
  phase: BJPhase;
  minBet: number;
  maxBet: number;
  createdAt?: string;
  shoeCount?: number;
  currentSeatIndex?: number;
  deadline?: number;

  // <-- NOUVEAU : on garde le dernier résultat pour affichage
  lastPayouts?: BJPayout[];
}

export interface BJTableSummary {
  id: number;
  maxSeats: number;
  isPrivate: boolean;
  phase: BJPhase | string;
}

// --- REST create (ton back actuel) ---
export interface BJCreateTableReq {
  privateTable?: boolean;
  maxSeats?: number;
  code?: string;
}

export interface BJCreateTableRes {
  id: string;
  private: boolean;
  code?: string;
}

// --- Formulaire UI (pour le lobby) ---
export type BJVisibility = 'PUBLIC' | 'PRIVATE';
export interface BJCreateTableForm {
  name: string;      // UI only
  maxSeats: number;
  minBet: number;    // UI only
  maxBet: number;    // UI only
  visibility: BJVisibility;
  code?: string;     // si PRIVATE
}

export interface BJPayout {
  seat: number;
  bet: number;
  credit: number;
  total: number;
  outcome: 'WIN'|'LOSE'|'PUSH'|'BLACKJACK';
}

// --- WS payloads (alignés avec tes @MessageMapping) ---
export interface JoinOrCreateMsg { tableId?: string; }
export interface SitMsg { tableId: string; seatIndex: number; }
export interface BetMsg { tableId: string; amount: number; }
export type ActionType = 'HIT'|'STAND'|'DOUBLE'|'SPLIT'|'SURRENDER';
export interface ActionMsg { tableId: string; type: ActionType; }



