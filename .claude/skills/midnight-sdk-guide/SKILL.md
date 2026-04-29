---
name: midnight-sdk-guide
description: >
  TypeScript SDK integration guide for Midnight dApps — headless CLI and Node.js applications.
  Use this skill when building CLIs, backends, or scripts that deploy/call contracts using
  wallet-sdk-* packages (WalletFacade, DustWallet, HDWallet).
  Triggers on: "SDK", "TypeScript", "wallet integration", "deploy contract", "call contract",
  "WalletFacade", "DustWallet", "tNight", "DUST", "headless wallet", "configureProviders",
  "midnight-js", "deployContract", "findDeployedContract", "CompiledContract".
  Always use this skill when the user is writing a TypeScript Midnight app that is NOT a browser dApp.
license: MIT
metadata:
  author: mashharuki
  version: "3.0.0"
  midnight-js-version: "4.0.4"
  wallet-sdk-facade-version: "3.0.0"
  compact-runtime-version: "0.15.0"
  reference: "midnightntwrk/example-counter"
---

# Midnight TypeScript SDK Guide (v4.x / wallet-sdk v3.x)

> **Source of truth**: `midnightntwrk/example-counter` — all patterns below are verified against this repo.

This guide covers **headless (Node.js/CLI) Midnight applications** using `wallet-sdk-facade`.
For browser + Lace Wallet integration, see the `midnight-lace-dapp` skill instead.

---

## 1. Package Dependencies

```bash
npm install \
  @midnight-ntwrk/midnight-js@^4.0.4 \
  @midnight-ntwrk/midnight-js-http-client-proof-provider@^4.0.4 \
  @midnight-ntwrk/midnight-js-indexer-public-data-provider@^4.0.4 \
  @midnight-ntwrk/midnight-js-level-private-state-provider@^4.0.4 \
  @midnight-ntwrk/midnight-js-node-zk-config-provider@^4.0.4 \
  @midnight-ntwrk/compact-runtime@0.15.0 \
  @midnight-ntwrk/compact-js \
  @midnight-ntwrk/ledger-v8@^8.0.0 \
  @midnight-ntwrk/wallet-sdk-facade@^3.0.0 \
  @midnight-ntwrk/wallet-sdk-dust-wallet@^3.0.0 \
  @midnight-ntwrk/wallet-sdk-hd@^3.0.0 \
  @midnight-ntwrk/wallet-sdk-shielded@^2.0.0 \
  @midnight-ntwrk/wallet-sdk-unshielded-wallet@^2.0.0 \
  @midnight-ntwrk/wallet-sdk-address-format@^3.0.0 \
  rxjs ws pino
```

---

## 2. Network Configuration

```typescript
import { setNetworkId } from '@midnight-ntwrk/midnight-js/network-id';

// Call once at startup before any SDK operations
setNetworkId('preprod');    // Preprod testnet (recommended)
setNetworkId('preview');    // Preview testnet
setNetworkId('undeployed'); // Standalone local (Docker)
```

| Network | NetworkId | Indexer HTTP | Indexer WS |
|---------|-----------|--------------|------------|
| Preprod | `'preprod'` | `https://indexer.preprod.midnight.network/api/v3/graphql` | `wss://indexer.preprod.midnight.network/api/v3/graphql/ws` |
| Preview | `'preview'` | `https://indexer.preview.midnight.network/api/v3/graphql` | `wss://indexer.preview.midnight.network/api/v3/graphql/ws` |
| Standalone | `'undeployed'` | `http://127.0.0.1:8088/api/v3/graphql` | `ws://127.0.0.1:8088/api/v3/graphql/ws` |

Node RPC:
- Preprod: `https://rpc.preprod.midnight.network`
- Preview: `https://rpc.preview.midnight.network`
- Standalone: `http://127.0.0.1:9944`

---

## 3. Contract Types Setup

```typescript
import { Counter, type CounterPrivateState } from '@midnight-ntwrk/counter-contract';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js/types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js/contracts';
import type { ProvableCircuitId } from '@midnight-ntwrk/compact-js';

// Types derived from the compiled contract
export type MyCircuits = ProvableCircuitId<Counter.Contract<CounterPrivateState>>;
export const MyPrivateStateId = 'myPrivateState';
export type MyProviders = MidnightProviders<MyCircuits, typeof MyPrivateStateId, CounterPrivateState>;
export type DeployedMyContract = DeployedContract<Counter.Contract<CounterPrivateState>>
  | FoundContract<Counter.Contract<CounterPrivateState>>;
```

---

## 4. CompiledContract — Pre-compile ZK Assets

