// src/app/core/services/contract.service.ts
import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService } from './wallet.service';

const contractAddress = '0x9B89D071445C5ac084aBfa1EEb076A94B74635fc';

// ABI - ensure this matches the deployed contract on Sepolia
const contractABI = [
  "function owner() view returns (address)",
  "function setOracle(address _oracle) external",
  "function oracle() view returns (address)",
  "function deposit() external payable",
  "function buyPolicy(string flightId) external payable",
  "function policies(uint256) view returns (address user, string flightId, uint256 premium, uint256 payoutAmount, bool active)",
  "function policyCount() view returns (uint256)",
  "function pendingWithdrawals(address) view returns (uint256)",
  "function withdrawPayout() external"
];

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  // Do NOT reuse one single contract instance for both read/write modes.
  // We'll create on-demand contract instances connected to provider or signer.
  constructor(private walletService: WalletService) {}

  private async createContract(readOnly = false) {
    if (!this.walletService.provider) {
      throw new Error('Provider not initialized. Connect MetaMask first.');
    }
    const backend = readOnly
      ? this.walletService.provider
      : (this.walletService.signer ?? this.walletService.provider);

    // Always create a fresh Contract object (cheap) so signer vs provider are correct.
    return new ethers.Contract(contractAddress, contractABI, backend);
  }

  // BUY a policy (value in ETH string like "0.01")
  async buyPolicy(flightId: string, premiumEth: string) {
    const contract = await this.createContract(false); // require signer for tx
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
        // p: (user, flightId, premium, payoutAmount, active)
        if (p.user && p.user.toLowerCase() === userAddress.toLowerCase()) {
          policies.push({
            id: i,
            user: p.user,
            flightId: p.flightId,
            premium: p.premium,          // BigNumber
            payoutAmount: p.payoutAmount,// BigNumber
            active: p.active
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
}
