// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
// Licensed under the Apache License, Version 2.0 (the "License");
// You may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import fs from "node:fs";
import path from "node:path";
import { CompiledContract } from "@midnight-ntwrk/compact-js";
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import type { ContractAddress } from "@midnight-ntwrk/compact-runtime";
import * as ledger from "@midnight-ntwrk/ledger-v8";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v8";
import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { getNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { NodeZkConfigProvider } from "@midnight-ntwrk/midnight-js-node-zk-config-provider";
import type {
  FinalizedTxData,
  MidnightProvider,
  WalletProvider,
} from "@midnight-ntwrk/midnight-js-types";
import {
  assertIsContractAddress,
  toHex,
} from "@midnight-ntwrk/midnight-js-utils";
import {
  MidnightBech32m,
  ShieldedAddress,
  ShieldedCoinPublicKey,
  ShieldedEncryptionPublicKey,
} from "@midnight-ntwrk/wallet-sdk-address-format";
import { DustWallet } from "@midnight-ntwrk/wallet-sdk-dust-wallet";
import { WalletFacade } from "@midnight-ntwrk/wallet-sdk-facade";
import {
  generateRandomSeed,
  HDWallet,
  Roles,
} from "@midnight-ntwrk/wallet-sdk-hd";
import { ShieldedWallet } from "@midnight-ntwrk/wallet-sdk-shielded";
import {
  createKeystore,
  InMemoryTransactionHistoryStorage,
  PublicKey,
  type UnshieldedKeystore,
  UnshieldedWallet,
} from "@midnight-ntwrk/wallet-sdk-unshielded-wallet";
import { Buffer } from "buffer";
import {
  INITIAL_RPS_PRIVATE_STATE,
  Rps,
  type RpsPrivateState,
  rpsWitnesses,
} from "contract";
import type { Logger } from "pino";
import * as Rx from "rxjs";
import {
  type DeployedRpsContract,
  faucetUrlFor,
  type RpsCircuits,
  type RpsLedgerState,
  RpsPrivateStateId,
  type RpsProviders,
} from "shared";
import { WebSocket } from "ws";
import { type Config, currentDir } from "./config";
import { DIVIDER } from "./constants";

let logger: Logger;

// Required for GraphQL subscriptions (wallet sync) to work in Node.js
// @ts-expect-error: It's needed to enable WebSocket usage through apollo
globalThis.WebSocket = WebSocket;

export interface WalletContext {
  wallet: WalletFacade;
  shieldedSecretKeys: ledger.ZswapSecretKeys;
  dustSecretKey: ledger.DustSecretKey;
  unshieldedKeystore: UnshieldedKeystore;
}

/**
 * Sign all unshielded offers in a transaction's intents, using the correct
 * proof marker for Intent.deserialize. This works around a bug in the wallet
 * SDK where signRecipe hardcodes 'pre-proof', which fails for proven
 * (UnboundTransaction) intents that contain 'proof' data.
 */
const signTransactionIntents = (
  tx: { intents?: Map<number, any> },
  signFn: (payload: Uint8Array) => ledger.Signature,
  proofMarker: "proof" | "pre-proof",
): void => {
  if (!tx.intents || tx.intents.size === 0) return;

  for (const segment of tx.intents.keys()) {
    const intent = tx.intents.get(segment);
    if (!intent) continue;

    // Clone the intent with the correct proof marker.
    // The wallet SDK bug hardcodes 'pre-proof' here, which fails for
    // proven (UnboundTransaction) intents that use 'proof'.
    const cloned = ledger.Intent.deserialize<
      ledger.SignatureEnabled,
      ledger.Proofish,
      ledger.PreBinding
    >("signature", proofMarker, "pre-binding", intent.serialize());

    const sigData = cloned.signatureData(segment);
    const signature = signFn(sigData);

    if (cloned.fallibleUnshieldedOffer) {
      const sigs = cloned.fallibleUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) =>
          cloned.fallibleUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.fallibleUnshieldedOffer =
        cloned.fallibleUnshieldedOffer.addSignatures(sigs);
    }

    if (cloned.guaranteedUnshieldedOffer) {
      const sigs = cloned.guaranteedUnshieldedOffer.inputs.map(
        (_: ledger.UtxoSpend, i: number) =>
          cloned.guaranteedUnshieldedOffer!.signatures.at(i) ?? signature,
      );
      cloned.guaranteedUnshieldedOffer =
        cloned.guaranteedUnshieldedOffer.addSignatures(sigs);
    }

    tx.intents.set(segment, cloned);
  }
};

