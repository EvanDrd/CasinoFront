import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService, AuthResponse } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent implements OnInit {
  formulaire: FormGroup;
  enCours = false;
  messageSucces: string | null = null;
  messageErreur: string | null = null;
  tokenRecus: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.formulaire = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      pseudo: ['', [Validators.required, Validators.minLength(3)]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  envoyer() {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }

    this.enCours = true;
    this.messageErreur = null;
    this.messageSucces = null;

    const email = this.formulaire.get('email')!.value as string;
    const pseudo = this.formulaire.get('pseudo')!.value as string;
    const motDePasse = this.formulaire.get('motDePasse')!.value as string;

    const payload: { email: string; pseudo: string; motDePasse: string } = {
      email,
      pseudo,
      motDePasse
    };

    this.authService.inscription(payload)
      .pipe(
        catchError(err => {
          this.messageErreur = err?.error || 'Erreur réseau ou serveur';
          this.enCours = false;
          return of(null);
        })
      )
      .subscribe((res: AuthResponse | null) => {
        this.enCours = false;
        if (!res) return;
        this.tokenRecus = res.token;
        this.messageSucces = 'Inscription réussie — token reçu.';
        // localStorage.setItem('casino_token', res.token);
        // si tu veux rediriger automatiquement après inscription :
        // this.router.navigate(['/home']);
      });
  }
}
