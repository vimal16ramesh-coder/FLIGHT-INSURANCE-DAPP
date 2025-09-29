import { Component } from '@angular/core';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';

@Component({
  selector: 'app-buy-policy',
  templateUrl: './buy-policy.component.html'
})
export class BuyPolicyComponent {
  flightId = '';
  date = '';
  loading = false;

  constructor(public walletService: WalletService, private contractService: ContractService) {}

  async buyPolicy() {
    if (!this.flightId || !this.date) {
      alert('Please fill Flight ID and Flight Date');
      return;
    }
    this.loading = true;
    try {
      const timestamp = Math.floor(new Date(this.date).getTime() / 1000);
      await this.contractService.buyPolicy(this.flightId, timestamp);
      alert('Policy purchased!');
      this.flightId = '';
      this.date = '';
    } catch (err) {
      alert('Failed to buy policy');
      console.error(err);
    }
    this.loading = false;
  }
}
