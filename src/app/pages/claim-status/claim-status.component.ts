// src/app/pages/claim-status/claim-status.component.ts
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
  errorMessage = '';

  constructor(public walletService: WalletService, private contractService: ContractService) {}

  async ngOnInit() {
    await this.loadPolicies();
    await this.loadClaimStatus();
  }

  async loadPolicies() {
    if (!this.walletService.account) return;
    this.loading = true;
    this.errorMessage = '';
    try {
      // Use new method name
      this.policies = await this.contractService.getPoliciesForUser(this.walletService.account);
    } catch (err) {
      console.error('Error loading policies:', err);
      this.policies = [];
      this.errorMessage = err && err.message ? err.message : String(err);
    } finally {
      this.loading = false;
    }
  }

  // Build claimStatus array from policy.active
  async loadClaimStatus() {
    if (!this.walletService.account || this.policies.length === 0) {
      this.claimStatus = [];
      return;
    }

    this.claimStatus = this.policies.map(p => {
      // if active === false -> considered claimed
      return !(p.active === true);
    });
  }

  getClaimedCount(): number {
    return this.claimStatus.filter(s => s).length;
  }

  getActiveCount(): number {
    return this.claimStatus.filter(s => !s).length;
  }

  isClaimed(index: number): boolean {
    return this.claimStatus[index] || false;
  }

  // If you want to refresh UI
  async refreshAll() {
    await this.loadPolicies();
    await this.loadClaimStatus();
  }
}
