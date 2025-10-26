import { Injectable } from '@angular/core';
import { ethers } from 'ethers';
import { WalletService } from './wallet.service';

const contractAddress = '0x9B89D071445C5ac084aBfa1EEb076A94B74635fc';  // Replace with real contract address

const contractABI = [
  "function buyPolicy(string flightId, uint256 date) public",
  "function policies(address user) public view returns (tuple(string flightId, uint256 date, bool claimed)[])",
  "function isClaimed(address user, uint256 index) public view returns (bool)"
];

@Injectable({
  providedIn: 'root'
})
export class ContractService {
  private contract?: ethers.Contract;

  constructor(private walletService: WalletService) {}

  private async getContract() {
    if (!this.contract && this.walletService.signer) {
      this.contract = new ethers.Contract(contractAddress, contractABI, this.walletService.signer);
    }
    return this.contract;
  }

  async buyPolicy(flightId: string, date: number) {
    const contract = await this.getContract();
    if (contract) {
      const tx = await contract.buyPolicy(flightId, date);
      await tx.wait();
    }
  }

  async getPolicies(userAddress: string) {
    const contract = await this.getContract();
    if (contract) {
      return contract.policies(userAddress);
    }
    return [];
  }

  async checkClaimed(userAddress: string, index: number) {
    const contract = await this.getContract();
    if (contract) {
      return contract.isClaimed(userAddress, index);
    }
    return false;
  }
  async getOwner() {
  const contract = await this.getContract();
  return await contract.owner();
}

async setOracle(address: string) {
  const contract = await this.getContract();
  const tx = await contract.setOracle(address);
  await tx.wait();
}

async getOracle() {
  const contract = await this.getContract();
  return contract.oracle();
}

async deposit(amountInWei: string) {
  const contract = await this.getContract();
  // Only owner can call deposit
  const tx = await contract.deposit({ value: amountInWei });
  await tx.wait();
}

async getContractBalance() {
  const contract = await this.getContract();
  // You'll need to call this via a public getter or use ethers.js: provider.getBalance(contract.address)
  return (await contract.provider.getBalance(contract.address)).toString();
}
}
