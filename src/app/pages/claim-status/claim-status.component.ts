import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';

@Component({
  selector: 'app-claim-status',
  templateUrl: './claim-status.component.html'
})
export class ClaimStatusComponent implements OnInit {
  policies: any[] = [];
  loading = false;
  claimStatus: boolean[] = [];

  constructor(public walletService: WalletService, private contractService: ContractService) {}

  async ngOnInit() {
    await this.loadPolicies();
    await this.loadClaimStatus();
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

  async loadClaimStatus() {
    if (!this.walletService.account || this.policies.length === 0) return;
    
    this.claimStatus = [];
    for (let i = 0; i < this.policies.length; i++) {
      try {
        const isClaimed = await this.contractService.checkClaimed(this.walletService.account, i);
        this.claimStatus.push(isClaimed);
      } catch (err) {
        console.error(`Error checking claim status for policy ${i}:`, err);
        this.claimStatus.push(false);
      }
    }
  }

  getClaimedCount(): number {
    return this.claimStatus.filter(status => status).length;
  }

  getActiveCount(): number {
    return this.claimStatus.filter(status => !status).length;
  }

  isClaimed(index: number): boolean {
    return this.claimStatus[index] || false;
  }
}

