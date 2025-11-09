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

  // admin policy list (unchanged)
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
    await this.loadAllPolicies();
  }

  /**
   * Check on-chain owner only.
   * NOTE: we intentionally do NOT fall back to environment.allowLocalAdmin here.
   * Admin actions (setOracle, deposit) require an on-chain owner connected.
   */
  async checkIsOwner() {
    try {
      const ownerOnChain = await this.contractService.getOwner();
      const acct = this.walletService.account;
      if (acct && ownerOnChain && ownerOnChain.toLowerCase() === acct.toLowerCase()) {
        this.isOwner = true;
        return;
      }
      this.isOwner = false;
    } catch (e) {
      console.warn('Owner check failed:', e);
      this.isOwner = false;
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

  // --- loadAllPolicies (keeps admin table working) ---
  async loadAllPolicies() {
    this.loadingPolicies = true;
    try {
      const raw = await this.contractService.getAllPolicies();
      this.allPolicies = (raw || []).map((p: any) => {
        const idNum = (typeof p.id === 'number') ? p.id : (Number(p.id) || 0);
        return {
          ...p,
          id: idNum,
          policyId: `PN${idNum + 1}`,
          premiumEth: p.premium ? this.safeFormatEth(p.premium) : undefined,
          payoutEth: p.payoutAmount ? this.safeFormatEth(p.payoutAmount) : undefined,
          dateFormatted: p.date ? ( (typeof p.date.toNumber === 'function') ? new Date(p.date.toNumber() * 1000).toISOString() : (typeof p.date === 'string' ? new Date(Number(p.date) * 1000).toISOString() : null) ) : null
        };
      });
    } catch (err) {
      console.error('Failed to load all policies', err);
      this.allPolicies = [];
    } finally {
      this.loadingPolicies = false;
    }
  }

  // small helper to format ether-like values (keeps UI safe)
  private safeFormatEth(value: any): string | undefined {
    try {
      if ((ethers as any).BigNumber && (ethers as any).BigNumber.isBigNumber && (ethers as any).BigNumber.isBigNumber(value)) {
        return Number((ethers as any).utils.formatEther(value)).toFixed(6);
      }
      if (typeof value === 'string' && /^[0-9]+(\.[0-9]+)?$/.test(value)) {
        return Number(value).toFixed(6);
      }
      if (typeof value === 'number') {
        return value.toFixed(6);
      }
    } catch (e) {
      console.warn('safeFormatEth failed', e);
    }
    return undefined;
  }

  /**
   * setOracle:
   * - NOW: only attempt on-chain via signer when connected account is the on-chain owner.
   * - No backend fallback (by design as per your instruction).
   */
  async setOracle() {
    if (!this.oracleInput) { alert('Enter oracle address'); return; }

    try {
      const ownerOnChain = await this.contractService.getOwner();
      const acct = this.walletService.account;
      if (!acct || !ownerOnChain || ownerOnChain.toLowerCase() !== acct.toLowerCase()) {
        alert('You must connect the contract owner wallet to set the oracle (no backend fallback).');
        return;
      }

      // perform on-chain call via contractService (signer required)
      await this.contractService.setOracle(this.oracleInput);
      await this.loadOracle();
      alert('Oracle set on-chain successfully.');
    } catch (err) {
      console.error('setOracle on-chain failed', err);
      alert('Failed to set oracle on-chain: ' + ((err && (err as any).message) ? (err as any).message : String(err)));
    }
  }

  /**
   * deposit:
   * - NOW: only attempt on-chain deposit when connected owner wallet is available.
   * - No backend fallback.
   */
  async deposit() {
    if (!this.depositAmount) { alert('Enter deposit amount in ETH'); return; }

    try {
      const ownerOnChain = await this.contractService.getOwner();
      const acct = this.walletService.account;
      if (!acct || !ownerOnChain || ownerOnChain.toLowerCase() !== acct.toLowerCase()) {
        alert('You must connect the contract owner wallet to deposit funds (no backend fallback).');
        return;
      }

      const wei = ethers.utils.parseEther(this.depositAmount).toString();
      await this.contractService.deposit(wei);
      await this.loadContractBalance();
      alert('Deposit sent on-chain.');
    } catch (err) {
      console.error('Deposit on-chain failed', err);
      alert('Deposit failed: ' + ((err && (err as any).message) ? (err as any).message : String(err)));
    }
  }

  /**
   * requestBackendClaim:
   * - Filing claims remains a backend operation (backend will call updateFlightStatus from oracle account).
   * - We keep this behavior; backend is allowed for claim requests.
   */
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
