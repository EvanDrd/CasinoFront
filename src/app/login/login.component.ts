import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <h2>Connexion</h2>
    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
      <label>Email :</label>
      <input type="email" formControlName="email">

      <label>Mot de passe :</label>
      <input type="password" formControlName="motDePasse">

      <button type="submit" [disabled]="loginForm.invalid">Se connecter</button>
    </form>
    <p *ngIf="errorMessage" style="color:red">{{ errorMessage }}</p>
  `
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, motDePasse } = this.loginForm.value;
      this.authService.login(email!, motDePasse!).subscribe({
        next: (res: any) => { // 👈 typage explicite
          console.log('Connexion réussie ✅', res);
          window.location.href = '/home';
        },
        error: () => {
          this.errorMessage = 'Identifiants invalides ❌';
        }
      });
    }
  }
}