/**
 * Create the unified WalletProvider & MidnightProvider for midnight-js.
 * This bridges the wallet-sdk-facade to the midnight-js contract API by
 * implementing balance, sign, finalize, and submit operations.
 */
export const createWalletAndMidnightProvider = async (
  ctx: WalletContext,
): Promise<WalletProvider & MidnightProvider> => {
  const state = await Rx.firstValueFrom(
    ctx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );
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
        {
          shieldedSecretKeys: ctx.shieldedSecretKeys,
          dustSecretKey: ctx.dustSecretKey,
        },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );

      // Work around wallet SDK bug: signRecipe uses hardcoded 'pre-proof'
      // marker when cloning intents, but proven (UnboundTransaction) intents
      // have 'proof' data, causing "Failed to clone intent". We sign manually
      // with the correct proof markers.
      const signFn = (payload: Uint8Array) =>
        ctx.unshieldedKeystore.signData(payload);
      signTransactionIntents(recipe.baseTransaction, signFn, "proof");
      if (recipe.balancingTransaction) {
        signTransactionIntents(
          recipe.balancingTransaction,
          signFn,
          "pre-proof",
        );
      }

      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx(tx) {
      return ctx.wallet.submitTransaction(tx) as any;
    },
  };
};

/** Wait until the wallet has fully synced with the network. Returns the synced state. */
export const waitForSync = (wallet: WalletFacade) =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(5_000),
      Rx.filter((state) => state.isSynced),
    ),
  );

/** Wait until the wallet has a non-zero unshielded balance. Returns the balance. */
export const waitForFunds = (wallet: WalletFacade): Promise<bigint> =>
  Rx.firstValueFrom(
    wallet.state().pipe(
      Rx.throttleTime(10_000),
      Rx.filter((state) => state.isSynced),
      Rx.map((s) => s.unshielded.balances[unshieldedToken().raw] ?? 0n),
      Rx.filter((balance) => balance > 0n),
    ),
  );

const buildShieldedConfig = ({
  indexer,
  indexerWS,
  node,
  proofServer,
}: Config) => ({
  networkId: getNetworkId(),
  indexerClientConnection: {
    indexerHttpUrl: indexer,
    indexerWsUrl: indexerWS,
    keepAlive: 0,
  },
  // Default batchSize is 10, giving 1.2M/10 × 4ms = ~80min scheduling overhead on preprod.
  // 1000 reduces this to ~5 seconds.
  batchSize: 1000,
  provingServerUrl: new URL(proofServer),
  relayURL: new URL(node.replace(/^http/, "ws")),
});

const buildUnshieldedConfig = ({ indexer, indexerWS }: Config) => ({
  networkId: getNetworkId(),
  indexerClientConnection: {
    indexerHttpUrl: indexer,
    indexerWsUrl: indexerWS,
    keepAlive: 0,
  },
  txHistoryStorage: new InMemoryTransactionHistoryStorage(),
});

const buildDustConfig = ({
  indexer,
  indexerWS,
  node,
  proofServer,
}: Config) => ({
  networkId: getNetworkId(),
  costParameters: {
    additionalFeeOverhead: 300_000_000_000_000n,
    feeBlocksMargin: 5,
  },
  indexerClientConnection: {
    indexerHttpUrl: indexer,
    indexerWsUrl: indexerWS,
    keepAlive: 0,
  },
  provingServerUrl: new URL(proofServer),
  relayURL: new URL(node.replace(/^http/, "ws")),
});

// ─── Wallet State Cache ───────────────────────────────────────────────────────

const walletCacheDir = (networkId: string, seed: string) =>
  path.resolve(currentDir, "..", "wallet-cache", networkId, seed.slice(0, 16));

const loadCachedState = (dir: string, name: string): string | null => {
  const p = path.join(dir, `${name}.json`);
  try {
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
  } catch {
    return null;
  }
};

