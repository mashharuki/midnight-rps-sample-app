---
name: midnight-lace-dapp
description: >
  Midnight上でLace Walletと接続するフルスタックdAppを開発するための包括的ガイド。
  Lace Walletの検出・接続（DAppConnectorAPI v4/レガシー両対応）、MidnightプロバイダーチェーンのReact統合、
  コントラクトのデプロイ・呼び出し、Viteビルド設定（WebAssembly/polyfill）、エラーハンドリング、
  ローカル開発環境（Docker）を網羅する。
  次のキーワードが含まれる場合は必ずこのスキルを使用すること：
  "Lace Wallet", "Lace接続", "dApp Connector", "midnight SDK", "midnight フルスタック",
  "walletProvider", "MidnightProvider", "connectToWallet", "deployContract", "findDeployedContract",
  "DAppConnectorAPI", "midnight React", "midnight Vite", "midnight ローカル開発",
  "midnight プロバイダー", "midnight TypeScript", "midnight wallet integration".
license: MIT
metadata:
  author: mashharuki
  version: "2.0.0"
  midnight-js-version: "2.0.2"
  dapp-connector-api-version: "3.0.0"
  reference: "example-kitties"
---

# Midnight × Lace Wallet フルスタック dApp 開発ガイド

> **対象バージョン**: `@midnight-ntwrk/midnight-js-*` 2.0.x, `@midnight-ntwrk/dapp-connector-api` 3.0.0, `@midnight-ntwrk/wallet-api` 5.0.0

詳細リファレンスは `references/` を参照：
- [`references/providers.md`](references/providers.md) — プロバイダーの完全実装
- [`references/wallet-connection.md`](references/wallet-connection.md) — ウォレット接続の全フロー
- [`references/react-integration.md`](references/react-integration.md) — Reactコンポーネントパターン
- [`references/build-config.md`](references/build-config.md) — Vite設定とpolyfill
- [`references/errors.md`](references/errors.md) — エラー種別と対処法

---

## 1. パッケージ依存関係

```bash
yarn add \
  @midnight-ntwrk/midnight-js-contracts@2.0.2 \
  @midnight-ntwrk/midnight-js-types@2.0.2 \
  @midnight-ntwrk/midnight-js-network-id@2.0.2 \
  @midnight-ntwrk/midnight-js-utils@2.0.2 \
  @midnight-ntwrk/midnight-js-indexer-public-data-provider@2.0.2 \
  @midnight-ntwrk/midnight-js-http-client-proof-provider@2.0.2 \
  @midnight-ntwrk/midnight-js-fetch-zk-config-provider@2.0.2 \
  @midnight-ntwrk/midnight-js-level-private-state-provider@2.0.2 \
  @midnight-ntwrk/dapp-connector-api@^3.0.0 \
  @midnight-ntwrk/compact-runtime@0.9.0 \
  @midnight-ntwrk/ledger@^4.0.0 \
  @midnight-ntwrk/zswap@^4.0.0 \
  @midnight-ntwrk/wallet-api@5.0.0 \
  rxjs semver
```

---

## 2. Lace Wallet 接続 (connectToWallet)

Lace Wallet は `window.midnight.mnLace` に `DAppConnectorAPI` を公開する。
接続は非同期で 100ms ポーリング → 10秒タイムアウトで検出する。

