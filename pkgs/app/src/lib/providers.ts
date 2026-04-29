import { FALLBACK_URIS } from "@/utils/constants";
import type { WalletConnectionResult } from "@/utils/types";
import {
  type CoinPublicKey,
  type EncPublicKey,
  type FinalizedTransaction,
  Transaction as LedgerTransaction,
  type TransactionId,
} from "@midnight-ntwrk/ledger-v8";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import type {
  MidnightProvider,
  UnboundTransaction,
  WalletProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { fromHex, toHex } from "@midnight-ntwrk/midnight-js-utils";
import type { CounterCircuits, CounterProviders } from "./counter-types";

/**
 * Midnight プロバイダーチェーンを生成する。
 * Lace Wallet 接続情報を使い、ブラウザ環境に適したプロバイダーを構築する。
 */
export function createCounterProviders(
  connection: WalletConnectionResult,
): CounterProviders {
  const { wallet, uris, state } = connection;
  // wallet-sdk-facade@3.0.0 exposes balanceUnsealedTransaction which accepts
  // ledger-v8 hex-encoded bytes (first byte = 109). This replaces the broken
  // ZSwap round-trip (ZswapTransaction.deserialize rejects byte 109 as unknown
  // network ID). Cast to access the method not yet declared in dapp-connector-api@3.0.0 types.
  const walletRaw = wallet as unknown as Record<string, unknown>;

  const walletProvider: WalletProvider = {
    getCoinPublicKey(): CoinPublicKey {
      return state.coinPublicKey;
    },
    getEncryptionPublicKey(): EncPublicKey {
      return state.encryptionPublicKey;
    },
    async balanceTx(
      tx: UnboundTransaction,
      _ttl?: Date | undefined,
    ): Promise<FinalizedTransaction> {
      if (typeof walletRaw.balanceUnsealedTransaction !== "function") {
        throw new Error(
          "Lace wallet does not support balanceUnsealedTransaction. Please update Lace wallet.",
        );
      }
      const hexTx = toHex(tx.serialize());
      const result = await (
        walletRaw.balanceUnsealedTransaction as (
          tx: string,
        ) => Promise<{ tx: string }>
      )(hexTx);
      return LedgerTransaction.deserialize(
        "signature",
        "proof",
        "binding",
        new Uint8Array(fromHex(result.tx)),
      ) as FinalizedTransaction;
    },
  };

  const midnightProvider: MidnightProvider = {
    async submitTx(tx: FinalizedTransaction): Promise<TransactionId> {
      // Pass hex-encoded ledger-v8 bytes — the Lace bridge accepts a hex string at runtime
      // even though the TypeScript interface (dapp-connector-api@3) still declares ZswapTransaction.
      // TransactionId is read from tx.identifiers()[0] (not from the return value of submitTransaction).
      await (walletRaw.submitTransaction as (tx: string) => Promise<void>)(
        toHex(tx.serialize()),
      );
      return tx.identifiers()[0];
    },
  };

  const zkConfigProvider = new FetchZkConfigProvider<CounterCircuits>(
    `${window.location.origin}/managed/counter`,
    fetch.bind(window),
  );

  // Force local Proof Server: Lace returns a remote preprod URL that blocks CORS from localhost
  const proverServerUri = FALLBACK_URIS.proverServerUri;
  console.log("[providers] Lace proverServerUri:", uris.proverServerUri, "→ using:", proverServerUri);

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStoragePasswordProvider: () => "midnight-counter-demo-app-2024",
      accountId: state.coinPublicKey,
    }),
    publicDataProvider: indexerPublicDataProvider(
      uris.indexerUri,
      uris.indexerWsUri,
    ),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(proverServerUri, zkConfigProvider),
    walletProvider,
    midnightProvider,
  };
}

