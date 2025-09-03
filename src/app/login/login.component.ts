import { Component, OnInit } from '@angular/core';
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
export class LoginComponent implements OnInit {
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

  ngOnInit() {
    // si déjà connecté, va directement sur /home
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, motDePasse } = this.loginForm.value;
      this.authService.login(email!, motDePasse!).subscribe({
        next: (res: any) => {
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