```typescript
import { interval, filter, take, timeout, concatMap, map, tap } from 'rxjs';
import type { DAppConnectorAPI, DAppConnectorWalletAPI, ServiceUriConfig }
  from '@midnight-ntwrk/dapp-connector-api';
import semver from 'semver';

const COMPATIBLE_CONNECTOR_API_VERSION = '>=1.0.0';

export async function connectToWallet(logger?: Logger): Promise<{
  wallet: DAppConnectorWalletAPI;
  uris: ServiceUriConfig;
}> {
  // Step 1: Lace Wallet を検出
  const connectorAPI = await firstValueFrom(
    interval(100).pipe(
      map(() => {
        const midnight = (globalThis.window as any)?.midnight;
        if (midnight?.mnLace) return midnight.mnLace as DAppConnectorAPI;
        // フォールバック: apiVersion プロパティを持つオブジェクトを探す
        if (midnight) {
          const found = Object.values(midnight as object).find(
            (v: any) => typeof v?.apiVersion === 'string'
          );
          if (found) return found as DAppConnectorAPI;
        }
        return null;
      }),
      filter((api): api is DAppConnectorAPI => !!api),
      take(1),
      timeout({ first: 10_000 }), // 10秒で諦める
    ),
  );

  // Step 2: APIバージョン互換性チェック
  if (!semver.satisfies(connectorAPI.apiVersion, COMPATIBLE_CONNECTOR_API_VERSION)) {
    throw new Error(
      `Incompatible Midnight Lace wallet version. ` +
      `Require '${COMPATIBLE_CONNECTOR_API_VERSION}', got '${connectorAPI.apiVersion}'.`
    );
  }

  // Step 3: connect
  // ⚠️ Lace v4 (4.0.0+): isEnabled() と enable() は存在しない。
  // connectorAPI 自身に connect(networkId) が直接生えている。
  // 旧スキルの「enable() → api.connect()」パターンは v4 では動作しない。
  const raw = connectorAPI as any;
  let walletConnectorAPI: DAppConnectorWalletAPI | null = null;
  let uris: ServiceUriConfig | null = null;
  const candidates = ['preprod', 'mainnet', 'undeployed', 'preview'];

  if (typeof raw.connect === 'function') {
    // Lace v4: connectorAPI.connect(networkId) 直接呼び出し
    let lastError: unknown;
    for (const networkId of candidates) {
      try {
        walletConnectorAPI = await raw.connect(networkId);
        if (typeof raw.getConfiguration === 'function') {
          const config = await raw.getConfiguration();
          uris = {
            indexerUri:      config.indexerUri ?? config.indexerUrl ?? '',
            indexerWsUri:    config.indexerWsUri ?? config.indexerWsUrl ?? config.indexerWebSocketUrl ?? '',
            proverServerUri: config.proverServerUri ?? config.proofServerUri ?? config.proverUri ?? config.proofServerUrl ?? '',
            substrateNodeUri:config.substrateNodeUri ?? config.nodeUri ?? config.substrateUri ?? '',
          };
        }
        break;
      } catch (e: unknown) {
        lastError = e;
        const reason = (e as any)?.reason ?? (e as any)?.message ?? String(e);
        if (!reason.toLowerCase().includes('mismatch') && !reason.toLowerCase().includes('unsupported')) break;
      }
    }
    if (!walletConnectorAPI) {
      throw new Error(
        `Cannot connect to Midnight Lace wallet. ` +
        `Tried networks: ${candidates.join(', ')}. ` +
        `Please check Lace Settings → Midnight network.`
      );
    }
  } else if (typeof raw.enable === 'function') {
    // Legacy: enable() → optional connect() on enabled API
    const enabledAPI = await raw.enable();
    if (typeof enabledAPI.connect === 'function') {
      let lastError: unknown;
      for (const networkId of candidates) {
        try {
          walletConnectorAPI = await enabledAPI.connect(networkId);
          break;
        } catch (e: unknown) {
          lastError = e;
          const reason = (e as any)?.reason ?? (e as any)?.message ?? String(e);
          if (!reason.toLowerCase().includes('mismatch') && !reason.toLowerCase().includes('unsupported')) break;
        }
      }
    } else {
      walletConnectorAPI = enabledAPI as unknown as DAppConnectorWalletAPI;
    }
  } else {
    throw new Error('Unsupported Lace Wallet API: neither connect() nor enable() found.');
  }

  if (!walletConnectorAPI) {
    throw new Error(
      `Cannot connect to Midnight Lace wallet. ` +
      `Tried networks: ${candidates.join(', ')}. ` +
      `Please check Lace Settings → Midnight network.`
    );
  }

  // フォールバック URI（getConfiguration が存在しない場合）
  uris ??= {
    indexerUri: 'https://indexer.testnet-02.midnight.network/api/v1/graphql',
    indexerWsUri: 'wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws',
    proverServerUri: 'http://127.0.0.1:6300',
    substrateNodeUri: '',
  };

  return { wallet: walletConnectorAPI, uris };
}
```

