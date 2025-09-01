import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthResponse } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html'
})
export class RegisterComponent {
  formulaire: FormGroup;           // on ne l'initialise plus ici
  enCours = false;
  messageSucces: string | null = null;
  messageErreur: string | null = null;
  tokenRecus: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // initialisation APRÈS injection du FormBuilder
    this.formulaire = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      pseudo: ['', [Validators.required, Validators.minLength(3)]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  envoyer() {
    if (this.formulaire.invalid) {
      this.formulaire.markAllAsTouched();
      return;
    }

    this.enCours = true;
    this.messageErreur = null;
    this.messageSucces = null;

    // On récupère les valeurs et on assure le type string (non-null) avec "!" car le formulaire est validé
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
        localStorage.setItem('casino_token', res.token);
      });
  }
}