const saveCachedState = (dir: string, name: string, data: string): void => {
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${name}.json`), data, "utf8");
  } catch {
    // キャッシュ保存失敗は致命的ではないので無視
  }
};

const persistWalletState = async (
  wallet: WalletFacade,
  cacheDir: string,
): Promise<void> => {
  try {
    const [shielded, unshielded, dust] = await Promise.all([
      wallet.shielded.serializeState(),
      wallet.unshielded.serializeState(),
      wallet.dust.serializeState(),
    ]);
    saveCachedState(cacheDir, "shielded", shielded);
    saveCachedState(cacheDir, "unshielded", unshielded);
    saveCachedState(cacheDir, "dust", dust);
  } catch {
    // キャッシュ保存失敗は致命的ではないので無視
  }
};

// ─── Key Derivation ───────────────────────────────────────────────────────────

/**
 * Derive HD wallet keys for all three roles (Zswap, NightExternal, Dust)
 * from a hex-encoded seed using BIP-44 style derivation at account 0, index 0.
 */
const deriveKeysFromSeed = (seed: string) => {
  const hdWallet = HDWallet.fromSeed(Buffer.from(seed, "hex"));
  if (hdWallet.type !== "seedOk") {
    throw new Error("Failed to initialize HDWallet from seed");
  }

  const derivationResult = hdWallet.hdWallet
    .selectAccount(0)
    .selectRoles([Roles.Zswap, Roles.NightExternal, Roles.Dust])
    .deriveKeysAt(0);

  if (derivationResult.type !== "keysDerived") {
    throw new Error("Failed to derive keys");
  }

  hdWallet.hdWallet.clear();
  return derivationResult.keys;
};

/**
 * Formats a token balance for display (e.g. 1000000000 -> "1,000,000,000").
 */
const formatBalance = (balance: bigint): string => balance.toLocaleString();

/**
 * Runs an async operation with an animated spinner on the console.
 * Shows ⠋⠙⠹... while running, then ✓ on success or ✗ on failure.
 */
export const withStatus = async <T>(
  message: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const interval = setInterval(() => {
    process.stdout.write(`\r  ${frames[i++ % frames.length]} ${message}`);
  }, 80);
  try {
    const result = await fn();
    clearInterval(interval);
    process.stdout.write(`\r  ✓ ${message}\n`);
    return result;
  } catch (e) {
    clearInterval(interval);
    process.stdout.write(`\r  ✗ ${message}\n`);
    throw e;
  }
};

/**
 * Register unshielded NIGHT UTXOs for dust generation.
 *
 * On Preprod/Preview, NIGHT tokens generate DUST over time, but only after
 * the UTXOs have been explicitly designated for dust generation via an on-chain
 * transaction. DUST is the non-transferable fee token used by the Midnight network.
 */
const registerForDustGeneration = async (
  wallet: WalletFacade,
  unshieldedKeystore: UnshieldedKeystore,
): Promise<void> => {
  const state = await Rx.firstValueFrom(
    wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );

  // Check if dust is already available (e.g. from a previous designation)
  if (state.dust.availableCoins.length > 0) {
    const dustBal = state.dust.balance(new Date());
    console.log(
      `  ✓ Dust tokens already available (${formatBalance(dustBal)} DUST)`,
    );
    return;
  }

  // Only register coins that haven't been designated yet
  const nightUtxos = state.unshielded.availableCoins.filter(
    (coin: any) => coin.meta?.registeredForDustGeneration !== true,
  );
  if (nightUtxos.length === 0) {
    // All coins already registered — just wait for dust to generate
    await withStatus("Waiting for dust tokens to generate", () =>
      Rx.firstValueFrom(
        wallet.state().pipe(
          Rx.throttleTime(5_000),
          Rx.filter((s) => s.isSynced),
          Rx.filter((s) => s.dust.balance(new Date()) > 0n),
        ),
      ),
    );
    return;
  }

  await withStatus(
    `Registering ${nightUtxos.length} NIGHT UTXO(s) for dust generation`,
    async () => {
      const recipe = await wallet.registerNightUtxosForDustGeneration(
        nightUtxos,
        unshieldedKeystore.getPublicKey(),
        (payload) => unshieldedKeystore.signData(payload),
      );
      const finalized = await wallet.finalizeRecipe(recipe);
      await wallet.submitTransaction(finalized);
    },
  );

  // Wait for dust to actually generate (balance > 0), not just for coins to appear
  await withStatus("Waiting for dust tokens to generate", () =>
    Rx.firstValueFrom(
      wallet.state().pipe(
        Rx.throttleTime(5_000),
        Rx.filter((s) => s.isSynced),
        Rx.filter((s) => s.dust.balance(new Date()) > 0n),
      ),
    ),
  );
};

/**
 * Prints a formatted wallet summary to the console, showing all three
 * wallet types (Shielded, Unshielded, Dust) with their addresses and balances.
 */
const printWalletSummary = (
  state: any,
  unshieldedKeystore: UnshieldedKeystore,
) => {
  const networkId = getNetworkId();
  const unshieldedBalance =
    state.unshielded.balances[unshieldedToken().raw] ?? 0n;

  // Build the bech32m shielded address from coin + encryption public keys
  const coinPubKey = ShieldedCoinPublicKey.fromHexString(
    state.shielded.coinPublicKey.toHexString(),
  );
  const encPubKey = ShieldedEncryptionPublicKey.fromHexString(
    state.shielded.encryptionPublicKey.toHexString(),
  );
  const shieldedAddress = MidnightBech32m.encode(
    networkId,
    new ShieldedAddress(coinPubKey, encPubKey),
  ).toString();

  const DIV = DIVIDER;

  console.log(`
${DIV}
  Wallet Overview                            Network: ${networkId}
${DIV}

  Shielded (ZSwap)
  └─ Address: ${shieldedAddress}

  Unshielded
  ├─ Address: ${unshieldedKeystore.getBech32Address()}
  └─ Balance: ${formatBalance(unshieldedBalance)} tNight

  Dust
  └─ Address: ${MidnightBech32m.encode(networkId, state.dust.address).toString()}

${DIV}`);
};

/**
 * Build (or restore) a wallet from a hex seed, then wait for the wallet
 * to sync and receive funds before returning.
 *
 * Steps:
 *   1. Derive HD keys (Zswap, NightExternal, Dust) from the seed
 *   2. Create the three sub-wallets (Shielded, Unshielded, Dust)
 *   3. Start the WalletFacade and wait for sync
 *   4. Display a wallet summary with all addresses
 *   5. If balance is zero, wait for incoming funds (e.g. from faucet)
 */
export const buildWalletAndWaitForFunds = async (
  config: Config,
  seed: string,
): Promise<WalletContext> => {
  console.log("");

  const networkId = getNetworkId();
  const cacheDir = walletCacheDir(networkId, seed);

  // Derive HD keys and initialize the three sub-wallets
  const { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore } =
    await withStatus("Building wallet", async () => {
      const keys = deriveKeysFromSeed(seed);
      const shieldedSecretKeys = ledger.ZswapSecretKeys.fromSeed(
        keys[Roles.Zswap],
      );
      const dustSecretKey = ledger.DustSecretKey.fromSeed(keys[Roles.Dust]);
      const unshieldedKeystore = createKeystore(
        keys[Roles.NightExternal],
        networkId,
      );

      const walletConfig = {
        ...buildShieldedConfig(config),
        ...buildUnshieldedConfig(config),
        ...buildDustConfig(config),
      };

      // Load cached states so wallets resume from last checkpoint instead of genesis
      const shieldedCache = loadCachedState(cacheDir, "shielded");
      const unshieldedCache = loadCachedState(cacheDir, "unshielded");
      const dustCache = loadCachedState(cacheDir, "dust");
      const fromCache = shieldedCache && unshieldedCache && dustCache;

      const wallet = await WalletFacade.init({
        configuration: walletConfig,
        shielded: (cfg) =>
          fromCache
            ? ShieldedWallet(cfg).restore(shieldedCache)
            : ShieldedWallet(cfg).startWithSecretKeys(shieldedSecretKeys),
        unshielded: (cfg) =>
          fromCache
            ? UnshieldedWallet(cfg).restore(unshieldedCache)
            : UnshieldedWallet(cfg).startWithPublicKey(
                PublicKey.fromKeyStore(unshieldedKeystore),
              ),
        dust: (cfg) =>
          fromCache
            ? DustWallet(cfg).restore(dustCache)
            : DustWallet(cfg).startWithSecretKey(
                dustSecretKey,
                ledger.LedgerParameters.initialParameters().dust,
              ),
      });
      await wallet.start(shieldedSecretKeys, dustSecretKey);

      return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
    });

  // Show unshielded address immediately so user can fund via faucet while syncing
  const DIV = DIVIDER;
  const faucet = faucetUrlFor(networkId);
  console.log(`
${DIV}
  Wallet Overview                            Network: ${networkId}
${DIV}
  Unshielded Address (send tNight here):
  ${unshieldedKeystore.getBech32Address()}
${
  faucet
    ? `
  Fund your wallet with tNight from the faucet:
  ${faucet}
`
    : ""
}${DIV}
`);

  // Wait for the wallet to sync with the network
  const syncedState = await withStatus("Syncing with network", () =>
    waitForSync(wallet),
  );

  // Persist wallet state so the next run resumes from this checkpoint
  await persistWalletState(wallet, cacheDir);

  // Display the full wallet summary with all addresses and balances
  printWalletSummary(syncedState, unshieldedKeystore);

  // Check if wallet has funds; if not, wait for incoming tokens
  const balance = syncedState.unshielded.balances[unshieldedToken().raw] ?? 0n;
  if (balance === 0n) {
    const fundedBalance = await withStatus("Waiting for incoming tokens", () =>
      waitForFunds(wallet),
    );
    console.log(`    Balance: ${formatBalance(fundedBalance)} tNight\n`);
  }

  // Register NIGHT UTXOs for dust generation (required for tx fees on Preprod/Preview)
  await registerForDustGeneration(wallet, unshieldedKeystore);

  return { wallet, shieldedSecretKeys, dustSecretKey, unshieldedKeystore };
};

/**
 * Create a fresh wallet with a randomly generated seed. The seed is displayed
 * once so the user can save it — it will not be shown again.
 */
export const buildFreshWallet = async (
  config: Config,
): Promise<WalletContext> => {
  const seed = toHex(Buffer.from(generateRandomSeed()));
  const DIV = DIVIDER;
  console.log(`
${DIV}
  New Wallet Seed — save this before continuing
${DIV}
  ${seed}
${DIV}
`);
  return await buildWalletAndWaitForFunds(config, seed);
};

/**
 * Get the current DUST balance from the wallet state.
 */
export const getDustBalance = async (
  wallet: WalletFacade,
): Promise<{
  available: bigint;
  pending: bigint;
  availableCoins: number;
  pendingCoins: number;
}> => {
  const state = await Rx.firstValueFrom(
    wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );
  const available = state.dust.balance(new Date());
  const availableCoins = state.dust.availableCoins.length;
  const pendingCoins = state.dust.pendingCoins.length;
  // Sum pending coin initial values for a rough pending balance
  const pending = state.dust.pendingCoins.reduce(
    (sum, c) => sum + c.initialValue,
    0n,
  );
  return { available, pending, availableCoins, pendingCoins };
};

/**
 * Monitor DUST balance with a live-updating display.
 * Prints a status line every 5 seconds showing balance, coins, and status.
 * Resolves when the user presses Enter (via the provided signal).
 */
export const monitorDustBalance = async (
  wallet: WalletFacade,
  stopSignal: Promise<void>,
): Promise<void> => {
  let stopped = false;
  void stopSignal.then(() => {
    stopped = true;
  });

  const sub = wallet
    .state()
    .pipe(
      Rx.throttleTime(5_000),
      Rx.filter((s) => s.isSynced),
    )
    .subscribe((state) => {
      if (stopped) return;

      const now = new Date();
      const available = state.dust.balance(now);
      const availableCoins = state.dust.availableCoins.length;
      const pendingCoins = state.dust.pendingCoins.length;

      const registeredNight = state.unshielded.availableCoins.filter(
        (coin: any) => coin.meta?.registeredForDustGeneration === true,
      ).length;
      const totalNight = state.unshielded.availableCoins.length;

      let status = "";
      if (pendingCoins > 0 && availableCoins === 0) {
        status = "⚠ locked by pending tx";
      } else if (available > 0n) {
        status = "✓ ready to deploy";
      } else if (availableCoins > 0) {
        status = "accruing...";
      } else if (registeredNight > 0) {
        status = "waiting for generation...";
      } else {
        status = "no NIGHT registered";
      }

      const time = now.toLocaleTimeString();
      console.log(
        `  [${time}] DUST: ${formatBalance(available)} (${availableCoins} coins, ${pendingCoins} pending) | NIGHT: ${totalNight} UTXOs, ${registeredNight} registered | ${status}`,
      );
    });

  await stopSignal;
  sub.unsubscribe();
};

export function setLogger(_logger: Logger) {
  logger = _logger;
}

// ─── RPS ─────────────────────────────────────────────────────────────────────

const rpsContractConfig = {
  privateStateStoreName: "rps-private-state",
  zkConfigPath: path.resolve(
    currentDir,
    "..",
    "..",
    "contract",
    "src",
    "managed",
    "rps",
  ),
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CC = CompiledContract as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpsCompiledContract = CC.make("rps", Rps.Contract).pipe(
  CC.withWitnesses(rpsWitnesses),
  CC.withCompiledFileAssets(rpsContractConfig.zkConfigPath),
);

/**
 * Configure midnight-js providers for RPS contract interaction.
 * Accepts an optional `accountId` to support multi-player scenarios where
 * each player needs a separate LevelDB namespace for private state isolation.
 */
export const configureRpsProviders = async (
  ctx: WalletContext,
  config: Config,
  accountId?: string,
): Promise<RpsProviders> => {
  const walletAndMidnightProvider = await createWalletAndMidnightProvider(ctx);
  const effectiveAccountId =
    accountId ?? walletAndMidnightProvider.getCoinPublicKey();
  const storagePassword = `${Buffer.from(effectiveAccountId, "hex").toString("base64")}!`;
  const zkConfigProvider = new NodeZkConfigProvider<RpsCircuits>(
    rpsContractConfig.zkConfigPath,
  );
  return {
    privateStateProvider: levelPrivateStateProvider<typeof RpsPrivateStateId>({
      privateStateStoreName: rpsContractConfig.privateStateStoreName,
      accountId: effectiveAccountId,
      privateStoragePasswordProvider: () => storagePassword,
    }),
    publicDataProvider: indexerPublicDataProvider(
      config.indexer,
      config.indexerWS,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(
      config.proofServer,
      zkConfigProvider,
    ),
    walletProvider: walletAndMidnightProvider,
    midnightProvider: walletAndMidnightProvider,
  };
};

export const deployRps = async (
  providers: RpsProviders,
  initialPrivateState: RpsPrivateState,
): Promise<DeployedRpsContract> => {
  logger.info("Deploying RPS contract...");
  const rpsContract = await deployContract(providers, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    compiledContract: rpsCompiledContract as any,
    privateStateId: RpsPrivateStateId,
    initialPrivateState,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: [] as any,
  });
  logger.info(
    `Deployed RPS contract at: ${rpsContract.deployTxData.public.contractAddress}`,
  );
  return rpsContract as unknown as DeployedRpsContract;
};

export const joinRps = async (
  providers: RpsProviders,
  contractAddress: string,
): Promise<DeployedRpsContract> => {
  assertIsContractAddress(contractAddress);
  logger.info(`Joining RPS contract at: ${contractAddress}`);
  const rpsContract = await findDeployedContract(providers, {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contractAddress: contractAddress as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    compiledContract: rpsCompiledContract as any,
    privateStateId: RpsPrivateStateId,
    initialPrivateState: INITIAL_RPS_PRIVATE_STATE,
  });
  logger.info(
    `Joined RPS contract at: ${rpsContract.deployTxData.public.contractAddress}`,
  );
  return rpsContract as unknown as DeployedRpsContract;
};

/**
 * Commit a move. Updates private state with the chosen move and a random salt
 * before calling the commit() circuit so that witness functions can read them.
 */
export const commitRps = async (
  providers: RpsProviders,
  contract: DeployedRpsContract,
  move: number,
): Promise<FinalizedTxData> => {
  logger.info(`Committing move ${move}...`);
  const salt = new Uint8Array(32);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).crypto.getRandomValues(salt);
  const current =
    (await providers.privateStateProvider.get(RpsPrivateStateId)) ??
    INITIAL_RPS_PRIVATE_STATE;
  await providers.privateStateProvider.set(RpsPrivateStateId, {
    ...current,
    myMove: move,
    mySalt: salt,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalizedTxData = await (contract as any).callTx.commit();
  logger.info(
    `Commit TX ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`,
  );
  return finalizedTxData.public as FinalizedTxData;
};

export const revealRps = async (
  contract: DeployedRpsContract,
): Promise<FinalizedTxData> => {
  logger.info("Revealing move...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalizedTxData = await (contract as any).callTx.reveal();
  logger.info(
    `Reveal TX ${finalizedTxData.public.txId} added in block ${finalizedTxData.public.blockHeight}`,
  );
  return finalizedTxData.public as FinalizedTxData;
};

export const getRpsState = async (
  providers: RpsProviders,
  contractAddress: string,
): Promise<RpsLedgerState | null> => {
  assertIsContractAddress(contractAddress);
  logger.info("Checking RPS ledger state...");
  const state = await providers.publicDataProvider
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .queryContractState(contractAddress as any)
    .then((contractState) =>
      contractState != null
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (Rps.ledger(contractState.data as any) as unknown as RpsLedgerState)
        : null,
    );
  logger.info(
    `RPS state: ${JSON.stringify(state, (_k, v) => (v instanceof Uint8Array ? `0x${Buffer.from(v).toString("hex").slice(0, 8)}...` : v))}`,
  );
  return state;
};
