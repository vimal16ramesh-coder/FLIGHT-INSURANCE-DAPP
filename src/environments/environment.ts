// src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:5000/api',   // <-- set to your backend base URL
  contractAddress: '0x9B89D071445C5ac084aBfa1EEb076A94B74635fc',
  // If you want to enable "local admin UI mode" without MetaMask, set allowLocalAdmin true
  // and put ownerAddress (for reference). Note: transactions that need a signature will
  // still require backend endpoints that hold the private key.
  allowLocalAdmin: true,
  ownerAddress: '0xYOUR_OWNER_ADDRESS_HERE'
};
