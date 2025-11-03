// src/app/core/services/contract.service.ts
import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService } from './wallet.service';
import { environment } from '../../../environments/environment';

const contractAddress = environment.contractAddress;

// ABI - ensure this matches the deployed contract on Sepolia
const contractABI = [
  "function owner() view returns (address)",
  "function setOracle(address _oracle) external",
  "function oracle() view returns (address)",
  "function deposit() external payable",
  "function buyPolicy(string flightId) external payable",
  // If your contract includes a date (uint256) in the policy struct, add it at the end
  // Below we still call the same function; we'll defensively read p[5] as date if present
  "function policies(uint256) view returns (address user, string flightId, uint256 premium, uint256 payoutAmount, bool active)",
  "function policyCount() view returns (uint256)",
  "function pendingWithdrawals(address) view returns (uint256)",
  "function withdrawPayout() external"
];

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  constructor(private walletService: WalletService) {}

  private async createContract(readOnly = false) {
    if (!this.walletService.provider) {
      throw new Error('Provider not initialized. Connect MetaMask first.');
    }
    const backend = readOnly
      ? this.walletService.provider
      : (this.walletService.signer ?? this.walletService.provider);

    return new ethers.Contract(contractAddress, contractABI, backend);
  }

  // BUY a policy (value in ETH string like "0.01")
  async buyPolicy(flightId: string, premiumEth: string) {
    const contract = await this.createContract(false); // require signer
    const value = ethers.utils.parseEther(premiumEth);
    const tx = await contract.buyPolicy(flightId, { value });
    return tx.wait();
  }

  async getOwner() {
    const contract = await this.createContract(true);
    return contract.owner();
  }

  async setOracle(addr: string) {
    const contract = await this.createContract(false);
    const tx = await contract.setOracle(addr);
    return tx.wait();
  }

  async getOracle() {
    const contract = await this.createContract(true);
    return contract.oracle();
  }

  async deposit(amountInWei: string) {
    const contract = await this.createContract(false);
    const tx = await contract.deposit({ value: amountInWei });
    return tx.wait();
  }

  async getContractBalance() {
    if (!this.walletService.provider) throw new Error("Provider not ready");
    const bal = await this.walletService.provider.getBalance(contractAddress);
    return bal.toString();
  }

  // Return only policies that belong to userAddress
  async getPoliciesForUser(userAddress: string) {
    const contract = await this.createContract(true);
    const countBN = await contract.policyCount();
    const count = (countBN && countBN.toNumber) ? countBN.toNumber() : Number(countBN);
    const policies: any[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const p = await contract.policies(i);
        // p: (user, flightId, premium, payoutAmount, active [, date?])
        if (p.user && p.user.toLowerCase() === userAddress.toLowerCase()) {
          const possibleDate = (p as any).date ?? (p as any)[5];
          policies.push({
            id: i,
            user: p.user,
            flightId: p.flightId,
            premium: p.premium,
            payoutAmount: p.payoutAmount,
            active: p.active,
            // optional: if tuple has index 5 as date
            date: possibleDate !== undefined ? possibleDate : undefined
          });
        }
      } catch (err) {
        console.warn(`Failed reading policy ${i}`, err);
      }
    }
    return policies;
  }

  async getPendingWithdrawal(addr: string) {
    const contract = await this.createContract(true);
    return contract.pendingWithdrawals(addr);
  }

  // --- NEW: wrapper to call withdrawPayout (requires signer) ---
  async withdrawPayout() {
    const contract = await this.createContract(false);
    const tx = await contract.withdrawPayout();
    return tx.wait();
  }
  async getAllPolicies() {
    const contract = await this.createContract(true);
    const countBN = await contract.policyCount();
    const count = (countBN && countBN.toNumber) ? countBN.toNumber() : Number(countBN);
    const policies: any[] = [];

    for (let i = 0; i < count; i++) {
      try {
        const p = await contract.policies(i);
        // p: (user, flightId, premium, payoutAmount, active [, date?])
        const possibleDate = (p as any).date ?? (p as any)[5];
        policies.push({
          id: i,
          user: p.user,
          flightId: p.flightId,
          premium: ethers.utils.formatEther(p.premium ? p.premium.toString() : '0'),
          payoutAmount: ethers.utils.formatEther((p as any).payoutAmount ? (p as any).payoutAmount.toString() : '0'),
          active: (typeof p.active !== 'undefined') ? p.active : (p[4] ?? true),
          date: possibleDate ? new Date(Number(possibleDate) * 1000).toISOString() : null
        });
      } catch (err) {
        // continue on failure for this index
        console.warn('Failed to read policy index', i, err);
      }
    }

    return policies;
  }
}
