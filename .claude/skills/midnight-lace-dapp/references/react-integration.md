# React × Midnight Lace 統合パターン

## アプリケーション全体構成

```
src/
  main.tsx            ← setNetworkId を最初に呼ぶ
  App.tsx             ← WalletProvider でラップ
  context/
    WalletContext.tsx ← Lace接続・プロバイダー管理
  components/
    WalletWidget.tsx  ← 接続ボタン・アドレス表示
    ContractView.tsx  ← コントラクト操作UI
  hooks/
    useContractAPI.ts ← コントラクトAPIフック
```

## main.tsx: ネットワークID初期化

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { setNetworkId, NetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import App from './App';

// アプリ起動の最初に一度だけ設定
setNetworkId(NetworkId.TestNet);  // 本番: TestNet, ローカル: Undeployed

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

## WalletContext.tsx: コンテキストプロバイダー全実装

```typescript
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { DAppConnectorWalletAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { ServiceUriConfig } from '@midnight-ntwrk/dapp-connector-api';
import type { PublicDataProvider, WalletProvider, MidnightProvider } from '@midnight-ntwrk/midnight-js-types';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { connectToWallet } from './connectToWallet'; // 上記の実装
import { createProviders } from './createProviders';  // 上記の実装

export type MidnightWalletErrorType =
  | 'WALLET_NOT_FOUND'
  | 'INCOMPATIBLE_VERSION'
  | 'TIMEOUT'
  | 'USER_REJECTED'
  | 'NETWORK_MISMATCH'
  | 'UNKNOWN';

interface WalletState {
  isConnected: boolean;
  isConnecting: boolean;
  error?: MidnightWalletErrorType;
  address?: string;
  coinPublicKey?: string;
  encryptionPublicKey?: string;
  uris?: ServiceUriConfig;
  wallet?: DAppConnectorWalletAPI;
  publicDataProvider?: PublicDataProvider;
  walletProvider?: WalletProvider;
  midnightProvider?: MidnightProvider;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

const WALLET_CONNECTED_KEY = 'midnight_wallet_connected';

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletAPI, setWalletAPI] = useState<{
    wallet: DAppConnectorWalletAPI;
    uris: ServiceUriConfig;
    address: string;
    coinPublicKey: string;
    encryptionPublicKey: string;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<MidnightWalletErrorType | undefined>();

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(undefined);
    try {
      const result = await connectToWallet();
      const state = await result.wallet.state();
      setWalletAPI({
        wallet: result.wallet,
        uris: result.uris,
        address: state.address,
        coinPublicKey: state.coinPublicKey,
        encryptionPublicKey: state.encryptionPublicKey,
      });
      localStorage.setItem(WALLET_CONNECTED_KEY, 'true');
    } catch (e: unknown) {
      const msg = (e as Error).message ?? '';
      if (msg.includes('Could not find'))      setError('WALLET_NOT_FOUND');
      else if (msg.includes('Incompatible'))   setError('INCOMPATIBLE_VERSION');
      else if (msg.includes('timeout'))        setError('TIMEOUT');
      else if (msg.includes('rejected'))       setError('USER_REJECTED');
      else if (msg.includes('mismatch'))       setError('NETWORK_MISMATCH');
      else                                     setError('UNKNOWN');
    }
    setIsConnecting(false);
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(WALLET_CONNECTED_KEY);
    setWalletAPI(null);
    setError(undefined);
  }, []);

  // 前回接続済みなら自動再接続
  useEffect(() => {
    if (localStorage.getItem(WALLET_CONNECTED_KEY) === 'true') {
      connect().catch(console.error);
    }
  }, []);

  // PublicDataProvider: walletAPI が変わるたびに再生成
  const publicDataProvider = useMemo<PublicDataProvider | undefined>(() => {
    if (!walletAPI) return undefined;
    return indexerPublicDataProvider(walletAPI.uris.indexerUri, walletAPI.uris.indexerWsUri);
  }, [walletAPI?.uris.indexerUri, walletAPI?.uris.indexerWsUri]);

  // WalletProvider / MidnightProvider は references/providers.md を参照

  return (
    <WalletContext.Provider value={{
      isConnected: !!walletAPI,
      isConnecting,
      error,
      address: walletAPI?.address,
      coinPublicKey: walletAPI?.coinPublicKey,
      encryptionPublicKey: walletAPI?.encryptionPublicKey,
      uris: walletAPI?.uris,
      wallet: walletAPI?.wallet,
      publicDataProvider,
      connect,
      disconnect,
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletState => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
};
```

## WalletWidget.tsx: ウォレットボタンコンポーネント

```typescript
import React from 'react';
import { useWallet } from '../context/WalletContext';

const ERROR_MESSAGES: Record<string, string> = {
  WALLET_NOT_FOUND:       'Midnight Lace Wallet が見つかりません。インストールしてください。',
  INCOMPATIBLE_VERSION:   'Lace Wallet のバージョンが古すぎます。アップデートしてください。',
  TIMEOUT:                'ウォレットの応答がタイムアウトしました。ロック解除して再試行してください。',
  USER_REJECTED:          '接続が拒否されました。',
  NETWORK_MISMATCH:       'Lace のネットワーク設定を確認してください（Settings → Midnight network）。',
  UNKNOWN:                '予期しないエラーが発生しました。',
};

const truncateAddress = (addr: string) =>
  `${addr.substring(0, 6)}...${addr.substring(22, 26)}...${addr.substring(124, 132)}`;

export const WalletWidget: React.FC = () => {
  const { isConnected, isConnecting, error, address, connect, disconnect } = useWallet();

  if (isConnecting) {
    return <button disabled>接続中...</button>;
  }

  if (isConnected && address) {
    return (
      <div>
        <span title={address}>{truncateAddress(address)}</span>
        <button onClick={disconnect}>切断</button>
      </div>
    );
  }

  return (
    <div>
      {error && <p style={{ color: 'red' }}>{ERROR_MESSAGES[error] ?? ERROR_MESSAGES.UNKNOWN}</p>}
      <button onClick={connect}>Lace Wallet に接続</button>
    </div>
  );
};
```

## useContractAPI.ts: コントラクトAPIフック

```typescript
import { useState, useEffect, useCallback } from 'react';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { useWallet } from '../context/WalletContext';
import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';

const CONTRACT_ADDRESS_KEY = 'midnight_contract_address';

export function useContractAPI() {
  const wallet = useWallet();
  const [contractAPI, setContractAPI] = useState<MyContractAPI | null>(null);
  const [contractState, setContractState] = useState<MyContractState | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // プロバイダーが揃ったら保存済みコントラクトに接続
  useEffect(() => {
    if (!wallet.isConnected || !wallet.publicDataProvider) return;
    
    const savedAddress = localStorage.getItem(CONTRACT_ADDRESS_KEY);
    if (savedAddress) {
      connectToContract(savedAddress as ContractAddress);
    }
  }, [wallet.isConnected]);

  // コントラクト状態の購読
  useEffect(() => {
    if (!contractAPI) return;
    const sub = contractAPI.state$.subscribe(setContractState);
    return () => sub.unsubscribe();
  }, [contractAPI]);

  const deployNewContract = useCallback(async () => {
    setIsDeploying(true);
    setError(null);
    try {
      const providers = buildProviders(wallet);
      const api = await MyContractAPI.deploy(providers, createInitialPrivateState());
      const address = api.contractAddress;
      localStorage.setItem(CONTRACT_ADDRESS_KEY, address);
      setContractAPI(api);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setIsDeploying(false);
  }, [wallet]);

  const connectToContract = useCallback(async (address: ContractAddress | string) => {
    try {
      const providers = buildProviders(wallet);
      const api = await MyContractAPI.connect(providers, address);
      setContractAPI(api);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, [wallet]);

  return { contractAPI, contractState, isDeploying, error, deployNewContract, connectToContract };
}
```

## Observable 状態のリアルタイム更新

```typescript
// コントラクトのpublic状態をリアルタイム表示するパターン
import { map, retry, startWith } from 'rxjs';

const state$ = providers.publicDataProvider
  .contractStateObservable(contractAddress, { type: 'all' })
  .pipe(
    map((raw) => MyContract.ledger(raw.data)),
    map((ledger) => transformToViewState(ledger)),
    retry({ delay: 500 }),
    startWith(null), // 初期値をnullにして loading 状態を表現
  );

// useEffect で購読
useEffect(() => {
  const sub = state$.subscribe({
    next: (state) => setState(state),
    error: (e) => setError(e.message),
  });
  return () => sub.unsubscribe();
}, [state$]);
```

## トランザクション実行中のUI状態管理

```typescript
type TxStatus = 'idle' | 'proving' | 'submitting' | 'confirmed' | 'error';

function useTransaction<T>(fn: () => Promise<T>) {
  const [status, setStatus] = useState<TxStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const execute = async () => {
    setStatus('proving');
    setError(null);
    try {
      await fn();
      setStatus('confirmed');
    } catch (e: unknown) {
      setStatus('error');
      setError((e as Error).message);
    }
  };

  return { status, error, execute };
}

// 使用例
const { status, execute } = useTransaction(() => contractAPI.createItem());
```

## オンチェーン状態との再照合パターン（Lace のエラー誤報への対処）

Lace 拡張機能は、実際には成功した on-chain トランザクション（例: `contract.callTx.commit()`）を、拡張機能内部のメッセージングの問題（`runtime.lastError` チャンネルが閉じる等）でエラーとして UI 側に伝播させることがある。ローカルの楽観的 status（`idle → committing → committed`）だけを信頼すると、ユーザーは実際には成功しているのに「エラー」画面から抜け出せなくなる。

**対処**: ローカル status を「ヒント」として扱い、`publicDataProvider` の Observable 購読から得られる**実際の ledger 状態を正**として、両者が食い違ったら ledger 側に合わせて自動修復する。

```typescript
const [status, setStatus] = useState<'idle' | 'committing' | 'committed' | 'error'>('idle');
const prevStatusRef = useRef(status); // エラー直前の status を退避（復帰時のフォールバック用）

// 1. 購読側: ledger の状態が進んでいたら、ローカル status がまだ古い場合のみ前進させる
useEffect(() => {
  const sub = state$.subscribe((ledger) => {
    setLedgerState(ledger);
    if (ledger.phase === 'committed') {
      // ページ再読み込み後や、直前の commit がエラー扱いされたケースを含めて復旧する
      setStatus((prev) => (prev === 'idle' || prev === 'joined' ? 'committed' : prev));
    }
  });
  return () => sub.unsubscribe();
}, [state$]);

// 2. 呼び出し側: 次のアクションを送る前に、ledger の実際の状態が前提と食い違っていないか確認する
const reveal = useCallback(async () => {
  // すでに reveal 待ちの状態でなければ、直前の commit がまだ届いていない可能性がある
  if (status === 'error') {
    // 直前の commit は ledger 上では既に反映されている → エラー扱いを覆して先に進める
    const restored = prevStatusRef.current === 'joined' && ledgerState?.phase === 'committed'
      ? 'committed'
      : prevStatusRef.current;
    setStatus(restored);
    return;
  }
  // ... 通常の reveal 実行
}, [status, ledgerState]);
```

**教訓**: Web3 の UI では「操作の成否」を wallet の返り値だけで判定してはいけない。特にトランザクションの結果が Observable な公開状態として取得できる Midnight では、**楽観的ローカル状態は常にオンチェーンの真実で上書き可能にしておく**のが、ウォレット側の一時的な不具合に対する最も堅牢な防御になる。
