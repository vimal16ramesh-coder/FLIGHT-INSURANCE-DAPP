// src/app/pages/my-policies/my-policies.component.ts
import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';
import { ethers } from 'ethers';

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

  // load policies belonging to the connected account and normalize fields
  async loadPolicies() {
    if (!this.walletService.account) return;
    this.loading = true;

    try {
      const raw = await this.contractService.getPoliciesForUser(this.walletService.account);

      // log raw policies so you can inspect what fields exist
      console.log('raw policies from contract:', raw);

      // Normalize each policy so the template can safely use fields
      this.policies = raw.map((p: any) => {
        // p may include BigNumber fields; don't assume 'date' exists
        const normalized: any = {
          id: p.id ?? null,
          user: p.user ?? '',
          flightId: p.flightId ?? '',
          active: typeof p.active !== 'undefined' ? p.active : false
        };

        // If contract returned a 'date' field and it's a BigNumber, convert it
        if (p.date && typeof p.date.toNumber === 'function') {
          normalized.date = p.date; // keep BigNumber for possible use
          normalized.dateNum = p.date.toNumber(); // plain number (seconds)
        } else {
          normalized.date = undefined;
          normalized.dateNum = undefined;
        }

        // Premium / payout fields might be BigNumbers too
        if (p.premium && typeof p.premium.toString === 'function') {
          normalized.premiumWei = p.premium.toString();
          try {
            normalized.premiumEth = Number(ethers.utils.formatEther(p.premium)).toFixed(6);
          } catch (e) {
            normalized.premiumEth = null;
          }
        }

        if (p.payoutAmount && typeof p.payoutAmount.toString === 'function') {
          normalized.payoutWei = p.payoutAmount.toString();
          try {
            normalized.payoutEth = Number(ethers.utils.formatEther(p.payoutAmount)).toFixed(6);
          } catch (e) {
            normalized.payoutEth = null;
          }
        }

        return normalized;
      });

    } catch (err) {
      console.error('Error loading policies:', err);
      this.policies = [];
    }

    this.loading = false;
  }

  // Returns a friendly date string or 'N/A' if not present
  dateString(policy: any): string {
    if (!policy) return 'N/A';
    // If we have dateNum (seconds)
    if (policy.dateNum !== undefined && policy.dateNum !== null) {
      const dt = new Date(policy.dateNum * 1000);
      return dt.toLocaleDateString();
    }
    // If there is a BigNumber 'date' we can still try
    if (policy.date && typeof policy.date.toNumber === 'function') {
      const dt = new Date(policy.date.toNumber() * 1000);
      return dt.toLocaleDateString();
    }
    return 'N/A';
  }

  // Is this policy claimed/processed? (depends on your contract; using 'active' as example)
  isClaimed(policyOrIndex: any): boolean {
    if (typeof policyOrIndex === 'number') {
      const policy = this.policies[policyOrIndex];
      return policy ? !policy.active : false; // example: active=true means not claimed
    }
    // If passed a policy object:
    const p = policyOrIndex;
    if (!p) return false;
    // adapt this logic to your contract's semantics
    if (typeof p.active !== 'undefined') {
      // return true if claim is processed — adjust depending on your contract
      return !p.active;
    }
    // fallback
    return !!p.claimed;
  }
}
