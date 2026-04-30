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
import { FALLBACK_URIS } from "@/utils/constants";
import type { WalletConnectionResult } from "@/utils/types";
import type { RpsCircuits, RpsProviders } from "./rps-types";
import { RpsPrivateStateId } from "./rps-types";

export function createRpsProviders(
  connection: WalletConnectionResult,
): RpsProviders {
  const { wallet, uris, state } = connection;
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
      await (walletRaw.submitTransaction as (tx: string) => Promise<void>)(
        toHex(tx.serialize()),
      );
      return tx.identifiers()[0];
    },
  };

  const zkConfigProvider = new FetchZkConfigProvider<RpsCircuits>(
    `${window.location.origin}/managed/rps`,
    fetch.bind(window),
  );

  const proverServerUri = FALLBACK_URIS.proverServerUri;
  console.log(
    "[providers] Lace proverServerUri:",
    uris.proverServerUri,
    "→ using:",
    proverServerUri,
  );

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStoragePasswordProvider: () => "midnight-rps-demo-app-2024",
      accountId: state.coinPublicKey,
      privateStateStoreName: RpsPrivateStateId,
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
