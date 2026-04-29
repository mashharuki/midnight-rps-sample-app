import { createCounterProviders } from "@/lib/providers";
import {
  connectToWallet,
  NetworkMismatchError,
  UserRejectedError,
  VersionMismatchError,
  WalletNotFoundError,
  WalletTimeoutError,
} from "@/lib/wallet";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import i18next from "i18next";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { WalletContext, type WalletState } from "./walletContextDef";

/**
 * ウォレット接続状態を管理するコンテキストプロバイダー。
 *
 * connect():
 *   - 接続中は "connecting" 状態に設定し、ボタンを無効化する
 *   - 成功時は "connected" + WalletConnectionResult を保持
 *   - 失敗時はエラー種別に応じたトーストを表示。
 *     UserRejectedError のみ "disconnected" に戻す（ユーザー自身がキャンセルした場合）
 *
 * disconnect():
 *   - 状態を "disconnected" にリセットするだけ（ウォレット側のセッション破棄は不要）
 */
export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>({ status: "disconnected" });

  // ネットワーク ID をグローバルに設定する（環境変数 VITE_NETWORK_ID で切替可能）
  useEffect(() => {
    const id: string = import.meta.env.VITE_NETWORK_ID ?? "TestNet";
    setNetworkId(id);
  }, []);

  /**
   * ウォレットに接続する関数。接続中は状態を "connecting" にしてボタンを無効化。
   * 接続成功時は "connected" と接続結果を状態にセット。
   * 接続失敗時はエラーの種類に応じたトーストを表示し、UserRejectedError の場合は "disconnected" に戻す。
   * その他のエラーは "error" 状態にして、再度接続を試みることができるようにする。
   */
  const connect = useCallback(async () => {
    setState({ status: "connecting" });
    try {
      // 接続
      const connection = await connectToWallet();
      const providers = createCounterProviders(connection);
      setState({ status: "connected", connection, providers });
    } catch (e: unknown) {
      setState({ status: "error" });
      if (e instanceof WalletNotFoundError) {
        toast.error(e.message);
      } else if (e instanceof VersionMismatchError) {
        toast.error(e.message);
      } else if (e instanceof NetworkMismatchError) {
        toast.error(e.message);
      } else if (e instanceof UserRejectedError) {
        toast.warning(e.message);
        // ユーザー自身がキャンセルしたので error ではなく disconnected に戻す
        setState({ status: "disconnected" });
      } else if (e instanceof WalletTimeoutError) {
        toast.error(e.message);
      } else {
        toast.error(i18next.t("error.connectGeneric"));
      }
    }
  }, []);

  /**
   * ウォレットから切断する関数。状態を "disconnected" にリセットするだけで、ウォレット側のセッション破棄は不要。
   */
  const disconnect = useCallback(() => {
    setState({ status: "disconnected" });
  }, []);

  return (
    <WalletContext.Provider value={{ state, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}
