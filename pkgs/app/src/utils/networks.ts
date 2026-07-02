import type { ServiceUriConfig } from "@midnight-ntwrk/dapp-connector-api";

/** フロントエンドが対応するネットワーク */
export type NetworkId = "preprod" | "preview";

/** ユーザーが選択可能なネットワークの表示順 */
export const NETWORK_IDS: readonly NetworkId[] = ["preprod", "preview"];

/** ネットワーク選択の localStorage キー */
export const NETWORK_STORAGE_KEY = "network";

/** ユーザーが明示的に選択しなかった場合の既定ネットワーク */
export const DEFAULT_NETWORK_ID: NetworkId = "preprod";

export interface NetworkDefinition {
  /** UI表示ラベル */
  label: string;
  /** テストネット用フォーセットURL */
  faucetUrl: string;
  /**
   * ウォレットの getConfiguration() が使えない場合のフォールバックURI。
   * pkgs/cli/src/config.ts の Preprod/PreviewConfig と同じエンドポイントに揃えてある。
   */
  fallbackUris: ServiceUriConfig;
}

export const NETWORKS: Record<NetworkId, NetworkDefinition> = {
  preprod: {
    label: "PreProd Testnet",
    faucetUrl: "https://faucet.preprod.midnight.network/",
    fallbackUris: {
      indexerUri: "https://indexer.preprod.midnight.network/api/v3/graphql",
      indexerWsUri: "wss://indexer.preprod.midnight.network/api/v3/graphql/ws",
      proverServerUri: "http://127.0.0.1:6300",
      substrateNodeUri: "https://rpc.preprod.midnight.network",
    },
  },
  preview: {
    label: "Preview Testnet",
    faucetUrl: "https://faucet.preview.midnight.network/",
    fallbackUris: {
      indexerUri: "https://indexer.preview.midnight.network/api/v3/graphql",
      indexerWsUri: "wss://indexer.preview.midnight.network/api/v3/graphql/ws",
      proverServerUri: "http://127.0.0.1:6300",
      substrateNodeUri: "https://rpc.preview.midnight.network",
    },
  },
};
