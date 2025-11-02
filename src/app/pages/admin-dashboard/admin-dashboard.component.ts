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

  constructor(
    public walletService: WalletService,
    private contractService: ContractService,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.checkIsOwner();
    await this.loadContractBalance();
    await this.loadOracle();
  }

  /**
   * Determine owner:
   * - If the current wallet account equals on-chain owner -> treat as owner.
   * - Otherwise if environment has allowLocalAdmin and ownerAddress set, we treat this device as "owner"
   *   for admin UI actions. For transactions that require signing (deposit), the component will
   *   call backend endpoints instead when signer isn't available.
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

      // fallback: environment ownerAddress + allowLocalAdmin
     /* if ((environment as any).allowLocalAdmin && (environment as any).ownerAddress) {
        const envOwner = (environment as any).ownerAddress.toLowerCase();
        // Optionally you may match on hostname or some token — here we simply enable UI if allowed
        this.isOwner = true;
        console.log('Local admin mode active. UI enabled for owner actions.');
        return;
      }*/

      //this.isOwner = false;
    } catch (e) {
      console.warn('Owner check failed:', e);
      // fallback to environment local admin if enabled
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

  // Set oracle: if signer available and current account is ownerOnChain -> call contract directly
  // otherwise call backend to perform the owner action (backend must have owner private key)
  async setOracle() {
    if (!this.oracleInput) { alert('Enter oracle address'); return; }

    // prefer signer / direct on-chain when user is connected and is real owner
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

    // fallback to backend admin endpoint
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

  // Deposit funds: when signer/owner present, do direct tx; otherwise call backend deposit endpoint.
  async deposit() {
    if (!this.depositAmount) { alert('Enter deposit amount in ETH'); return; }

    // try direct on-chain deposit (requires signer & owner)
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

    // fallback to backend deposit endpoint (backend must send the transaction using owner key)
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
}
