import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BalanceHeaderComponent } from './header/balance-header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, BalanceHeaderComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'CasinoFront';
}
