import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouletteService } from '../services/game/roulette.service';

@Component({
  selector: 'app-roulette-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roulette-admin.component.html'})
export class RouletteAdminComponent implements OnInit {
  numbers = Array.from({length: 37}, (_, i) => i);
  weights: Record<number, number> = {};

  loading = false;
  message: string | null = null;
  error: string | null = null;

  constructor(private service: RouletteService) {}

  ngOnInit(): void {
    // valeurs par défaut à 1
    this.numbers.forEach(n => this.weights[n] = 1);

    // charger depuis le backend si présent
    this.service.getProbabilities().subscribe({
      next: res => {
        // res.weights peut être null selon l'API ; on s'assure d'avoir un objet
        const w = res?.weights ?? null;
        if (w) {
          // w est maintenant non-null : on peut indexer sans erreur TS
          this.numbers.forEach(n => {
            // si la clé manque, on met 0 (ou 1 si tu préfères)
            this.weights[n] = (w[n] ?? 0);
          });
        } else {
          // si pas de poids côté serveur, on garde la valeur par défaut (1)
          // optionnel : mettre tout à 0 si tu préfères
        }
      },
      error: err => {
        // fail silently but set a message optionally
        this.error = 'Impossible de charger les probabilités (le backend a répondu une erreur)';
        // console.log(err);
      }
    });
  }

  save() {
    this.loading = true;
    this.message = null;
    this.error = null;
    // remove zero weights to keep payload small (optional)
    const payload: Record<number, number> = {};
    for (const k of this.numbers) {
      const w = Number(this.weights[k]);
      if (!isNaN(w) && w > 0) payload[k] = Math.floor(w);
    }
    this.service.updateProbabilities(payload).subscribe({
      next: () => {
        this.loading = false;
        this.message = 'Probabilités mises à jour';
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Erreur serveur';
      }
    });
  }

  reset() {
    if (!confirm('Réinitialiser les probabilités et revenir au tirage équitable ?')) return;
    this.service.resetProbabilities().subscribe({
      next: () => {
        this.numbers.forEach(n => this.weights[n] = 1);
        this.message = 'Probabilités réinitialisées';
        this.error = null;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Erreur serveur';
      }
    });
  }
}
