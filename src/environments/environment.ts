// src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:4000/api/insurance',   // <-- set to your backend base URL
  contractAddress: '0x113261250ad5e34a16371472998a03A3e84197Cb',
  // If you want to enable "local admin UI mode" without MetaMask, set allowLocalAdmin true
  // and put ownerAddress (for reference). Note: transactions that need a signature will
  // still require backend endpoints that hold the private key.
  allowLocalAdmin: true,
  ownerAddress: '0xYOUR_OWNER_ADDRESS_HERE'
};
