import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';

@Component({
  selector: 'app-my-policies',
  templateUrl: './my-policies.component.html'
})
export class MyPoliciesComponent implements OnInit {
  policies: any[] = [];
  loading = false;

  constructor(public walletService: WalletService, private contractService: ContractService) {}

  async ngOnInit() {
    await this.loadPolicies();
  }

  async loadPolicies() {
    if (!this.walletService.account) return;
    this.loading = true;
    try {
      this.policies = await this.contractService.getPolicies(this.walletService.account);
    } catch (err) {
      console.error(err);
      this.policies = [];
    }
    this.loading = false;
  }

  // Helper method to check if a policy is claimed
  isClaimed(policy: any): boolean {
    return policy.claimed || false;
  }
}

