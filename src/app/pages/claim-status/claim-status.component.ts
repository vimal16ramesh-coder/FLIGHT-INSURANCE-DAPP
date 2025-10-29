import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';
import { ethers } from 'ethers';

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
    this.computeClaimStatusFromPolicies();
  }

  // load policies using the contract helper that iterates policyCount
  async loadPolicies() {
    if (!this.walletService.account) return;
    this.loading = true;
    try {
      const raw = await this.contractService.getPoliciesForUser(this.walletService.account);
      // normalize BigNumbers and make safe fields for templates
      this.policies = raw.map((p: any) => ({
        id: p.id,
        user: p.user,
        flightId: p.flightId,
        // if your contract doesn't have date, leave undefined
        date: p.date, // may be undefined
        premium: p.premium ?? undefined,
        premiumEth: p.premium ? Number(ethers.utils.formatEther(p.premium)).toFixed(6) : undefined,
        payoutAmount: p.payoutAmount ?? undefined,
        payoutEth: p.payoutAmount ? Number(ethers.utils.formatEther(p.payoutAmount)).toFixed(6) : undefined,
        active: typeof p.active === 'boolean' ? p.active : !!p.active // ensure boolean
      }));
      console.log('normalized policies for UI:', this.policies);
    } catch (err) {
      console.error('Failed loading policies:', err);
      this.policies = [];
    }
    this.loading = false;
  }

  // build claimStatus[] from the loaded policies (no external contract call required)
  computeClaimStatusFromPolicies() {
    // If policies not loaded yet, leave claimStatus empty
    if (!this.policies || this.policies.length === 0) {
      this.claimStatus = [];
      return;
    }
    // We'll treat policy.active === false as "claimed" (adjust if your contract uses a different meaning)
    this.claimStatus = this.policies.map(p => (p.active === false));
  }

  getClaimedCount(): number {
    return this.claimStatus.filter(status => status).length;
  }

  getActiveCount(): number {
    return this.claimStatus.filter(status => !status).length;
  }

  // called from template; safe (returns false if index out of range)
  isClaimed(index: number): boolean {
    return this.claimStatus[index] || false;
  }

  // safe date formatter: returns readable string or 'N/A' if no date on-chain
  dateString(policy: any): string {
    // policy.date may be a BigNumber, a number, undefined, or absent
    if (!policy) return 'N/A';
    const d = policy.date;
    try {
      if (d === undefined || d === null) return 'N/A';
      // if ethers BigNumber
      if (d && typeof d.toNumber === 'function') {
        return new Date(d.toNumber() * 1000).toLocaleDateString();
      }
      // if it's already a number (seconds)
      if (typeof d === 'number') {
        return new Date(d * 1000).toLocaleDateString();
      }
      // if it's a string timestamp
      if (typeof d === 'string' && /^\d+$/.test(d)) {
        return new Date(Number(d) * 1000).toLocaleDateString();
      }
    } catch (e) {
      console.warn('dateString conversion failed', e);
    }
    return 'N/A';
  }
}