> **重要**: `window.midnight.mnLace` が well-known キー。存在しない場合は `apiVersion` プロパティで汎用検索する。

---

## 3. ウォレット状態の取得

> ⚠️ **Lace v4 (4.0.0+) では `wallet.state()` は存在しない。**
> `getShieldedAddresses()` を使用すること。

```typescript
// ✅ Lace v4 正しい方法
// 戻り値は配列ではなく単一オブジェクト。フィールド名は shielded プレフィックス付き。
// { shieldedAddress, shieldedCoinPublicKey, shieldedEncryptionPublicKey }
const result = await walletAPI.getShieldedAddresses();
const entry = Array.isArray(result) ? result[0] : result;
const address = entry?.shieldedAddress ?? entry?.address ?? '';
const coinPublicKey = entry?.shieldedCoinPublicKey ?? entry?.coinPublicKey ?? '';
const encryptionPublicKey = entry?.shieldedEncryptionPublicKey ?? entry?.encryptionPublicKey ?? '';

// ❌ Lace v4 では動作しない（legacy のみ）
// const reqState = await wallet.state();
```

また、`getConfiguration()` も **walletAPI 側**に存在する（connectToWallet の connector 側ではない）：

```typescript
const cfg = await walletAPI.getConfiguration();
```

Lace v4 の場合は `getShieldedAddresses()` も利用可能（上記と同一）：

```typescript
const addresses = await v4Api.getShieldedAddresses();
const first = addresses[0];
const address = first?.address ?? first?.shieldedAddress ?? '';
const coinPublicKey = first?.coinPublicKey ?? first?.shieldedCoinPublicKey ?? '';
```

---

## 4. プロバイダーチェーンの構築

コントラクト操作には 6 種類のプロバイダーが必要。詳細は [`references/providers.md`](references/providers.md) を参照。

```typescript
import { levelPrivateStateProvider }
  from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider }
  from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider }
  from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { FetchZkConfigProvider }
  from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { getLedgerNetworkId, getZswapNetworkId }
  from '@midnight-ntwrk/midnight-js-network-id';
import { Transaction } from '@midnight-ntwrk/ledger';
import { Transaction as ZswapTransaction } from '@midnight-ntwrk/zswap';
import { createBalancedTx } from '@midnight-ntwrk/midnight-js-types';
import type {
  WalletProvider, MidnightProvider, PrivateStateProvider,
  PublicDataProvider, ProofProvider, ZKConfigProvider,
  UnbalancedTransaction, BalancedTransaction, MidnightProviders,
} from '@midnight-ntwrk/midnight-js-types';
import type { CoinInfo, TransactionId } from '@midnight-ntwrk/ledger';

export function createProviders<K extends string, S extends string, P>(
  walletState: { wallet: DAppConnectorWalletAPI; uris: ServiceUriConfig; coinPublicKey: string; encryptionPublicKey: string },
  privateStateStoreName: string,
  zkConfigBaseUrl: string,
): MidnightProviders<K, S, P> {
  // IndexerベースのPublicDataProvider
  const publicDataProvider: PublicDataProvider = indexerPublicDataProvider(
    walletState.uris.indexerUri,
    walletState.uris.indexerWsUri,
  );

  // Levelベースのプライベート状態ストア（ブラウザIndexedDB）
  const privateStateProvider = levelPrivateStateProvider<S, P>({
    privateStateStoreName,
  });

  // ZK証明キープロバイダー（ブラウザキャッシュ推奨）
  const zkConfigProvider = new FetchZkConfigProvider<K>(
    zkConfigBaseUrl,
    fetch.bind(window),
  );

  // 証明サーバークライアント
  const proofProvider: ProofProvider<K> = httpClientProofProvider(
    walletState.uris.proverServerUri,
  );

  // ウォレット署名プロバイダー
  const walletProvider: WalletProvider = {
    coinPublicKey: walletState.coinPublicKey,
    encryptionPublicKey: walletState.encryptionPublicKey,
    balanceTx(tx: UnbalancedTransaction, newCoins: CoinInfo[]): Promise<BalancedTransaction> {
      return walletState.wallet
        .balanceAndProveTransaction(
          ZswapTransaction.deserialize(tx.serialize(getLedgerNetworkId()), getZswapNetworkId()),
          newCoins,
        )
        .then((zswapTx) =>
          Transaction.deserialize(zswapTx.serialize(getZswapNetworkId()), getLedgerNetworkId())
        )
        .then(createBalancedTx);
    },
  };

  // トランザクション送信プロバイダー
  const midnightProvider: MidnightProvider = {
    submitTx(tx: BalancedTransaction): Promise<TransactionId> {
      return walletState.wallet.submitTransaction(tx);
    },
  };

  return {
    publicDataProvider,
    privateStateProvider,
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };
}
```

