import { Injectable, NgZone } from '@angular/core';
import { ethers } from 'ethers';

declare let window: any;

@Injectable({
  providedIn: 'root'
})
export class WalletService {
  provider?: ethers.providers.Web3Provider;
  signer?: ethers.Signer;
  account?: string;

  constructor(private ngZone: NgZone) {}

  async connectWallet(): Promise<string | undefined> {
    if (!window.ethereum) {
      alert('MetaMask not detected');
      return;
    }
    try {
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      await this.provider.send('eth_requestAccounts', []);
      this.signer = this.provider.getSigner();
      this.account = await this.signer.getAddress();

      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        this.ngZone.run(() => {
          this.account = accounts.length > 0 ? accounts[0] : undefined;
        });
      });

      return this.account;
    } catch (error) {
      alert('Wallet connection failed');
      console.error(error);
      return;
    }
  }
}
