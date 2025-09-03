import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class GuestGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (!this.authService.isLoggedIn()) {
      return true; // utilisateur non connecté => accès autorisé à login/register
    }
    // utilisateur connecté => redirige vers /home
    this.router.navigate(['/home']);
    return false;
  }
}
