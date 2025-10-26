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

  constructor(private ngZone: NgZone) {
    // If MetaMask already injected, create provider so other services can call provider.getNetwork() even before connect
    if ((window as any).ethereum) {
      try {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
      } catch (e) {
        console.warn("Could not create provider at construction:", e);
      }
    }
  }

  async connectWallet(): Promise<string | undefined> {
    if (!window.ethereum) {
      alert('MetaMask not detected');
      return;
    }
    try {
      // create or reuse provider
      this.provider = this.provider ?? new ethers.providers.Web3Provider(window.ethereum);
      // ask user to connect
      await this.provider.send('eth_requestAccounts', []);
      this.signer = this.provider.getSigner();
      this.account = await this.signer.getAddress();

      // watch for account/network changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        this.ngZone.run(() => {
          this.account = accounts.length > 0 ? accounts[0] : undefined;
        });
      });

      window.ethereum.on('chainChanged', (chainId: string) => {
        // force page reload on chain change to re-initialize app state (optional)
        console.log("chainChanged -> reload");
        window.location.reload();
      });

      return this.account;
    } catch (error) {
      alert('Wallet connection failed');
      console.error(error);
      return;
    }
  }

  // helper to get network details
  async getNetwork() {
    if (!this.provider) return undefined;
    return await this.provider.getNetwork();
  }
}
