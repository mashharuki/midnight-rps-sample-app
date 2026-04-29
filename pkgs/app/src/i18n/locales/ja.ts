const ja = {
  error: {
    walletNotFound:
      "Midnight Lace Wallet が見つかりません。拡張機能をインストールしてください。",
    versionMismatch:
      "Lace Wallet のバージョン ({{version}}) が古いです。最新版に更新してください。",
    networkMismatch:
      "ネットワークが一致しません。Lace Settings で PreProd を選択してください。",
    userRejected: "ウォレット接続がキャンセルされました。",
    walletTimeout:
      "接続タイムアウト。Lace Wallet のロックを解除してから再試行してください。",
    unsupportedApi:
      "Unsupported Lace Wallet API: neither connect() nor enable() found.",
    connectGeneric: "接続中にエラーが発生しました。再度お試しください。",
    useWalletOutsideProvider: "useWallet must be used inside WalletProvider",
    connectFailed: "接続に失敗しました。上のボタンで再試行してください。",
    balanceFailed: "残高の取得に失敗しました",
  },
  label: {
    connected: "Connected",
    shieldedAddress: "シールドアドレス",
    balance: "残高",
    refresh: "更新",
    disconnect: "切断する",
    loadingBalance: "残高を取得中...",
    shielded: "Shielded",
    unshielded: "Unshielded",
    dust: "Dust",
  },
  aria: {
    copyAddress: "アドレスをコピー",
    refreshBalance: "残高を更新",
    midnightLogo: "Midnight",
  },
  button: {
    connect: "Connect Lace Wallet",
    connecting: "接続中...",
    disconnect: "切断する",
  },
  app: {
    subtitle:
      "Lace Wallet を接続して Midnight Network (PreProd) にアクセスしてください",
  },
  toast: {
    copySuccess: "アドレスをコピーしました",
  },
  counter: {
    title: "カウンターコントラクト",
    contractAddress: "コントラクトアドレス",
    addressPlaceholder: "デプロイ済みコントラクトアドレスを入力...",
    join: "コントラクトに接続",
    joining: "接続中...",
    increment: "インクリメント",
    incrementing: "処理中...",
    currentValue: "現在値",
    notJoined: "上のコントラクトアドレスを入力して接続してください",
    error: "エラー",
  },
} as const;

export default ja;
