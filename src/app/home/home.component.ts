import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, AuthResponse } from '../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h2>Bienvenue {{ pseudo }} 🎉</h2>
    <button (click)="logout()">Se déconnecter</button>
  `
})
export class HomeComponent {
  pseudo: string | null = null;

  constructor(private authService: AuthService) {
    // récupérer le pseudo depuis le localStorage (sauvegardé au login)
    const user = localStorage.getItem('user');
    if (user) {
      this.pseudo = JSON.parse(user).pseudo;
    }
  }

  logout() {
    this.authService.logout();
    window.location.href = '/login'; // redirige vers login
  }
}
