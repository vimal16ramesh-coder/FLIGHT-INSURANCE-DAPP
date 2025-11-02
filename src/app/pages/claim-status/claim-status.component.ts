// src/app/pages/claim-status/claim-status.component.ts
import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';
import { HttpClient } from '@angular/common/http';
import { ethers } from 'ethers';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-claim-status',
  templateUrl: './claim-status.component.html'
})
export class ClaimStatusComponent implements OnInit {
  policies: any[] = [];
  loading = false;
  claimStatus: boolean[] = [];
  txLoadingIndex: number | null = null; // index currently processing tx

  constructor(
    public walletService: WalletService,
    private contractService: ContractService,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.loadPolicies();
    this.computeClaimStatusFromPolicies();

    // debug pending withdrawal for your account (if provider available)
    if (this.walletService.account) {
      try {
        const pending = await this.contractService.getPendingWithdrawal(this.walletService.account);
        console.log("Pending withdrawal (wei):", pending?.toString?.() ?? pending);
      } catch (e) {
        // ignore
      }
    }
  }

  // load policies using the contract helper that iterates policyCount
  async loadPolicies() {
    if (!this.walletService.account) {
      this.policies = [];
      this.claimStatus = [];
      return;
    }

    this.loading = true;
    try {
      const raw = await this.contractService.getPoliciesForUser(this.walletService.account);
      // normalize BigNumbers and make safe fields for templates
      this.policies = raw.map((p: any) => ({
        id: p.id,
        user: p.user,
        flightId: p.flightId,
        date: p.date ?? undefined, // may be BigNumber or undefined
        premium: p.premium ?? undefined,
        premiumEth: p.premium ? Number(ethers.utils.formatEther(p.premium)).toFixed(6) : undefined,
        payoutAmount: p.payoutAmount ?? undefined,
        payoutEth: p.payoutAmount ? Number(ethers.utils.formatEther(p.payoutAmount)).toFixed(6) : undefined,
        active: typeof p.active === 'boolean' ? p.active : !!p.active
      }));
      console.log('normalized policies for UI:', this.policies);
    } catch (err) {
      console.error('Failed loading policies:', err);
      this.policies = [];
    }
    this.loading = false;
    this.computeClaimStatusFromPolicies();
  }

  // build claimStatus[] from loaded policies
  computeClaimStatusFromPolicies() {
    if (!this.policies || this.policies.length === 0) {
      this.claimStatus = [];
      return;
    }
    // here active===false means claimed (matches your contract's logic)
    this.claimStatus = this.policies.map(p => (p.active === false));
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

  // safe date formatter: returns readable string or 'N/A'
  dateString(policy: any): string {
    if (!policy) return 'N/A';
    const d = policy.date;
    try {
      if (d === undefined || d === null) return 'N/A';
      if (d && typeof d.toNumber === 'function') {
        // BigNumber (assumed seconds)
        return new Date(d.toNumber() * 1000).toLocaleDateString();
      }
      if (typeof d === 'number') {
        return new Date(d * 1000).toLocaleDateString();
      }
      if (typeof d === 'string' && /^\d+$/.test(d)) {
        return new Date(Number(d) * 1000).toLocaleDateString();
      }
    } catch (e) {
      console.warn('dateString conversion failed', e);
    }
    return 'N/A';
  }

  /**
   * fileClaim:
   * - If backend is available it will call backend endpoint to request the flight status update (recommended).
   * - Backend is expected to run the oracle/contract-side updateFlightStatus, and then credit pendingWithdrawals.
   *
   * Expected backend endpoint (example):
   * POST `${environment.apiBaseUrl}/flight/updateStatus`
   * body: { policyId: number, delayed: boolean }
   *
   * Modify the endpoint path to match your backend.
   */
  async fileClaim(policy: any, index: number) {
    if (!this.walletService.account) {
      alert('Connect your wallet first');
      return;
    }

    if (this.txLoadingIndex !== null) return; // one tx at a time UI

    this.txLoadingIndex = index;
    try {
      // call backend API to mark flight delayed (backend will call the contract as oracle)
      const url = `${environment.apiBaseUrl.replace(/\/$/, '')}/flight/updateStatus`;
      // sample body; change field names if your backend expects different.
      const body = { policyId: policy.id, delayed: true };

      const resp: any = await this.http.post(url, body).toPromise();
      // backend should return something like { success: true, message: "...", txHash: "0x..." }
      if (resp && (resp.success === true || resp.txHash)) {
        // wait a little and reload UI (backend already did on-chain work)
        await this.loadPolicies();
        alert('Claim request sent. Backend confirmed update (tx: ' + (resp.txHash || 'n/a') + ').');
      } else {
        const msg = (resp && resp.message) ? resp.message : 'Backend did not confirm success';
        console.error('Backend response:', resp);
        alert('Claim failed: ' + msg);
      }
    } catch (err) {
      console.error('Claim (backend) failed', err);
      // graceful extraction of msg
      const msg = (err && (err as any).message) ? (err as any).message : JSON.stringify(err);
      alert('Claim failed: ' + msg);
    } finally {
      this.txLoadingIndex = null;
    }
  }

}
