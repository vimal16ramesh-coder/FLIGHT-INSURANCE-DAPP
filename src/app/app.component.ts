import { Component } from '@angular/core';
import { WalletService } from './core/services/wallet.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'flight-insurance-dapp';

  constructor(public walletService: WalletService) {}
}

