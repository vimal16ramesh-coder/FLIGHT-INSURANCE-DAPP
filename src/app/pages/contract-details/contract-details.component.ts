import { Component, OnInit } from '@angular/core';
import { ContractService } from '../../core/services/contract.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-contract-details',
  templateUrl: './contract-details.component.html'
})
export class ContractDetailsComponent implements OnInit {
  address = environment.contractAddress;
  owner: string = '';
  balanceWei: string = '';
  oracle: string = '';
  hasClipboard: boolean = false;

  constructor(private contractService: ContractService) {}

  async ngOnInit() {
    try {
      this.owner = await this.contractService.getOwner();
    } catch {}
    try {
      this.balanceWei = await this.contractService.getContractBalance();
    } catch {}
    try {
      this.oracle = await this.contractService.getOracle();
    } catch {}
    // detect clipboard availability in browser context
    try {
      const nav: any = (window as any)?.navigator;
      this.hasClipboard = !!nav && !!nav.clipboard && typeof nav.clipboard.writeText === 'function';
    } catch { this.hasClipboard = false; }
  }

  copyAddress() {
    try {
      const nav: any = (window as any)?.navigator;
      if (nav && nav.clipboard && this.address) {
        nav.clipboard.writeText(this.address);
      }
    } catch {}
  }
}