```typescript
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { Counter, witnesses } from '@midnight-ntwrk/counter-contract';
import path from 'node:path';

const zkConfigPath = path.resolve(currentDir, '..', 'contract', 'src', 'managed', 'counter');

// Build the compiled contract once (run at module load time, not per-deploy)
const compiledContract = CompiledContract.make('counter', Counter.Contract).pipe(
  CompiledContract.withVacantWitnesses,
  CompiledContract.withCompiledFileAssets(zkConfigPath),
);
```

---

## 5. Wallet Setup (WalletFacade)

The Midnight headless wallet uses three sub-wallets derived from a single HD seed.

### Key derivation from seed

```typescript
import { HDWallet, Roles, generateRandomSeed } from '@midnight-ntwrk/wallet-sdk-hd';
import * as ledger from '@midnight-ntwrk/ledger-v8';
import { Buffer } from 'buffer';

const deriveKeysFromSeed = (seed: string) => {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, 'hex'));
  if (hdWallet.type !== 'seedOk') throw new Error('Bad seed');
  const result = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);
  if (result.type !== 'keysDerived') throw new Error('Key derivation failed');
  hdWallet.hdWallet.clear();
  return result.keys;
};

// Generate a new random seed
const seed = toHex(Buffer.from(generateRandomSeed()));
```

### WalletFacade initialization

```typescript
import { WalletFacade } from '@midnight-ntwrk/wallet-sdk-facade';
import { DustWallet } from '@midnight-ntwrk/wallet-sdk-dust-wallet';
import { ShieldedWallet } from '@midnight-ntwrk/wallet-sdk-shielded';
import { createKeystore, InMemoryTransactionHistoryStorage, PublicKey, UnshieldedWallet } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { getNetworkId } from '@midnight-ntwrk/midnight-js/network-id';

const keys = deriveKeysFromSeed(seed);
const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(keys[Roles.Zswap]);
const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
const unshieldedKeystore = createKeystore(keys[Roles.NightExternal], getNetworkId());

const walletConfig = {
  // Shielded (ZSwap)
  networkId: getNetworkId(),
  indexerClientConnection: { indexerHttpUrl: config.indexer, indexerWsUrl: config.indexerWS },
  provingServerUrl: new URL(config.proofServer),
  relayURL: new URL(config.node.replace(/^http/, 'ws')),
  // Unshielded
  txHistoryStorage: new InMemoryTransactionHistoryStorage(),
  // Dust
  costParameters: {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  },
};

const wallet = await WalletFacade.init({
  configuration: walletConfig,
  shielded: (cfg) => ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
  unshielded: (cfg) => UnshieldedWallet(cfg).startWithPublicKey(PublicKey.fromKeyStore(unshieldedKeystore)),
  dust: (cfg) => DustWallet(cfg).startWithSecretKey(dustSecretKey, ledger.LedgerParameters.initialParameters().dust),
});
await wallet.start(shieldedSecretKeys, dustSecretKey);
```

### Wait for wallet sync

```typescript
import * as Rx from 'rxjs';

const syncedState = await Rx.firstValueFrom(
  wallet.state().pipe(
    Rx.throttleTime(5_000),
    Rx.filter((s) => s.isSynced),
  ),
);
```

---

## 6. Configure Providers

```typescript
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';

export const configureProviders = async (ctx: WalletContext, config: Config) => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(ctx);
  const zkConfigProvider = new NodeZkConfigProvider<MyCircuits>(zkConfigPath);
  const accountId = walletAndMidnightProvider.getCoinPublicKey();
  const storagePassword = `${Buffer.from(accountId, 'hex').toString('base64')}!`;

  return {
    privateStateProvider: levelPrivateStateProvider<typeof MyPrivateStateId>({
      privateStateStoreName: 'my-private-state',
      accountId,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(config.indexer, config.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(config.proofServer, zkConfigProvider),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};
```

---

## 7. WalletProvider + MidnightProvider Bridge

```typescript
import type { FinalizedTxData, MidnightProvider, WalletProvider } from '@midnight-ntwrk/midnight-js/types';

export const createWalletAndMidnightProvider = async (
  ctx: WalletContext,
): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced)));
  return {
    getCoinPublicKey() {
      return state.shielded.coinPublicKey.toHexString();
    },
    getEncryptionPublicKey() {
      return state.shielded.encryptionPublicKey.toHexString();
    },
    async balanceTx(tx, ttl?) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      // Sign unshielded intents manually (wallet SDK bug workaround)
      const signFn = (payload: Uint8Array) => ctx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, 'proof');
      if (recipe.balancingTransaction) {
        signTransactionIntents(recipe.balancingTransaction, signFn, 'pre-proof');
      }
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx) {
      return ctx.wallet.submitTransaction(tx) as any;
    },
  };
};
```

