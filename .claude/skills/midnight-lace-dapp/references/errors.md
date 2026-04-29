# エラー種別・診断・対処リファレンス

## MidnightWalletErrorType 完全版

```typescript
export enum MidnightWalletErrorType {
  // Lace がインストールされていない、またはページロード前に検出できない
  WALLET_NOT_FOUND        = 'WALLET_NOT_FOUND',
  // semver チェック失敗（apiVersion が >=1.0.0 を満たさない）
  INCOMPATIBLE_API_VERSION = 'INCOMPATIBLE_API_VERSION',
  // 10秒間 window.midnight が見つからない
  TIMEOUT_FINDING_API      = 'TIMEOUT_FINDING_API',
  // isEnabled/enable/connect の応答が15秒で来ない
  TIMEOUT_API_RESPONSE     = 'TIMEOUT_API_RESPONSE',
  // enable() / connect() が例外を投げた（ユーザー拒否を除く）
  ENABLE_API_FAILED        = 'ENABLE_API_FAILED',
  // ユーザーが接続ダイアログで拒否した
  UNAUTHORIZED             = 'UNAUTHORIZED',
  // ネットワーク設定の不一致（preprod/mainnet/undeployed/preview）
  NETWORK_MISMATCH         = 'NETWORK_MISMATCH',
  UNKNOWN_ERROR            = 'UNKNOWN_ERROR',
}

export const getErrorType = (error: Error): MidnightWalletErrorType => {
  const msg = error.message ?? '';
  if (msg.includes('Could not find Midnight Lace wallet'))
    return MidnightWalletErrorType.WALLET_NOT_FOUND;
  if (msg.includes('Incompatible') || msg.includes('apiVersion'))
    return MidnightWalletErrorType.INCOMPATIBLE_API_VERSION;
  if (msg.includes('timeout') && msg.includes('finding'))
    return MidnightWalletErrorType.TIMEOUT_FINDING_API;
  if (msg.includes('timeout'))
    return MidnightWalletErrorType.TIMEOUT_API_RESPONSE;
  if (msg.includes('rejected') || msg.includes('User rejected'))
    return MidnightWalletErrorType.UNAUTHORIZED;
  if (msg.includes('mismatch') || msg.includes('Unsupported network'))
    return MidnightWalletErrorType.NETWORK_MISMATCH;
  return MidnightWalletErrorType.UNKNOWN_ERROR;
};
```

## ユーザー向けエラーメッセージ

```typescript
const USER_MESSAGES: Record<MidnightWalletErrorType, string> = {
  WALLET_NOT_FOUND:
    'Midnight Lace Wallet が見つかりません。' +
    'Chrome/Firefox 拡張機能をインストールし、ページをリロードしてください。',
  INCOMPATIBLE_API_VERSION:
    'Lace Wallet のバージョンが古すぎます。' +
    '拡張機能を最新版にアップデートしてください。',
  TIMEOUT_FINDING_API:
    'Lace Wallet の検出がタイムアウトしました。' +
    'Wallet がロックされていませんか？ロック解除後に再試行してください。',
  TIMEOUT_API_RESPONSE:
    'Lace Wallet の応答がありません。' +
    'Wallet を開いてリクエストを確認してください。',
  ENABLE_API_FAILED:
    'Wallet への接続に失敗しました。Lace を再起動して再試行してください。',
  UNAUTHORIZED:
    '接続が拒否されました。「接続」を選択して再試行してください。',
  NETWORK_MISMATCH:
    'Lace のネットワーク設定がアプリと一致しません。' +
    'Lace Settings → Midnight network を確認してください。',
  UNKNOWN_ERROR:
    '予期しないエラーが発生しました。コンソールを確認してください。',
};
```

## コントラクト操作エラー

### Transaction 関連

| エラーパターン | 原因 | 対処 |
|---|---|---|
| `verifier key` を含む | コントラクトのコンパイルバージョン不一致 | `yarn compact` で再コンパイル、ZKキーを再配置 |
| `insufficient funds` | tDUST 残高不足 | テストネットフォーセットで補充 |
| `proof server` / `connection refused` | Proof Server 未起動 | `docker compose up proof-server` |
| `indexer` / `ECONNREFUSED` | Indexer 未起動またはURL不正 | Lace のネットワーク設定を確認 |
| `contract not found` | 指定アドレスにコントラクトが存在しない | アドレスを確認、または再デプロイ |
| `private state not found` | プライベート状態の初期化漏れ | `initialPrivateState` を正しく渡す |

### デバッグ手順

```typescript
// 1. Proof server の疎通確認
const checkProofServer = async (uri: string) => {
  const res = await fetch(`${uri.replace('/prove', '')}`);
  console.log('Proof server:', await res.text()); // "We're alive 🎉!"
};

// 2. Indexer の疎通確認（GraphQL introspection）
const checkIndexer = async (uri: string) => {
  const res = await fetch(uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ __typename }' }),
  });
  console.log('Indexer:', await res.json());
};

// 3. Wallet 状態の確認
const walletState = await walletAPI.state();
console.log('Wallet state:', {
  address: walletState.address.substring(0, 20) + '...',
  coinPublicKey: walletState.coinPublicKey.substring(0, 20) + '...',
});

// 4. プロバイダーの検証
const providers = buildProviders(walletState);
console.log('Providers:', Object.keys(providers));
```

## ZK証明ダウンロードエラー

```
GET /dist/managed/my-contract/proving_key.cbor 404
```

原因：ZK キーファイルが `public/dist/` に配置されていない。

```bash
# Compact コンパイル後のキーファイルをコピー
cp -r packages/contracts/my-contract/src/managed/ apps/web/public/dist/
```

## ネットワーク設定デバッグ

```typescript
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';

// 現在の設定を確認
console.log('Current networkId:', getNetworkId());

// Lace の設定と比較
const config = await v4Api.getConfiguration();
console.log('Lace URIs:', config);
```

## React DevTools でのデバッグ

```typescript
// コンテキストの状態を確認するユーティリティ
export const WalletDebugPanel: React.FC = () => {
  const wallet = useWallet();
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <pre style={{ fontSize: 10, position: 'fixed', bottom: 0, right: 0, background: '#0001' }}>
      {JSON.stringify({
        isConnected: wallet.isConnected,
        error: wallet.error,
        address: wallet.address?.substring(0, 20),
        hasProviders: !!wallet.publicDataProvider,
      }, null, 2)}
    </pre>
  );
};
```
