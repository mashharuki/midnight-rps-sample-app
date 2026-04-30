import { RpsPrivateStateId } from "contract";
import type { RpsPrivateState } from "contract";
import type { CompiledContract } from "@midnight-ntwrk/compact-js";
import type {
  DeployedContract,
  FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import type {
  AnyProvableCircuitId,
  MidnightProviders,
} from "@midnight-ntwrk/midnight-js-types";

export { RpsPrivateStateId };

export type RpsCircuits = AnyProvableCircuitId;

export type RpsProviders = MidnightProviders<
  RpsCircuits,
  typeof RpsPrivateStateId,
  RpsPrivateState
>;

// biome-ignore lint/suspicious/noExplicitAny: contract generic opaque (mirrors counter-types.ts pattern)
export type RpsContractInstance = CompiledContract.CompiledContract<
  any,
  RpsPrivateState
>;

export type DeployedRpsContract =
  // biome-ignore lint/suspicious/noExplicitAny: see RpsContractInstance
  | DeployedContract<any>
  // biome-ignore lint/suspicious/noExplicitAny: see RpsContractInstance
  | FoundContract<any>;

// `const enum` is disallowed by erasableSyntaxOnly: true (app tsconfig).
// Using `as const` object + union type — identical semantics at runtime.
export const RpsMove = { rock: 0, paper: 1, scissors: 2 } as const;
export type RpsMove = (typeof RpsMove)[keyof typeof RpsMove];

export const RpsGameState = { waiting: 0, committed: 1, finished: 2 } as const;
export type RpsGameState = (typeof RpsGameState)[keyof typeof RpsGameState];

export const RpsGameResult = {
  not_determined: 0,
  player1_wins: 1,
  player2_wins: 2,
  draw: 3,
} as const;
export type RpsGameResult = (typeof RpsGameResult)[keyof typeof RpsGameResult];

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
