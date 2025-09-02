import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, motDePasse } = this.loginForm.value;
      this.authService.login(email!, motDePasse!).subscribe({
        next: (res: any) => {
          console.log('Connexion réussie ✅', res);
          // navigation via Router (meilleure pratique Angular)
          this.router.navigate(['/home']);
        },
        error: () => {
          this.errorMessage = 'Identifiants invalides ❌';
        }
      });
    }
  }

  protected readonly alert = alert;
}