---

## 5. コントラクトのデプロイと接続

```typescript
import { deployContract, findDeployedContract }
  from '@midnight-ntwrk/midnight-js-contracts';
import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';

// ---- デプロイ ----
const deployedContract = await deployContract(providers as any, {
  contract: contractInstance,           // new MyContract.Contract(witnesses)
  privateStateId: 'myPrivateStateId',   // プライベート状態の識別子
  initialPrivateState: initialState,    // 初期プライベート状態
});

// ---- 既存コントラクトへの接続 ----
const deployedContract = await findDeployedContract(providers as any, {
  contractAddress,                      // ContractAddress | string
  contract: contractInstance,
  privateStateId: 'myPrivateStateId',
  initialPrivateState: await getOrCreateInitialState(providers.privateStateProvider),
});

// コントラクトアドレスの取得
const address: ContractAddress = deployedContract.deployTxData.public.contractAddress;
```

### コントラクト呼び出し（書き込み）

```typescript
// トランザクション送信（balance + prove + submit が自動実行）
const finalizedTxData = await deployedContract.callTx.myCircuit(arg1, arg2);
// FinalizedTxData { public: { blockHeight, txId, contractAddress, ... } }
```

### コントラクト呼び出し（読み取り＋プライベート結果）

```typescript
// プライベート結果が必要な場合
const response = await deployedContract.callTx.myQuery(param);
const privateResult = (response as any).private.result;
```

---

## 6. パブリック状態の Observable 監視

```typescript
import { map, retry } from 'rxjs';
import type { Observable } from 'rxjs';

const state$: Observable<MyState> = providers.publicDataProvider
  .contractStateObservable(deployedContractAddress, { type: 'all' })
  .pipe(
    map((contractState) => MyContract.ledger(contractState.data)),
    map((ledgerState) => ({
      count: ledgerState.count,
      items: new Map(Array.from(ledgerState.items)),
    })),
    retry({ delay: 500 }), // エラー時に500ms後リトライ
  );

// React での購読
useEffect(() => {
  const sub = state$.subscribe((state) => setContractState(state));
  return () => sub.unsubscribe();
}, [state$]);
```

---

## 7. React 統合パターン

詳細は [`references/react-integration.md`](references/react-integration.md) を参照。

### コンテキストプロバイダーの骨格

```typescript
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

interface WalletContextState {
  isConnected: boolean;
  address?: string;
  coinPublicKey?: string;
  uris?: ServiceUriConfig;
  wallet?: DAppConnectorWalletAPI;
  providers?: MyProviders;
  connect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextState | null>(null);

export const WalletProvider: React.FC<{ networkId: string; children: React.ReactNode }> = ({
  networkId,
  children,
}) => {
  const [walletAPI, setWalletAPI] = useState<{ wallet: DAppConnectorWalletAPI; uris: ServiceUriConfig } | null>(null);
  const [address, setAddress] = useState<string>();

  // ネットワークIDをSDKにセット（初回のみ）
  useEffect(() => {
    setNetworkId(networkId as any);
  }, [networkId]);

  const connect = async () => {
    const result = await connectToWallet();
    // Lace v4: address is already in result.state (populated from getShieldedAddresses)
    setAddress(result.state.address);
    setWalletAPI(result);
  };

  // ウォレット接続後にプロバイダーを生成
  const providers = useMemo(() => {
    if (!walletAPI) return undefined;
    const state = await walletAPI.wallet.state();
    return createProviders(
      { ...walletAPI, coinPublicKey: state.coinPublicKey, encryptionPublicKey: state.encryptionPublicKey },
      'my-private-state',
      window.location.origin,
    );
  }, [walletAPI]);

  return (
    <WalletContext.Provider value={{
      isConnected: !!walletAPI,
      address,
      uris: walletAPI?.uris,
      wallet: walletAPI?.wallet,
      providers,
      connect,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
};
```

