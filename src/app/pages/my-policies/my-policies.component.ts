// src/app/pages/my-policies/my-policies.component.ts
import { Component, OnInit } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';

@Component({
  selector: 'app-my-policies',
  templateUrl: './my-policies.component.html'
})
export class MyPoliciesComponent implements OnInit {
  policies: Array<{
    id: number;
    user: string;
    flightId: string;
    premiumWei: string;
    premiumEth: string;
    payoutWei: string;
    payoutEth?: string;
    active: boolean;
  }> = [];

  loading = false;
  errorMessage = '';

  constructor(
    public walletService: WalletService,
    private contractService: ContractService
  ) {}

  async ngOnInit() {
    await this.loadPolicies();
  }

  async loadPolicies() {
    // clear previous state
    this.errorMessage = '';
    this.policies = [];

    if (!this.walletService.account) {
      // Nothing to do until a wallet account is connected
      return;
    }

    this.loading = true;
    try {
      // get raw policies belonging to this account (as returned by the contract)
      const raw: any[] = await this.contractService.getPoliciesForUser(this.walletService.account);

      // Map and convert BigNumber fields into readable strings
      this.policies = raw.map((p: any) => {
        // p should be { id, user, flightId, premium, payoutAmount, active }
        const premiumBN = p.premium ?? p.premiumWei ?? null;
        const payoutBN = p.payoutAmount ?? p.payoutWei ?? null;

        let premiumWei = '0';
        let premiumEth = '0.000000';
        if (premiumBN && premiumBN.toString) {
          premiumWei = premiumBN.toString();
          try {
            premiumEth = Number(ethers.utils.formatEther(premiumBN)).toFixed(6);
          } catch (e) {
            premiumEth = '0.000000';
          }
        }

        let payoutWei = '0';
        let payoutEth = undefined;
        if (payoutBN && payoutBN.toString) {
          payoutWei = payoutBN.toString();
          try {
            payoutEth = Number(ethers.utils.formatEther(payoutBN)).toFixed(6);
          } catch (e) {
            payoutEth = undefined;
          }
        }

        return {
          id: p.id,
          user: p.user,
          flightId: p.flightId,
          premiumWei,
          premiumEth,
          payoutWei,
          payoutEth,
          active: !!p.active
        };
      });
    } catch (err) {
      console.error('Error loading policies:', err);
      this.errorMessage = err && err.message ? err.message : String(err);
      this.policies = [];
    } finally {
      this.loading = false;
    }
  }

  // Consider policy "claimed" when it's NOT active
  isClaimed(policy: any): boolean {
    if (policy == null) return false;
    return policy.active === false;
  }

  getClaimedCount(): number {
    return this.policies.filter(p => this.isClaimed(p)).length;
  }

  getActiveCount(): number {
    return this.policies.filter(p => !this.isClaimed(p)).length;
  }

  async refresh() {
    await this.loadPolicies();
  }
}
