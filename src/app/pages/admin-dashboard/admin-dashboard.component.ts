import { Component, OnInit } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService } from '../../core/services/wallet.service';
import { ContractService } from '../../core/services/contract.service';

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

  constructor(public walletService: WalletService, private contractService: ContractService) {}

  async ngOnInit() {
    await this.checkIsOwner();
    await this.loadContractBalance();
    await this.loadOracle();
  }

  async checkIsOwner() {
    try {
      const owner = await this.contractService.getOwner();
      const acct = this.walletService.account;
      this.isOwner = !!acct && !!owner && owner.toLowerCase() === acct.toLowerCase();
    } catch (e) {
      console.warn('Owner check failed:', e);
      this.isOwner = false;
    }
  }

  async loadContractBalance() {
    this.contractBalance = await this.contractService.getContractBalance();
  }

  async loadOracle() {
    this.oracle = await this.contractService.getOracle();
  }

  async setOracle() {
    await this.contractService.setOracle(this.oracleInput);
    await this.loadOracle();
  }

  async deposit() {
    const wei = ethers.utils.parseEther(this.depositAmount).toString();
    await this.contractService.deposit(wei);
    await this.loadContractBalance();
  }
}
