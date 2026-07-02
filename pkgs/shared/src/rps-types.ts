import type { CompiledContract } from "@midnight-ntwrk/compact-js";
import type {
  DeployedContract,
  FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import type {
  AnyProvableCircuitId,
  MidnightProviders,
} from "@midnight-ntwrk/midnight-js-types";
import type { RpsPrivateState } from "contract";
import { RpsPrivateStateId } from "contract";

export { RpsPrivateStateId };

export type RpsCircuits = AnyProvableCircuitId;

export type RpsProviders = MidnightProviders<
  RpsCircuits,
  typeof RpsPrivateStateId,
  RpsPrivateState
>;

export type RpsContractInstance = CompiledContract.CompiledContract<
  // biome-ignore lint/suspicious/noExplicitAny: Rps.Contract generic is not externally accessible
  any,
  RpsPrivateState
>;

export type DeployedRpsContract =
  // biome-ignore lint/suspicious/noExplicitAny: see RpsContractInstance
  | DeployedContract<any>
  // biome-ignore lint/suspicious/noExplicitAny: see RpsContractInstance
  | FoundContract<any>;

// `const enum` is disallowed by erasableSyntaxOnly (app tsconfig).
// Using `as const` object + union type — identical semantics at runtime.
export const RpsMove = { rock: 0, paper: 1, scissors: 2 } as const;
export type RpsMove = (typeof RpsMove)[keyof typeof RpsMove];
/** RpsMove の値をキーの並び順で引ける配列。表示ラベル生成に使う。 */
export const RPS_MOVE_KEYS: readonly (keyof typeof RpsMove)[] = [
  "rock",
  "paper",
  "scissors",
];

export const RpsGameState = { waiting: 0, committed: 1, finished: 2 } as const;
export type RpsGameState = (typeof RpsGameState)[keyof typeof RpsGameState];
export const RPS_GAME_STATE_KEYS: readonly (keyof typeof RpsGameState)[] = [
  "waiting",
  "committed",
  "finished",
];

export const RpsGameResult = {
  not_determined: 0,
  player1_wins: 1,
  player2_wins: 2,
  draw: 3,
} as const;
export type RpsGameResult = (typeof RpsGameResult)[keyof typeof RpsGameResult];
export const RPS_GAME_RESULT_KEYS: readonly (keyof typeof RpsGameResult)[] = [
  "not_determined",
  "player1_wins",
  "player2_wins",
  "draw",
];

export type RpsLedgerState = {
  state: RpsGameState;
  game_over: boolean;
  p1_key: Uint8Array;
  p2_key: Uint8Array;
  p1_joined: boolean;
  p2_joined: boolean;
  p1_commit: Uint8Array;
  p2_commit: Uint8Array;
  p1_revealed: boolean;
  p2_revealed: boolean;
  p1_move: RpsMove;
  p2_move: RpsMove;
  result: RpsGameResult;
};
