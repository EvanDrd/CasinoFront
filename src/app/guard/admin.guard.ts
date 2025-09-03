import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const user = localStorage.getItem('user');
    if (!user) {
      this.router.navigate(['/login']);
      return false;
    }
    try {
      const parsed = JSON.parse(user);
      if (parsed.role === 'ADMIN') return true;
    } catch {}
    this.router.navigate(['/home']);
    return false;
  }
}
