// src/app/pages/my-policies/my-policies.component.ts
import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';
import { HttpClient } from '@angular/common/http';
import { ethers } from 'ethers';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-my-policies',
  templateUrl: './my-policies.component.html'
})
export class MyPoliciesComponent implements OnInit {
  policies: any[] = [];
  loading = false;
  txLoadingIndex: number | null = null;

  constructor(
    public walletService: WalletService,
    private contractService: ContractService,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.loadPolicies();
  }

  /**
   * Safe ETH formatter that accepts BigNumber, numeric strings, and numbers.
   * Returns a fixed string (6 decimals) or undefined on failure.
   */
  private formatEthSafe(value: any): string | undefined {
    try {
      if (value === null || value === undefined) return undefined;

      // ethers.BigNumber check
      if ((ethers as any).BigNumber && (ethers as any).BigNumber.isBigNumber && (ethers as any).BigNumber.isBigNumber(value)) {
        const v = (ethers as any).utils.formatEther(value);
        const n = Number(v);
        if (!isNaN(n)) return n.toFixed(6);
        return undefined;
      }

      // object with toString
      if (typeof value === 'object' && typeof value.toString === 'function') {
        const s = value.toString();
        if (/^[0-9]+(\.[0-9]+)?$/.test(s)) {
          const n = Number(s);
          if (!isNaN(n)) return n.toFixed(6);
        }
      }

      // string values
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

      // number
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
      return;
    }

    this.loading = true;
    try {
      const raw = await this.contractService.getPoliciesForUser(this.walletService.account);

      this.policies = (raw || []).map((p: any) => {
        const idNum = (typeof p.id === 'number') ? p.id : (Number(p.id) || 0);
        const premiumEth = this.formatEthSafe(p.premium);
        const payoutEth = this.formatEthSafe(p.payoutAmount);

        return {
          id: idNum,
          // user-facing and backend-facing policy identifier
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

      console.log('My policies normalized:', this.policies);
    } catch (err) {
      console.error('Failed loading policies:', err);
      this.policies = [];
    } finally {
      this.loading = false;
    }
  }

  // convenience: whether this policy is already claimed (based on contract's active flag)
  isClaimed(policyOrIndex: any): boolean {
    if (typeof policyOrIndex === 'number') {
      const policy = this.policies[policyOrIndex];
      return policy ? !policy.active : false;
    }
    const p = policyOrIndex;
    if (!p) return false;
    if (typeof p.active !== 'undefined') {
      return !p.active;
    }
    return !!p.claimed;
  }

  // send claim request to backend using the string policyId (PN...)
  async fileClaimFromMyPolicies(policy: any, index: number) {
    if (!this.walletService.account) {
      alert('Please connect your wallet first.');
      return;
    }
    if (this.txLoadingIndex !== null) return; // avoid concurrent actions
    if (!policy) {
      alert('Invalid policy selected.');
      return;
    }

    this.txLoadingIndex = index;
    try {
      const url = `${environment.apiBaseUrl.replace(/\/$/, '')}/flight/updateStatus`;
      // send PN... id — backend dev asked for this id format to be used
      const body: any = {
        policyId: policy.policyId ?? (`PN${(typeof policy.id === 'number' ? (policy.id + 1) : policy.id)}`),
        delayed: true
      };

      const resp: any = await this.http.post(url, body).toPromise();
      if (resp && (resp.success === true || resp.txHash)) {
        // reload policies after backend processed
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
