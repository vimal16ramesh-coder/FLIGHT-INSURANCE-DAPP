// src/app/pages/claim-status/claim-status.component.ts
import { Component, OnInit } from '@angular/core';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';
import { ethers } from 'ethers';
import { HttpClient } from '@angular/common/http';
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

  // backend base (set environment.apiUrl or default '/api')
  private API_BASE = environment && (environment as any).apiUrl ? (environment as any).apiUrl : '/api';

  constructor(
    public walletService: WalletService,
    private contractService: ContractService,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.loadPolicies();
    this.computeClaimStatusFromPolicies();

    // 🔍 Debug line: print pending if available
    try {
      if (this.walletService.account) {
        const pending = await this.contractService.getPendingWithdrawal(this.walletService.account);
        console.log("Pending withdrawal (wei):", pending && pending.toString ? pending.toString() : pending);
      }
    } catch (e) {
      console.warn('Could not fetch pending withdrawal:', e);
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
        date: p.date ?? undefined, // keep original if present
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

  // build claimStatus[] from the loaded policies
  computeClaimStatusFromPolicies() {
    if (!this.policies || this.policies.length === 0) {
      this.claimStatus = [];
      return;
    }
    // adjust logic to match your contract: here `active === false` means claimed
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

  // safe date formatter: returns readable string or 'N/A'
  dateString(policy: any): string {
    if (!policy) return 'N/A';
    const d = policy.date;
    try {
      if (d === undefined || d === null) return 'N/A';
      if (d && typeof d.toNumber === 'function') {
        // BigNumber (assumed to be seconds)
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
   * Trigger claim flow:
   * 1) Call backend endpoint to initiate claim workflow for given policy
   * 2) Backend responds with action:
   *    - { action: 'oracle' } -> server/oracle will process; inform user
   *    - { action: 'withdraw' } -> client should call withdrawPayout() on-chain
   *    - { action: 'signedTx', signedTx: '0x...' } -> (optional) broadcast raw tx
   *    - { status: 'error', message } -> show error
   *
   * Adjust endpoint and response parsing to match your backend.
   */
  async fileClaim(policy: any, index: number) {
    if (!this.walletService.account) {
      alert('Connect your wallet first');
      return;
    }

    if (this.txLoadingIndex !== null) return; // only one tx at a time

    // basic validation
    if (!policy || typeof policy.id === 'undefined') {
      alert('Invalid policy selection');
      return;
    }

    const claimEndpoint = `${this.API_BASE}/claims`;

    try {
      this.txLoadingIndex = index;

      // 1) POST to backend to initiate claim workflow
      const body = {
        policyId: policy.id,
        user: this.walletService.account
      };

      // using toPromise for Angular9 compat; convert to Observable if you prefer subscribe
      const apiResp: any = await this.http.post(claimEndpoint, body).toPromise();
      console.log('Backend claim response:', apiResp);

      if (!apiResp) {
        alert('Empty response from claim server. Try again later.');
        return;
      }

      if (apiResp.status === 'error') {
        // backend rejected
        const msg = apiResp.message || 'Claim rejected by server';
        alert('Claim failed: ' + msg);
        return;
      }

      // decide what to do based on backend instruction
      const action = apiResp.action || apiResp.next || 'unknown';

      if (action === 'oracle') {
        // server says oracle will update flight status later
        alert(apiResp.message || 'Claim submitted. Oracle will process the claim; check back later.');
        // optionally poll or refresh after delay
        setTimeout(() => this.loadPolicies(), 3000);
        return;
      }

      if (action === 'withdraw') {
        // server indicates user can withdraw (pendingWithdrawals credited) OR wants client to call withdraw
        try {
          const receipt = await this.contractService.withdrawPayout();
          console.log('withdraw tx receipt', receipt);
          await this.loadPolicies();
          alert('Withdraw successful: transaction confirmed. Check wallet or explorer.');
        } catch (onchainErr) {
          console.error('Withdraw on-chain failed', onchainErr);
          // extract reason if available
          const reason =
            (onchainErr && onchainErr.error && onchainErr.error.message) ? onchainErr.error.message
            : (onchainErr && onchainErr.message) ? onchainErr.message
            : String(onchainErr);
          alert('Withdraw failed: ' + reason);
        }
        return;
      }

      if (action === 'signedTx' && apiResp.signedTx) {
        // backend returned an already-signed raw transaction (rare). Broadcast via provider.
        try {
          const provider = this.walletService.provider;
          if (!provider) throw new Error('Provider unavailable to broadcast transaction');
          const txHash = await provider.send('eth_sendRawTransaction', [apiResp.signedTx]);
          console.log('Broadcast txHash', txHash);
          alert('Claim transaction broadcasted: ' + txHash);
          await this.loadPolicies();
        } catch (bErr) {
          console.error('Broadcast failed', bErr);
          alert('Broadcast failed: ' + (bErr && bErr.message ? bErr.message : String(bErr)));
        }
        return;
      }

      // fallback: server accepted but did not return an explicit next step
      alert(apiResp.message || 'Claim request accepted by server. Check status later.');
      // refresh
      setTimeout(() => this.loadPolicies(), 2000);

    } catch (err) {
      console.error('Claim API or flow failed', err);

      // Distinguish HttpClient errors (with status) vs other errors
      let userMsg = 'Claim failed.';
      if (err && (err as any).status) {
        userMsg += ` Server responded ${ (err as any).status }`;
        if ((err as any).error && (err as any).error.message) {
          userMsg += ': ' + (err as any).error.message;
        }
      } else if (err && (err as any).message) {
        userMsg += ' ' + (err as any).message;
      } else {
        userMsg += ' Unexpected error.';
      }
      alert(userMsg);
    } finally {
      this.txLoadingIndex = null;
      // best-effort refresh
      try { await this.loadPolicies(); } catch (_) { /* ignore */ }
    }
  }
}
