const en = {
  error: {
    walletNotFound:
      "Midnight Lace Wallet not found. Please install the extension.",
    versionMismatch:
      "Lace Wallet version ({{version}}) is outdated. Please update to the latest version.",
    networkMismatch:
      "Network mismatch. Please select {{network}} in Lace Settings.",
    userRejected: "Wallet connection was cancelled.",
    walletTimeout:
      "Connection timed out. Please unlock Lace Wallet and try again.",
    walletSyncing:
      "Lace Wallet is still syncing with the network. Please open the Lace extension, wait for sync to finish, then try again.",
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
    selectNetwork: "Select Network",
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
    subtitle: "Connect your Lace Wallet to access Midnight Network",
  },
  toast: {
    copySuccess: "Address copied to clipboard",
  },
  rps: {
    title: "RPS Game (Rock-Paper-Scissors)",
    contractAddress: "Contract Address",
    addressPlaceholder: "Enter deployed contract address...",
    join: "Join Game",
    joining: "Joining...",
    error: "Error",
    moves: {
      rock: "Rock",
      paper: "Paper",
      scissors: "Scissors",
    },
    commit: {
      button: "Commit Move",
      loading: "Generating ZK Proof...",
    },
    reveal: {
      button: "Reveal Move",
      loading: "Generating ZK Proof...",
    },
    waiting: {
      forOpponentCommit: "Waiting for opponent to commit...",
      readyToReveal: "Both players committed. Time to reveal!",
      bothCommitted: "Both players have committed their moves",
      forOpponentReveal: "Waiting for opponent to reveal...",
    },
    phase: {
      select: "Select",
      commit: "Commit",
      reveal: "Reveal",
      result: "Result",
    },
    sealed: {
      title: "Your move is sealed",
      zkSealed: "ZK sealed · commitment on-chain",
    },
    opponent: {
      label: "Opponent",
      waiting: "Waiting to commit...",
      committed: "Committed",
    },
    toast: {
      commitOk: "Move committed successfully!",
      revealOk: "Move revealed!",
    },
    result: {
      win: "You Win! 🎉",
      lose: "You Lose",
      draw: "Draw! 🤝",
      yourMove: "Your Move",
      opponentMove: "Opponent's Move",
      winner: "Winner!",
      playAgain: "Play Again",
    },
  },
} as const;

export default en;
