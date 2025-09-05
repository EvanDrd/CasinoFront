import { Routes } from '@angular/router';
import { RegisterComponent } from './register/register.component';
import { LoginComponent } from './login/login.component';
import { HomeComponent } from './home/home.component';
import { AuthGuard } from './guard/auth.guard';
import { GuestGuard } from './guard/guest.guard';
import { AdminGuard } from './guard/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'register', component: RegisterComponent, canActivate: [GuestGuard] },
  { path: 'login', component: LoginComponent, canActivate: [GuestGuard] },
  { path: 'home', component: HomeComponent, canActivate: [AuthGuard] },
  { path: 'play/coinflip', loadComponent: () => import('./game/coinflip/coinflip.component').then(m => m.CoinflipComponent) },
  { path: 'admin/coinflip', loadComponent: () => import('./admin/coinflip-admin.component').then(m => m.CoinflipAdminComponent), canActivate: [AuthGuard, AdminGuard] },
  { path: 'play/slots', loadComponent: () => import('./game/slot/slot-machine.component').then(m => m.SlotMachineComponent), canActivate: [AuthGuard] },
  { path: 'admin/slots', loadComponent: () => import('./admin/slots-admin.component').then(m => m.SlotsAdminComponent), canActivate: [AuthGuard, AdminGuard] }


  // autres routes...
];
