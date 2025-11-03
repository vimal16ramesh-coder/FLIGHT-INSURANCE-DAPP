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

    if (this.walletService.account) {
      try {
        const pending = await this.contractService.getPendingWithdrawal(this.walletService.account);
        console.log("Pending withdrawal (wei):", pending?.toString?.() ?? pending);
      } catch (e) {
        // ignore
      }
    }
  }

  private formatEthSafe(value: any): string | undefined {
    try {
      if (value === null || value === undefined) return undefined;
      if ((ethers as any).BigNumber && (ethers as any).BigNumber.isBigNumber && (ethers as any).BigNumber.isBigNumber(value)) {
        const v = (ethers as any).utils.formatEther(value);
        const n = Number(v);
        if (!isNaN(n)) return n.toFixed(6);
        return undefined;
      }
      if (typeof value === 'object' && typeof value.toString === 'function') {
        const s = value.toString();
        if (/^[0-9]+(\.[0-9]+)?$/.test(s)) {
          const n = Number(s);
          if (!isNaN(n)) return n.toFixed(6);
        }
      }
      if (typeof value === 'string') {
        if (/^0x[0-9a-f]+$/i.test(value)) {
          const v = (ethers as any).utils.formatEther(value);
          const n = Number(v);
          if (!isNaN(n)) return n.toFixed(6);
          return undefined;
        }
        if (/^[0-9]+(\.[0-9]+)?$/.test(value)) {
          const n = Number(value);
          if (!isNaN(n)) return n.toFixed(6);
        }
      }
      if (typeof value === 'number') {
        if (!isNaN(value)) return value.toFixed(6);
      }
    } catch (e) {
      console.warn('formatEthSafe failed for value:', value, e);
    }
    return undefined;
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
      this.policies = raw.map((p: any) => {
        const idNum = (typeof p.id === 'number') ? p.id : (Number(p.id) || 0);
        const premiumEth = this.formatEthSafe(p.premium);
        const payoutEth = this.formatEthSafe(p.payoutAmount);
        return {
          id: idNum,
          policyId: `PN${(idNum + 1)}`,
          user: p.user,
          flightId: p.flightId,
          date: p.date ?? undefined,
          premium: p.premium ?? undefined,
          premiumEth,
          payoutAmount: p.payoutAmount ?? undefined,
          payoutEth,
          active: typeof p.active === 'boolean' ? p.active : !!p.active
        };
      });
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
   * body: { policyId: string, delayed: boolean }
   */
  async fileClaim(policy: any, index: number) {
    if (!this.walletService.account) {
      alert('Connect your wallet first');
      return;
    }

    if (this.txLoadingIndex !== null) return; // one tx at a time UI

    this.txLoadingIndex = index;
    try {
      const url = `${environment.apiBaseUrl.replace(/\/$/, '')}/flight/updateStatus`;
      const policyIdentifier = policy.policyId ?? (typeof policy.id === 'number' ? (`PN${policy.id + 1}`) : policy.id);
      const body = { policyId: policyIdentifier, delayed: true };

      const resp: any = await this.http.post(url, body).toPromise();
      if (resp && (resp.success === true || resp.txHash)) {
        await this.loadPolicies();
        alert('Claim request sent. Backend confirmed update (tx: ' + (resp.txHash || 'n/a') + ').');
      } else {
        const msg = (resp && resp.message) ? resp.message : 'Backend did not confirm success';
        console.error('Backend response:', resp);
        alert('Claim failed: ' + msg);
      }
    } catch (err) {
      console.error('Claim (backend) failed', err);
      const msg = (err && (err as any).message) ? (err as any).message : JSON.stringify(err);
      alert('Claim failed: ' + msg);
    } finally {
      this.txLoadingIndex = null;
    }
  }

}
