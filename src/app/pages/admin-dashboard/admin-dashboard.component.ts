// src/app/pages/admin-dashboard/admin-dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html'
})
export class AdminDashboardComponent implements OnInit {
  isOwner: boolean = false;
  contractBalance: string = '';
  oracle: string = '';
  oracleInput: string = '';
  depositAmount: string = '';

  // new: admin-wide policies list
  allPolicies: any[] = [];
  loadingPolicies = false;

  constructor(
    public walletService: WalletService,
    private contractService: ContractService,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.checkIsOwner();
    await this.loadContractBalance();
    await this.loadOracle();
    // load all policies for admin view
    await this.loadAllPolicies();
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

      // value might be an object with toString (sometimes libs)
      if (typeof value === 'object' && typeof value.toString === 'function') {
        const s = value.toString();
        if (/^[0-9]+(\.[0-9]+)?$/.test(s)) {
          const n = Number(s);
          if (!isNaN(n)) return n.toFixed(6);
        }
      }

      // string decimal like "0.01" or "0" or numeric hex
      if (typeof value === 'string') {
        // if hex-like (0x...), try BigNumber
        if (/^0x[0-9a-f]+$/i.test(value)) {
          const v = (ethers as any).utils.formatEther(value);
          const n = Number(v);
          if (!isNaN(n)) return n.toFixed(6);
          return undefined;
        }
        // plain decimal string
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
      // swallow and return undefined
      console.warn('formatEthSafe failed for value:', value, e);
    }
    return undefined;
  }

  /**
   * Determine owner:
   */
  async checkIsOwner() {
    try {
      const ownerOnChain = await this.contractService.getOwner();
      const acct = this.walletService.account;
      if (acct && ownerOnChain && ownerOnChain.toLowerCase() === acct.toLowerCase()) {
        this.isOwner = true;
        console.log('Connected account is contract owner. Admin UI enabled.');
        return;
      }
    } catch (e) {
      console.warn('Owner check failed:', e);
      if ((environment as any).allowLocalAdmin && (environment as any).ownerAddress) {
        this.isOwner = true;
      } else {
        this.isOwner = false;
      }
    }
  }

  async loadContractBalance() {
    try {
      this.contractBalance = await this.contractService.getContractBalance();
    } catch (e) {
      console.warn('loadContractBalance failed', e);
      this.contractBalance = '0';
    }
  }

  async loadOracle() {
    try {
      this.oracle = await this.contractService.getOracle();
    } catch (e) {
      console.warn('loadOracle failed', e);
      this.oracle = '';
    }
  }

  // --- NEW: load all policies for admin dashboard (robust parsing) ---
  async loadAllPolicies() {
    this.loadingPolicies = true;
    try {
      const raw = await this.contractService.getAllPolicies();
      this.allPolicies = (raw || []).map((p: any) => {
        const idNum = (typeof p.id === 'number') ? p.id : (Number(p.id) || 0);
        const premiumEth = this.formatEthSafe(p.premium);
        const payoutEth = this.formatEthSafe(p.payoutAmount);
        let dateFormatted: string | null = null;
        try {
          if (p && p.date) {
            if ((p.date as any).toNumber && typeof (p.date as any).toNumber === 'function') {
              dateFormatted = new Date((p.date as any).toNumber() * 1000).toISOString();
            } else if (typeof p.date === 'string' && /^\d+$/.test(p.date)) {
              dateFormatted = new Date(Number(p.date) * 1000).toISOString();
            } else if (typeof p.date === 'number') {
              dateFormatted = new Date(p.date * 1000).toISOString();
            }
          }
        } catch (e) {
          console.warn('Failed to parse date for policy', p, e);
        }

        return {
          ...p,
          id: idNum,
          policyId: `PN${idNum + 1}`,
          premiumEth,
          payoutEth,
          dateFormatted
        };
      });
    } catch (err) {
      console.error('Failed to load all policies', err);
      this.allPolicies = [];
    } finally {
      this.loadingPolicies = false;
    }
  }

  // Set oracle (unchanged from previous)
  async setOracle() {
    if (!this.oracleInput) { alert('Enter oracle address'); return; }

    try {
      const ownerOnChain = await this.contractService.getOwner();
      const acct = this.walletService.account;
      if (acct && ownerOnChain && ownerOnChain.toLowerCase() === acct.toLowerCase()) {
        await this.contractService.setOracle(this.oracleInput);
        await this.loadOracle();
        alert('Oracle set on-chain successfully.');
        return;
      }
    } catch (e) {
      console.warn('Direct setOracle attempt failed, will try backend if configured', e);
    }

    try {
      const url = `${environment.apiBaseUrl.replace(/\/$/, '')}/admin/setOracle`;
      const body = { oracle: this.oracleInput };
      const resp: any = await this.http.post(url, body).toPromise();
      if (resp && resp.success) {
        await this.loadOracle();
        alert('Oracle set via backend (owner action).');
      } else {
        alert('Backend setOracle failed: ' + (resp && resp.message ? resp.message : 'unknown'));
      }
    } catch (err) {
      console.error('Backend setOracle failed', err);
      alert('Failed to set oracle: ' + ((err && (err as any).message) ? (err as any).message : String(err)));
    }
  }

  // Deposit (unchanged)
  async deposit() {
    if (!this.depositAmount) { alert('Enter deposit amount in ETH'); return; }

    try {
      const ownerOnChain = await this.contractService.getOwner();
      const acct = this.walletService.account;
      if (acct && ownerOnChain && ownerOnChain.toLowerCase() === acct.toLowerCase()) {
        const wei = ethers.utils.parseEther(this.depositAmount).toString();
        await this.contractService.deposit(wei);
        await this.loadContractBalance();
        alert('Deposit sent on-chain.');
        return;
      }
    } catch (e) {
      console.warn('Direct deposit failed, will try backend', e);
    }

    try {
      const url = `${environment.apiBaseUrl.replace(/\/$/, '')}/admin/deposit`;
      const body = { amountEth: this.depositAmount };
      const resp: any = await this.http.post(url, body).toPromise();
      if (resp && resp.success) {
        await this.loadContractBalance();
        alert('Deposit requested via backend.');
      } else {
        alert('Backend deposit failed: ' + (resp && resp.message ? resp.message : 'unknown'));
      }
    } catch (err) {
      console.error('Backend deposit failed', err);
      alert('Deposit failed: ' + ((err && (err as any).message) ? (err as any).message : String(err)));
    }
  }

  // --- NEW: admin request to backend for a specific policy ---
  async requestBackendClaim(policy: any) {
    if (!this.isOwner) {
      alert('Only owner can perform this action.');
      return;
    }
    try {
      const url = `${environment.apiBaseUrl.replace(/\/$/, '')}/flight/updateStatus`;
      const body = {
        policyId: policy.policyId ?? (`PN${(typeof policy.id === 'number' ? (policy.id + 1) : policy.id)}`),
        delayed: true
      };
      const resp: any = await this.http.post(url, body).toPromise();
      if (resp && (resp.success === true || resp.txHash)) {
        alert('Backend accepted claim request (tx: ' + (resp.txHash || 'n/a') + ')');
        await this.loadAllPolicies();
      } else {
        const msg = (resp && resp.message) ? resp.message : 'Backend returned no success';
        console.error('Backend response:', resp);
        alert('Claim failed: ' + msg);
      }
    } catch (err) {
      console.error('Admin claim failed', err);
      alert('Claim failed: ' + ((err && (err as any).message) ? (err as any).message : String(err)));
    }
  }
}
