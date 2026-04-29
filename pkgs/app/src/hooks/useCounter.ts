import { useWallet } from "@/contexts/useWallet";
import {
  incrementCounter,
  joinCounterContract,
  subscribeToCounterState,
} from "@/lib/counter";
import type { DeployedCounterContract } from "@/lib/counter-types";
import type { ContractAddress } from "@midnight-ntwrk/compact-runtime";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import type { Subscription } from "rxjs";

// ストレージキー定数。ローカルストレージに保存する際のキーを定義。
const STORAGE_KEY = "counter-contract-address";

export type CounterStatus =
  | "idle"
  | "joining"
  | "joined"
  | "incrementing"
  | "error";

export interface UseCounterResult {
  contractAddress: string;
  counterValue: bigint | null;
  status: CounterStatus;
  error: string | null;
  setContractAddress: (addr: string) => void;
  join: (addr: string) => Promise<void>;
  increment: () => Promise<void>;
}

/**
 * Counter コントラクトとの接続・状態管理を行うカスタムフック。
 * - contractAddress: ユーザーが入力したコントラクトアドレス
 * - counterValue: 現在のカウンター値（リアルタイム購読）
 * @returns 
 */
export function useCounter(): UseCounterResult {
  const { state } = useWallet();
  const providers =
    state.status === "connected" ? state.providers : null;

  const [contractAddress, setContractAddressState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? "",
  );
  const [counterValue, setCounterValue] = useState<bigint | null>(null);
  const [deployedContract, setDeployedContract] =
    useState<DeployedCounterContract | null>(null);
  const [status, setStatus] = useState<CounterStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);

  /**
   * コントラクトアドレスを更新する関数。
   * 状態とローカルストレージの両方を更新する。
   */
  const setContractAddress = useCallback((addr: string) => {
    setContractAddressState(addr);
    localStorage.setItem(STORAGE_KEY, addr);
  }, []);

  /**
   * 指定したコントラクトアドレスに接続する関数。providers が必要。
   * 接続中は状態を "joining" にしてエラーをリセット。
   * 接続成功時は deployedContract と contractAddress を状態にセットし、サブスクリプションを開始してカウンター値をリアルタイム更新。
   * 接続失敗時は状態を "error" にしてエラーメッセージをセット。
   */
  const join = useCallback(
    async (addr: string) => {
      if (!providers) return;
      setStatus("joining");
      setError(null);

      try {
        // コントラクトに接続してインスタンスを取得
        const contract = await joinCounterContract(providers, addr);
        setDeployedContract(contract);
        setContractAddress(addr);

        // 既存サブスクリプションを破棄してから新規購読
        subscriptionRef.current?.unsubscribe();
        // subscribeToCounterState は Observable を返すので購読して状態を更新
        subscriptionRef.current = subscribeToCounterState(
          providers,
          addr as ContractAddress,
        ).subscribe({
          next: (value) => setCounterValue(value),
          error: (e: unknown) => setError(String(e)),
        });

        setStatus("joined");
      } catch (e) {
        setStatus("error");
        setError(String(e));
      }
    },
    [providers, setContractAddress],
  );

  /**
   * カウンター値をインクリメントする関数。deployedContract が必要。
   * トランザクションがファイナライズされるまで待機し、完了後に状態を "joined" に戻す。
   * エラー発生時は状態を "error" にしてエラーメッセージをセット。
   */
  const increment = useCallback(async () => {
    if (!deployedContract) return;
    setStatus("incrementing");
    setError(null);

    try {
      // カウンターをインクリメント
      await incrementCounter(deployedContract);
      setStatus("joined");
    } catch (e) {
      setStatus("error");
      setError(String(e));
    }
  }, [deployedContract]);

  // ウォレット切断時やアンマウント時にサブスクリプションをクリーンアップ
  useEffect(() => {
    if (state.status !== "connected") {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      startTransition(() => {
        setDeployedContract(null);
        setCounterValue(null);
        setStatus("idle");
      });
    }
  }, [state.status]);

  useEffect(() => {
    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, []);

  return {
    contractAddress,
    counterValue,
    status,
    error,
    setContractAddress,
    join,
    increment,
  };
}
