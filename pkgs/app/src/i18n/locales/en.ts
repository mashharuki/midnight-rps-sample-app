const en = {
  error: {
    walletNotFound:
      "Midnight Lace Wallet not found. Please install the extension.",
    versionMismatch:
      "Lace Wallet version ({{version}}) is outdated. Please update to the latest version.",
    networkMismatch:
      "Network mismatch. Please select PreProd in Lace Settings.",
    userRejected: "Wallet connection was cancelled.",
    walletTimeout:
      "Connection timed out. Please unlock Lace Wallet and try again.",
    unsupportedApi:
      "Unsupported Lace Wallet API: neither connect() nor enable() found.",
    connectGeneric: "An error occurred during connection. Please try again.",
    useWalletOutsideProvider: "useWallet must be used inside WalletProvider",
    connectFailed: "Connection failed. Please retry with the button above.",
    balanceFailed: "Failed to retrieve balance",
  },
  label: {
    connected: "Connected",
    shieldedAddress: "Shielded Address",
    balance: "Balance",
    refresh: "Refresh",
    disconnect: "Disconnect",
    loadingBalance: "Fetching balance...",
    shielded: "Shielded",
    unshielded: "Unshielded",
    dust: "Dust",
  },
  aria: {
    copyAddress: "Copy address",
    refreshBalance: "Refresh balance",
    midnightLogo: "Midnight",
  },
  button: {
    connect: "Connect Lace Wallet",
    connecting: "Connecting...",
    disconnect: "Disconnect",
  },
  app: {
    subtitle: "Connect your Lace Wallet to access Midnight Network (PreProd)",
  },
  toast: {
    copySuccess: "Address copied to clipboard",
  },
  counter: {
    title: "Counter Contract",
    contractAddress: "Contract Address",
    addressPlaceholder: "Enter deployed contract address...",
    join: "Join Contract",
    joining: "Joining...",
    increment: "Increment",
    incrementing: "Incrementing...",
    currentValue: "Current Value",
    notJoined: "Enter a contract address above to join",
    error: "Error",
  },
} as const;

export default en;
