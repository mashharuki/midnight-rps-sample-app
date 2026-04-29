# Learnings Log

Captured learnings, corrections, and discoveries. Review before major tasks.

---

## [LRN-20260422-001] knowledge_gap

**Logged**: 2026-04-22T00:00:00Z
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
Lace Wallet v4 (4.0.0+) の DAppConnectorAPI は `isEnabled()` と `enable()` を持たず、`connect(networkId)` が直接生えている

### Details
旧スキル (`midnight-lace-dapp`) のコードは以下のフローを想定していた：
1. `connectorAPI.isEnabled()` → 起動確認
2. `connectorAPI.enable()` → 許可ダイアログ → `api` を取得
3. `api.connect(networkId)` → walletAPI を取得

しかし Lace v4.0.1 の実際のプロトタイプには `constructor` と `connect` しか存在しない。
`Object.getOwnPropertyNames(Object.getPrototypeOf(connectorAPI))` の結果:
```
['constructor', 'connect']
```
Own keys: `['apiVersion', 'name', 'icon', 'rdns']`

正しい v4 フロー：
1. `connectorAPI.connect(networkId)` → walletAPI を直接取得
2. `walletAPI.state()` → アドレス・キーを取得

### Suggested Action
- `midnight-lace-dapp` SKILL.md の Step 3 を修正 → **対応済み**
- 新規コードは `typeof connectorAPI.connect === 'function'` を先にチェックし、v4 パスと legacy パスに分岐させる

### Resolution
- **Resolved**: 2026-04-22
- **Notes**: `wallet.ts` と `midnight-lace-dapp/SKILL.md` の両方を修正。`enable()` を削除し、`connectorAPI.connect()` 直接呼び出しパターンに切り替え。

### Metadata
- Source: conversation
- Related Files: app/src/lib/wallet.ts, .claude/skills/midnight-lace-dapp/SKILL.md
- Tags: lace-wallet, dapp-connector-api, midnight, v4-api
- See Also: LRN-20260422-002

---

## [LRN-20260422-002] knowledge_gap

**Logged**: 2026-04-22T00:00:00Z
**Priority**: critical
**Status**: resolved
**Area**: frontend

### Summary
Lace v4 の `connect()` 戻り値は `state()` を持たない。アドレスは `getShieldedAddresses()`、URIs は `walletAPI.getConfiguration()` で取得する

### Details
`connectToWallet()` の `connect(networkId)` が返す walletAPI の実際のメソッド一覧（Lace v4.0.1）:
```
getUnshieldedBalances, getShieldedBalances, getDustBalance,
getShieldedAddresses, getUnshieldedAddress, getDustAddress,
getProvingProvider, getTxHistory, balanceUnsealedTransaction,
balanceSealedTransaction, makeTransfer, makeIntent, signData,
submitTransaction, getConfiguration, getConnectionStatus, hintUsage
```

`state()` は存在しない。正しい取得方法：
- **アドレス**: `walletAPI.getShieldedAddresses()` → `{shieldedAddress, shieldedCoinPublicKey, shieldedEncryptionPublicKey}` (**単一オブジェクト**、配列ではない。フィールド名も `shielded` プレフィックス付き)
- **URIs**: `walletAPI.getConfiguration()` （connector 側ではなく wallet 側に存在）

### Suggested Action
- `connectViaV4` 内の `walletAPI.state()` を `walletAPI.getShieldedAddresses()` に置き換え → **対応済み**
- `connector.getConfiguration()` を `walletAPI.getConfiguration()` に置き換え → **対応済み**

### Resolution
- **Resolved**: 2026-04-22
- **Notes**: `wallet.ts` の `connectViaV4` を修正。`midnight-lace-dapp/SKILL.md` のセクション3と React サンプルも更新。

### Metadata
- Source: conversation
- Related Files: app/src/lib/wallet.ts, .claude/skills/midnight-lace-dapp/SKILL.md
- Tags: lace-wallet, getShieldedAddresses, state, v4-api, midnight
- See Also: LRN-20260422-001

---