> **Note**: The `signTransactionIntents` helper is needed to work around a known wallet SDK bug where `signRecipe` hardcodes the wrong proof marker (`'pre-proof'` instead of `'proof'`). See `api.ts` in `example-counter` for the full implementation.

---

## 8. Deploy a Contract

```typescript
import { deployContract } from '@midnight-ntwrk/midnight-js/contracts';

const deployedContract = await deployContract(providers, {
  compiledContract,         // from CompiledContract.make().pipe(...)
  privateStateId: 'myPrivateState',
  initialPrivateState: { privateCounter: 0 },
});

const contractAddress = deployedContract.deployTxData.public.contractAddress;
console.log(`Deployed at: ${contractAddress}`);
```

---

## 9. Join an Existing Contract

```typescript
import { findDeployedContract } from '@midnight-ntwrk/midnight-js/contracts';

const deployedContract = await findDeployedContract(providers, {
  contractAddress,           // string or ContractAddress
  compiledContract,
  privateStateId: 'myPrivateState',
  initialPrivateState: { privateCounter: 0 },
});
```

---

## 10. Call a Circuit (Write Transaction)

```typescript
// Calls increment() → proves → balances → submits → returns FinalizedTxData
const finalizedTxData = await deployedContract.callTx.increment();
console.log(`TX ${finalizedTxData.public.txId} in block ${finalizedTxData.public.blockHeight}`);
```

---

## 11. Query Public Ledger State

```typescript
import { assertIsContractAddress } from '@midnight-ntwrk/midnight-js/utils';

assertIsContractAddress(contractAddress);
const contractState = await providers.publicDataProvider.queryContractState(contractAddress);
if (contractState != null) {
  const ledgerState = Counter.ledger(contractState.data);
  console.log(`Counter: ${ledgerState.round}`);
}
```

---

## 12. DUST (Fee Token) Flow

DUST is the non-transferable fee resource on Midnight. You must:
1. Receive **tNight** tokens (from faucet) into the unshielded wallet
2. **Register** the NIGHT UTXOs for dust generation (one-time on-chain tx)
3. **Wait** for DUST to generate (takes a few minutes)
4. Only then can you deploy/call contracts

```typescript
import { unshieldedToken } from '@midnight-ntwrk/ledger-v8';

// Check DUST balance
const state = await Rx.firstValueFrom(wallet.state().pipe(Rx.filter((s) => s.isSynced)));
const dustBalance = state.dust.balance(new Date());
const nightBalance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;

// Register NIGHT UTXOs for dust generation
const nightUtxos = state.unshielded.availableCoins;
const recipe = await wallet.registerNightUtxosForDustGeneration(
  nightUtxos,
  unshieldedKeystore.getPublicKey(),
  (payload) => unshieldedKeystore.signData(payload),
);
const finalized = await wallet.finalizeRecipe(recipe);
await wallet.submitTransaction(finalized);
```

---

## 13. Node.js WebSocket Setup

```typescript
import { WebSocket } from 'ws';

// Required for GraphQL subscriptions (wallet sync) to work in Node.js
// @ts-expect-error: enables WebSocket through Apollo
globalThis.WebSocket = WebSocket;
```

---

## 14. Common Types Reference

```typescript
import type { ContractAddress } from '@midnight-ntwrk/compact-runtime';
import type { FinalizedTxData } from '@midnight-ntwrk/midnight-js/types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js/contracts';
import type { ProvableCircuitId } from '@midnight-ntwrk/compact-js';
```

---

## 15. Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to clone intent` | wallet SDK signing bug | Use `signTransactionIntents` workaround (see api.ts) |
| `connect ECONNREFUSED 127.0.0.1:6300` | Proof server not running | `docker compose -f proof-server.yml up` |
| `Cannot find module` test errors | Contract not built | `cd contract && npm run compact && npm run build` |
| DUST balance 0 after failed deploy | Locked pending coins | Restart the app to release locked DUST |
| `isSynced` never true | WebSocket not polyfilled | Add `globalThis.WebSocket = WebSocket` (ws package) |

---

## References

- [Midnight Docs](https://docs.midnight.network/)
- [example-counter source](https://github.com/midnightntwrk/example-counter)
- [Compact Language Guide](https://docs.midnight.network/compact)
- Preprod Faucet: `https://faucet.preprod.midnight.network/`