---

## 8. ネットワーク設定

```typescript
import { setNetworkId, NetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// アプリ起動時に一度だけ呼ぶ
setNetworkId(NetworkId.TestNet);      // テストネット
setNetworkId(NetworkId.Undeployed);   // スタンドアロン（ローカル）
```

| 環境 | NetworkId | indexerUri |
|------|-----------|-----------|
| Testnet | `TestNet` | `https://indexer.testnet-02.midnight.network/api/v1/graphql` |
| Standalone | `Undeployed` | `http://127.0.0.1:8088/api/v1/graphql` |
| Preview | `TestNet` | `https://indexer.preview.midnight.network/api/v1/graphql` |

---

## 9. ローカル開発環境 (Docker Compose)

```yaml
# standalone.yml
services:
  proof-server:
    image: "midnightnetwork/proof-server:4.0.0"
    ports: ["6300:6300"]

  indexer:
    image: "midnightntwrk/indexer-standalone:2.1.1"
    ports: ["8088:8088"]

  node:
    image: "midnightnetwork/midnight-node:0.12.0"
    ports: ["9955:9944"]
```

```bash
docker compose -f standalone.yml up -d
```

Proof server の起動確認：

```bash
curl http://localhost:6300
# → "We're alive 🎉!" が返れば OK
```

---

## 10. Vite ビルド設定 (WebAssembly + Node polyfill)

詳細は [`references/build-config.md`](references/build-config.md) を参照。

```typescript
// vite.config.ts
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import inject from '@rollup/plugin-inject';
import stdLibBrowser from 'node-stdlib-browser';

export default {
  plugins: [
    react(),
    wasm(),
    viteCommonjs(),
    inject({ process: 'process/browser', Buffer: ['buffer', 'Buffer'] }),
  ],
  resolve: { alias: stdLibBrowser },
  optimizeDeps: { exclude: ['@midnight-ntwrk/midnight-js-level-private-state-provider'] },
  worker: { format: 'es', plugins: () => [wasm()] },
};
```

必要な devDependencies：

```bash
yarn add -D \
  vite-plugin-wasm \
  @originjs/vite-plugin-commonjs \
  @rollup/plugin-inject \
  node-stdlib-browser
```

---

## 11. エラーハンドリング早見表

| エラーメッセージ | 原因 | 対処 |
|---|---|---|
| `Could not find Midnight Lace wallet` | Lace 未インストール / ページロード前 | インストール案内 / 10秒待機 |
| `Incompatible version` | Lace のバージョン古い | Lace アップデートを促す |
| `timeout` (10s) | Lace がロックされている | unlock してから再接続 |
| `network mismatch` | Lace の設定ネットワークが不一致 | Lace Settings → Midnight network |
| `user rejected` | ユーザーが接続拒否 | 再接続ボタンを表示 |
| `verifier key` エラー | コントラクトとランタイムのバージョン不一致 | コントラクト再コンパイル |

完全なエラー列挙は [`references/errors.md`](references/errors.md) を参照。

---

## 12. アドレス表示のトリミング（慣習）

```typescript
const truncateAddress = (address: string) =>
  `${address.substring(0, 6)}...${address.substring(22, 26)}...${address.substring(124, 132)}`;
```

---

## チェックリスト（新規dApp開発時）

- [ ] `setNetworkId()` をアプリ起動時に呼ぶ
- [ ] `connectToWallet()` で Lace v4 / レガシー両対応
- [ ] 6つのプロバイダーをすべて初期化
- [ ] Vite設定に wasm / commonjs / polyfill を追加
- [ ] Proof server の起動確認（`/api/v1/graphql` ヘルスチェック）
- [ ] ネットワーク設定を環境変数で切り替え可能にする
- [ ] コントラクトアドレスを LocalStorage / URL パラメータで保持
