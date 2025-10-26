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
    // pick premium e.g. 0.01 ETH — or ask user for premium input
    const premiumInEth = "0.01";
    await this.contractService.buyPolicy(this.flightId, premiumInEth);
    alert('Policy purchased!');
    this.flightId = '';
    this.date = '';
  } catch (err) {
    console.error(err);
    alert('Failed to buy policy: ' + (err && err.message ? err.message : err));
  }
  this.loading = false;
}


}
