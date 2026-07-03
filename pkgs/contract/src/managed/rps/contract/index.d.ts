import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export enum GameState { waiting = 0, committed = 1, finished = 2 }

export enum Move { rock = 0, paper = 1, scissors = 2 }

export enum GameResult { not_determined = 0,
                         player1_wins = 1,
                         player2_wins = 2,
                         draw = 3
}

export type Witnesses<PS> = {
  local_secret_key(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  get_my_move(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Move];
  get_my_salt(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  store_move_and_salt(context: __compactRuntime.WitnessContext<Ledger, PS>,
                      m_0: Move,
                      s_0: Uint8Array): [PS, []];
}

export type ImpureCircuits<PS> = {
  commit(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  reveal(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  commit(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  reveal(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  derive_pk(sk_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  derive_pk(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  commit(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  reveal(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly state: GameState;
  readonly game_over: boolean;
  readonly p1_key: Uint8Array;
  readonly p2_key: Uint8Array;
  readonly p1_joined: boolean;
  readonly p2_joined: boolean;
  readonly p1_commit: Uint8Array;
  readonly p2_commit: Uint8Array;
  readonly p1_revealed: boolean;
  readonly p2_revealed: boolean;
  readonly p1_move: Move;
  readonly p2_move: Move;
  readonly result: GameResult;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
