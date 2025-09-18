// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { HomeComponent } from './home/home.component';
import { AuthGuard } from './guard/auth.guard';
import { GuestGuard } from './guard/guest.guard';
import { AdminGuard } from './guard/admin.guard';
import { GameHistoryComponent } from './history/game-history.component';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },

  // Inscription : seulement pour invités
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },

  // Home accessible à tous
  { path: 'home', component: HomeComponent },

  // === JEUX : APERÇU LIBRE (AuthGuard retiré) ===
  // ⚠️ Les composants désactivent les mises quand !isLoggedIn
  { path: 'play/coinflip', loadComponent: () => import('./game/coinflip/coinflip.component').then(m => m.CoinflipComponent) },
  { path: 'play/slots',    loadComponent: () => import('./game/slot/slot-machine.component').then(m => m.SlotMachineComponent) },
  { path: 'play/roulette', loadComponent: () => import('./game/roulette/roulette.component').then(m => m.RouletteComponent) },
  // src/app/app.routes.ts (ajoute les 2 lignes ci-dessous)
  { path: 'play/blackjack', loadComponent: () => import('./game/blackjack/blackjack-lobby.component').then(m => m.BlackjackLobbyComponent) },
  { path: 'play/blackjack/table/:id', loadComponent: () => import('./game/blackjack/blackjack-table.component').then(m => m.BlackjackTableComponent) },



  { path: 'admin/coinflip',  loadComponent: () => import('./admin/coinflip-admin.component').then(m => m.CoinflipAdminComponent),  canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/slots',     loadComponent: () => import('./admin/slots-admin.component').then(m => m.SlotsAdminComponent),        canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/roulette',  loadComponent: () => import('./admin/roulette-admin.component').then(m => m.RouletteAdminComponent),  canActivate: [AuthGuard, AdminGuard] },

  // Historique : si tu veux le laisser privé, on garde AuthGuard
  { path: 'history', component: GameHistoryComponent, canActivate: [AuthGuard] },

  // Fallback
  { path: '**', redirectTo: 'home' }
];
