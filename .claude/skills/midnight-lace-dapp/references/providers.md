# Midnight プロバイダー完全リファレンス

## 6プロバイダーの役割

| プロバイダー | パッケージ | 役割 |
|---|---|---|
| `publicDataProvider` | `midnight-js-indexer-public-data-provider` | コントラクトの公開状態・イベント取得 |
| `privateStateProvider` | `midnight-js-level-private-state-provider` | ブラウザローカルのプライベート状態保存 |
| `zkConfigProvider` | `midnight-js-fetch-zk-config-provider` | ZK回路のprover/verifier keyのダウンロード |
| `proofProvider` | `midnight-js-http-client-proof-provider` | Proof Server への証明リクエスト |
| `walletProvider` | カスタム実装 | トランザクションのバランシング（Lace経由） |
| `midnightProvider` | カスタム実装 | トランザクションのノードへの送信（Lace経由） |

## PublicDataProvider

```typescript
import { indexerPublicDataProvider }
  from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';

const publicDataProvider = indexerPublicDataProvider(
  'https://indexer.testnet-02.midnight.network/api/v1/graphql',   // HTTP GraphQL
  'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws', // WebSocket
);

// コントラクト状態のObservable（リアルタイム更新）
const state$ = publicDataProvider.contractStateObservable(
  contractAddress,
  { type: 'all' }  // 'all' | 'latest'
);
```

## PrivateStateProvider

```typescript
import { levelPrivateStateProvider }
  from '@midnight-ntwrk/midnight-js-level-private-state-provider';

// ブラウザのIndexedDBを使用（Node.jsではLevelDB）
const privateStateProvider = levelPrivateStateProvider({
  privateStateStoreName: 'my-contract-private-state', // 一意な名前を使う
});

// 使用例: 初期状態の取得または生成
const getOrCreateInitialState = async (
  provider: PrivateStateProvider<string, MyPrivateState>
): Promise<MyPrivateState> => {
  try {
    const existing = await provider.get('myPrivateStateId');
    if (existing) return existing;
  } catch { /* 初回は存在しない */ }
  return createInitialPrivateState();
};
```

## ZkConfigProvider (キャッシュ付き拡張版)

```typescript
import { FetchZkConfigProvider }
  from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import type { ProverKey, VerifierKey }
  from '@midnight-ntwrk/midnight-js-types';

// キャッシュ付き拡張（ダウンロード状態コールバック付き）
export class CachedFetchZkConfigProvider<K extends string>
  extends FetchZkConfigProvider<K> {
  
  private readonly cache = new Map<string, ProverKey | VerifierKey>();
  
  constructor(
    baseURL: string,
    fetchFunc: typeof fetch,
    private readonly onDownload?: (event: 'started' | 'done', circuitId: K) => void,
  ) {
    super(baseURL, fetchFunc);
  }

  async getProverKey(circuitId: K): Promise<ProverKey> {
    const key = `proverKey:${circuitId}`;
    if (this.cache.has(key)) return this.cache.get(key) as ProverKey;
    
    this.onDownload?.('started', circuitId);
    const proverKey = await super.getProverKey(circuitId);
    this.cache.set(key, proverKey);
    this.onDownload?.('done', circuitId);
    return proverKey;
  }

  async getVerifierKey(circuitId: K): Promise<VerifierKey> {
    const key = `verifierKey:${circuitId}`;
    if (this.cache.has(key)) return this.cache.get(key) as VerifierKey;
    const verifierKey = await super.getVerifierKey(circuitId);
    this.cache.set(key, verifierKey);
    return verifierKey;
  }
}

// 使用例
const zkConfigProvider = new CachedFetchZkConfigProvider<ImpureCircuits>(
  window.location.origin,   // ZKキーファイルのベースURL (/dist に配置)
  fetch.bind(window),
  (event, circuitId) => {
    if (event === 'started') setIsDownloadingProverKey(true);
    if (event === 'done')    setIsDownloadingProverKey(false);
  },
);
```

ZKキーファイルの配置（Viteビルド設定）：
```
public/
  dist/
    managed/
      my-contract/
        proving_key.cbor   ← prover key
        verifying_key.cbor ← verifier key
```

## ProofProvider

```typescript
import { httpClientProofProvider }
  from '@midnight-ntwrk/midnight-js-http-client-proof-provider';

const proofProvider = httpClientProofProvider(
  'http://127.0.0.1:6300'  // Proof Server URI
);

// カスタムラッパー（ProveTxConfig 対応）
import type { UnprovenTransaction, ProveTxConfig }
  from '@midnight-ntwrk/midnight-js-types';

const proofProvider = {
  proveTx(tx: UnprovenTransaction, config?: ProveTxConfig<K>) {
    return httpClientProofProvider(uri).proveTx(tx, config);
  },
};
```

## WalletProvider (Laceを使用した実装)

```typescript
import { Transaction } from '@midnight-ntwrk/ledger';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { getLedgerNetworkId, getZswapNetworkId }
  from '@midnight-ntwrk/midnight-js-network-id';
import { createBalancedTx } from '@midnight-ntwrk/midnight-js-types';

const walletProvider: WalletProvider = {
  coinPublicKey: walletState.coinPublicKey,
  encryptionPublicKey: walletState.encryptionPublicKey,
  
  balanceTx(
    tx: UnbalancedTransaction,
    newCoins: CoinInfo[]
  ): Promise<BalancedTransaction> {
    // UnbalancedTransaction → ZswapTransaction に変換してLaceに渡す
    const zswapTx = ZswapTransaction.deserialize(
      tx.serialize(getLedgerNetworkId()),
      getZswapNetworkId()
    );
    
    return walletState.wallet
      .balanceAndProveTransaction(zswapTx, newCoins)
      .then((signedZswapTx) =>
        // 返ってきた ZswapTransaction → BalancedTransaction に変換
        Transaction.deserialize(
          signedZswapTx.serialize(getZswapNetworkId()),
          getLedgerNetworkId()
        )
      )
      .then(createBalancedTx);
  },
};
```

## MidnightProvider (Laceを使用した実装)

```typescript
import type { TransactionId } from '@midnight-ntwrk/ledger';

const midnightProvider: MidnightProvider = {
  submitTx(tx: BalancedTransaction): Promise<TransactionId> {
    return walletState.wallet.submitTransaction(tx);
  },
};
```

## MidnightProviders 型定義

```typescript
import type { MidnightProviders, ImpureCircuitId }
  from '@midnight-ntwrk/midnight-js-types';

// コントラクトに合わせてジェネリクスを設定
type MyProviders = MidnightProviders<
  ImpureCircuitId<MyContract>,  // K: 回路ID
  typeof MY_PRIVATE_STATE_ID,   // S: プライベート状態ID
  MyPrivateState                // P: プライベート状態型
>;
```

## プロバイダー検証（デプロイ前）

```typescript
function validateProviders(providers: MyProviders): void {
  const required: (keyof MyProviders)[] = [
    'publicDataProvider',
    'privateStateProvider',
    'zkConfigProvider',
    'proofProvider',
    'walletProvider',
    'midnightProvider',
  ];
  for (const key of required) {
    if (!providers[key]) throw new Error(`${key} is required`);
  }
}
```

## 読み取り専用モード（ウォレット未接続時）

ウォレット未接続でも公開状態は読める。walletProvider/midnightProvider を
ダミーにして publicDataProvider だけ動かす：

```typescript
const readonlyProviders: Partial<MyProviders> = {
  publicDataProvider,
  // walletProvider, midnightProvider は省略
};
```
