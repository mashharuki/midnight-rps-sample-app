import * as CompactJs from "@midnight-ntwrk/compact-js";
import type { ContractAddress } from "@midnight-ntwrk/compact-runtime";
import { findDeployedContract } from "@midnight-ntwrk/midnight-js-contracts";
import { assertIsContractAddress } from "@midnight-ntwrk/midnight-js-utils";
import { Counter, type CounterPrivateState } from "contract";
import * as Rx from "rxjs";
import type {
  CounterContract,
  CounterProviders,
  DeployedCounterContract,
} from "./counter-types";
import { CounterPrivateStateId } from "./counter-types";

// Counter コントラクトのコンパイル済みインスタンスを生成。型アサーションで CounterContract として扱う。
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const counterContractInstance: CounterContract = (CompactJs.CompiledContract.make(
  "counter",
  Counter.Contract as any,
) as any).pipe(
  CompactJs.CompiledContract.withVacantWitnesses,
);

// Counter コントラクトの初期プライベート状態を定義
const INITIAL_PRIVATE_STATE: CounterPrivateState = { privateCounter: 0 };

/**
 * 既存コントラクトに接続する。
 * @param providers CounterProviders（プロバイダのセット）
 * @param contractAddress 接続するコントラクトのアドレス
 * @returns DeployedCounterContract（接続されたコントラクトのインスタンス）
 * @throws コントラクトが見つからない、接続に失敗した場合などにエラーをスロー
 */
export const joinCounterContract = async (
  providers: CounterProviders,
  contractAddress: string,
): Promise<DeployedCounterContract> => {
  // コントラクトアドレスの形式を検証
  return findDeployedContract(
    providers,
    {
      compiledContract: counterContractInstance,
      contractAddress: contractAddress as ContractAddress,
      privateStateId: CounterPrivateStateId,
      initialPrivateState: INITIAL_PRIVATE_STATE,
    },
  ) as unknown as Promise<DeployedCounterContract>;
};

/**
 * カウンター値をインクリメントする。トランザクションがファイナライズされるまで待機する。
 * @param counterContract DeployedCounterContract（インクリメント対象のコントラクト）
 */
export const incrementCounter = async (
  counterContract: DeployedCounterContract,
): Promise<void> => {
  // increment() を呼び出してトランザクションを送信
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (counterContract as any).callTx.increment();
};

/**
 * 現在のカウンター値を1回取得する（単発クエリ）。
 * @param providers CounterProviders（プロバイダのセット）
 * @param contractAddress クエリ対象のコントラクトアドレス
 * @returns 現在のカウンター値（bigint）。コントラクトが見つからない場合は null。
 * @throws クエリに失敗した場合などにエラーをスロー
 */
export const getCounterValue = async (
  providers: CounterProviders,
  contractAddress: ContractAddress,
): Promise<bigint | null> => {
  assertIsContractAddress(contractAddress);
  // コントラクトの状態をクエリしてカウンター値を取得
  const contractState = await providers.publicDataProvider.queryContractState(
    contractAddress,
  );
  return contractState != null
    ? Counter.ledger(contractState.data as any).round
    : null;
};

/**
 * コントラクト状態の変更を Observable で監視するメソッド
 * @param providers CounterProviders（プロバイダのセット）
 * @param contractAddress 監視対象のコントラクトアドレス
 * @returns カウンター値の変更をリアルタイムで受け取る Observable。コントラクトが見つからない場合はエラーをスロー。
 * @throws コントラクトが見つからない、購読に失敗した場合などにエラーをスロー
 */
export const subscribeToCounterState = (
  providers: CounterProviders,
  contractAddress: ContractAddress,
): Rx.Observable<bigint> => {
  // コントラクトアドレスの形式を検証
  return providers.publicDataProvider
    .contractStateObservable(contractAddress, { type: "latest" })
    .pipe(
      Rx.map((contractState) => Counter.ledger(contractState.data as any).round),
    );
};
