import { Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { HomeComponent } from './home/home.component';
import { AuthGuard } from './guard/auth.guard';
import { GuestGuard } from './guard/guest.guard';
import { AdminGuard } from './guard/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },

  // home accessible par tous (le header contient le login)
  { path: 'home', component: HomeComponent },

  // pages de jeu / admin restent protégées
  { path: 'play/coinflip', loadComponent: () => import('./game/coinflip/coinflip.component').then(m => m.CoinflipComponent), canActivate: [AuthGuard] },
  { path: 'play/slots', loadComponent: () => import('./game/slot/slot-machine.component').then(m => m.SlotMachineComponent), canActivate: [AuthGuard] },
  { path: 'play/roulette', loadComponent: () => import('./game/roulette/roulette.component').then(m => m.RouletteComponent), canActivate: [AuthGuard] },

  { path: 'admin/coinflip', loadComponent: () => import('./admin/coinflip-admin.component').then(m => m.CoinflipAdminComponent), canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/slots', loadComponent: () => import('./admin/slots-admin.component').then(m => m.SlotsAdminComponent), canActivate: [AuthGuard, AdminGuard] },
  { path: 'admin/roulette', loadComponent: () => import('./admin/roulette-admin.component').then(m => m.RouletteAdminComponent), canActivate: [AuthGuard, AdminGuard] },

  // fallback
  { path: '**', redirectTo: 'home' }
];
