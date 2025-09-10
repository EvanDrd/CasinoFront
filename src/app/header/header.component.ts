// src/app/header/header.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { WalletService } from '../services/wallet.service';
import { BalanceHeaderComponent } from './balance-header.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, BalanceHeaderComponent],
  templateUrl: './header.component.html'
})
export class HeaderComponent {
  email = '';
  motDePasse = '';
  loading = false;
  error: string | null = null;
  userObj: { email?: string; pseudo?: string } | null = null;

  constructor(
    private authService: AuthService,
    private wallet: WalletService,
    protected router: Router
  ) {
    this.loadUser();
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  loadUser() {
    const u = localStorage.getItem('user');
    if (u) {
      try { this.userObj = JSON.parse(u); } catch { this.userObj = null; }
    } else {
      this.userObj = null;
    }
  }

  submitLogin() {
    this.error = null;
    if (!this.email || !this.motDePasse) {
      this.error = 'Email et mot de passe requis.';
      return;
    }
    this.loading = true;
    this.authService.login(this.email, this.motDePasse).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.error = null;
        this.loadUser();
        // walletService connexion / refresh géré par AuthService.login via injector
        // rester sur la même page (home)
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error || 'Identifiants invalides';
      }
    });
  }

  logout() {
    this.authService.logout();
    this.wallet.clear?.(); // si WalletService possède clear (sécurisé)
    this.loadUser();
    // stay on home
    this.router.navigate(['/home']);
  }
}
