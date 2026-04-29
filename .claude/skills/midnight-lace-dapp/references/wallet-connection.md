# Lace Wallet 接続 完全リファレンス

## window.midnight オブジェクト構造

```typescript
// Lace がインストールされている場合にブラウザに注入される
window.midnight = {
  mnLace: DAppConnectorAPI,  // well-known キー（優先）
  // 他のウォレットが存在する場合もある
};

interface DAppConnectorAPI {
  apiVersion: string;         // semver (例: "1.2.0")
  name: string;               // "Midnight Lace"
  icon: string;               // SVG/PNG データURI
  isEnabled(): Promise<boolean>;
  enable(): Promise<DAppConnectorAPI_v1>;
  // Lace v4 のみ
  connect(networkId: string): Promise<DAppConnectorWalletAPI>;
  getConfiguration(): Promise<NetworkConfiguration>;
  getShieldedAddresses(): Promise<ShieldedAddress[]>;
}
```

## 接続フロー詳細

```
ブラウザ起動
    │
    ▼
window.midnight.mnLace を 100ms ごとにポーリング
    │ (最大 10 秒)
    ├─ 発見 → apiVersion 互換性チェック (semver >=1.0.0)
    │         ↓
    │         isEnabled() / enable()
    │         ↓
    │    Lace v4?
    │    ├─ YES: connect('preprod') or connect('mainnet') ...
    │    │        getConfiguration() で URIs 取得
    │    └─ NO:  レガシー v1 フォールバック
    │             デフォルト URIs を使用
    │
    └─ 10秒タイムアウト → WALLET_NOT_FOUND エラー
```

## Lace v4 vs レガシー v1 の見分け方

```typescript
const isV4 = typeof (api as any).connect === 'function';
```

## NetworkConfiguration 型 (Lace v4)

```typescript
interface NetworkConfiguration {
  // 以下のプロパティはバージョンによって存在するものが異なる
  indexerUri?: string;
  indexerUrl?: string;          // 旧バージョン
  indexerWsUri?: string;
  indexerWsUrl?: string;        // 旧バージョン
  indexerWebSocketUrl?: string; // さらに旧バージョン
  proverServerUri?: string;
  proofServerUri?: string;      // 旧バージョン
  proverUri?: string;           // さらに旧バージョン
  proofServerUrl?: string;      // 旧バージョン
  substrateNodeUri?: string;
  nodeUri?: string;             // 旧バージョン
  substrateUri?: string;        // 旧バージョン
}

// 正規化処理（必ず複数フォールバックを用意）
const uris: ServiceUriConfig = {
  indexerUri:       config.indexerUri ?? config.indexerUrl ?? '',
  indexerWsUri:     config.indexerWsUri ?? config.indexerWsUrl ?? config.indexerWebSocketUrl ?? '',
  proverServerUri:  config.proverServerUri ?? config.proofServerUri ?? config.proverUri ?? config.proofServerUrl ?? '',
  substrateNodeUri: config.substrateNodeUri ?? config.nodeUri ?? config.substrateUri ?? '',
};
```

## DAppConnectorWalletAPI インターフェース

```typescript
interface DAppConnectorWalletAPI {
  // 現在のウォレット状態（アドレス・公開鍵）を取得
  state(): Promise<DAppConnectorWalletState>;

  // トランザクションのバランシング + 証明 + 提出を一括実行（推奨）
  balanceAndProveTransaction(
    tx: ZswapTransaction,
    newCoins: CoinInfo[]
  ): Promise<ZswapTransaction>;

  // トランザクションをノードに送信
  submitTransaction(tx: BalancedTransaction): Promise<TransactionId>;

  // 非推奨（後方互換性のためのスタブ）
  balanceTransaction(tx: any, newCoins: CoinInfo[]): Promise<any>;
  proveTransaction(tx: any): Promise<any>;
}

interface DAppConnectorWalletState {
  address: string;              // シールドアドレス（メイン）
  coinPublicKey: string;        // コイン公開鍵
  encryptionPublicKey: string;  // 暗号化公開鍵
  // レガシーフィールド（旧バージョン互換）
  addressLegacy?: string;
  coinPublicKeyLegacy?: string;
  encryptionPublicKeyLegacy?: string;
}
```

## 接続状態の自動保存・復元

```typescript
const WALLET_CONNECTED_KEY = 'midnight_wallet_connected';

// 接続成功時
localStorage.setItem(WALLET_CONNECTED_KEY, 'true');

// ページロード時の自動接続
useEffect(() => {
  const wasConnected = localStorage.getItem(WALLET_CONNECTED_KEY) === 'true';
  if (wasConnected) {
    connect(false).catch(console.error);
  }
}, []);

// 切断時
const disconnect = () => {
  localStorage.removeItem(WALLET_CONNECTED_KEY);
  setWalletAPI(null);
};
```

## Proof Server ヘルスチェック

```typescript
async function isProofServerOnline(uri: string): Promise<boolean> {
  try {
    const res = await fetch(uri, { signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    return text.includes("We're alive");
  } catch {
    return false;
  }
}
```
