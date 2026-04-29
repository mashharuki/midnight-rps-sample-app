import type { CompiledContract } from "@midnight-ntwrk/compact-js";
import type {
  DeployedContract,
  FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import type {
  AnyProvableCircuitId,
  MidnightProviders,
} from "@midnight-ntwrk/midnight-js-types";
import type { CounterPrivateState } from "contract";

export type CounterCircuits = AnyProvableCircuitId;

export const CounterPrivateStateId = "counterPrivateState" as const;
export type CounterProviders = MidnightProviders<
  CounterCircuits,
  typeof CounterPrivateStateId,
  CounterPrivateState
>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CounterContract = CompiledContract.CompiledContract<any, CounterPrivateState>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DeployedCounterContract =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | DeployedContract<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | FoundContract<any>;
