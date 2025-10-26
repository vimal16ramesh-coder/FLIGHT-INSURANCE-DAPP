import { Component, OnInit } from '@angular/core';
import { WalletService } from './core/services/wallet.service';
import { ContractService } from './core/services/contract.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'flight-insurance-dapp';
  isOwner: boolean = false;

  constructor(
    public walletService: WalletService,
    private contractService: ContractService
  ) {}

  async ngOnInit() {
    // If wallet already connected
    if (this.walletService.account) {
      await this.checkOwner();
    }

    // Detect account changes (MetaMask events)
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', async (accounts: string[]) => {
        this.walletService.account = accounts.length > 0 ? accounts[0] : undefined;
        await this.checkOwner();
      });
    }
  }

  async checkOwner() {
    if (!this.walletService.account) {
      this.isOwner = false;
      return;
    }

    try {
      const owner = await this.contractService.getOwner();
      this.isOwner =
        owner.toLowerCase() === this.walletService.account.toLowerCase();
    } catch (err) {
      console.error('Error verifying owner:', err);
      this.isOwner = false;
    }
  }

  async connectWallet() {
    await this.walletService.connectWallet();
    await this.checkOwner(); // Re-run after wallet connects
  }
}
