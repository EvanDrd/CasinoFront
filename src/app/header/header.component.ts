import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { WalletService } from '../services/wallet.service';
import { BalanceHeaderComponent } from './balance-header.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule, BalanceHeaderComponent, RouterLink],
  templateUrl: './header.component.html'
})
export class HeaderComponent  {
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
      next: () => {
        this.loading = false;
        this.error = null;
        this.loadUser();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error || 'Identifiants invalides';
      }
    });
  }

  logout() {
    this.authService.logout();
    this.wallet.clear?.();
    this.loadUser();
    this.router.navigate(['/home']);
  }
}
