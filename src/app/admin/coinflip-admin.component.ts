import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CoinflipService } from '../services/game/coinflip.service';
import { FormsModule } from '@angular/forms';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-coinflip-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './coinflip-admin.component.html'
})
export class CoinflipAdminComponent {
  probPile: number = 0.5;
  loading = false;
  message: string | null = null;
  error: string | null = null;

  constructor(private game: CoinflipService) {
    this.game.getBias().subscribe(res => this.probPile = res.probPile);
  }

  save() {
    this.loading = true;
    this.error = null;
    this.message = null;
    // GameService.setBias envoie JWT via interceptor
    this.game.setBias(this.probPile)
      .subscribe({
        next: (res: any) => {
          this.message = 'Probabilité mise à jour.';
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.error || 'Erreur lors de la mise à jour';
          this.loading = false;
        }
      });
  }
}
