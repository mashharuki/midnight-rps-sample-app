import type { ServiceUriConfig } from "@midnight-ntwrk/dapp-connector-api";

// ---------------------------------------------------------------------------
// 通貨
// ---------------------------------------------------------------------------

/** Midnight の最小通貨単位。1 tDUST = 10^9 base units */
export const DENOMINATION = 1_000_000_000n;

/** 通貨単位の表示文字列 */
export const CURRENCY_UNIT = "tDUST";

// ---------------------------------------------------------------------------
// Lace Wallet 接続設定
// ---------------------------------------------------------------------------

/** 互換性のある Lace Connector API のバージョン範囲 */
export const COMPATIBLE_CONNECTOR_VERSION = ">=1.0.0";

/** window.midnight.mnLace を検出するまでの最大待機時間 (ms) */
export const DETECT_TIMEOUT_MS = 10_000;

/** ポーリング間隔 (ms) */
export const POLL_INTERVAL_MS = 100;

/**
 * Lace が接続を試みるネットワーク候補リスト（優先順位順）。
 * 先頭から順に connect() を試み、ネットワーク不一致エラーが出たら次を試す。
 */
export const NETWORK_CANDIDATES = [
  "preprod",
  "mainnet",
  "undeployed",
  "preview",
] as const;

/** ウォレットから URI 設定を取得できない場合のフォールバック値 */
export const FALLBACK_URIS: ServiceUriConfig = {
  indexerUri: "https://indexer.testnet-02.midnight.network/api/v1/graphql",
  indexerWsUri: "wss://indexer.testnet-02.midnight.network/api/v1/graphql/ws",
  proverServerUri: "http://127.0.0.1:6300",
  substrateNodeUri: "",
};

// ---------------------------------------------------------------------------
// アプリ・ネットワーク表示
// ---------------------------------------------------------------------------

/** アプリケーション名 */
export const APP_NAME = "Midnight dApp";

/** ネットワーク表示ラベル */
export const NETWORK_LABEL = "PreProd Testnet";
