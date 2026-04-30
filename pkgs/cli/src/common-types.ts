import { Rps, type RpsPrivateState } from "contract";
import type { MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import type {
  DeployedContract,
  FoundContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import type { AnyProvableCircuitId } from "@midnight-ntwrk/midnight-js-types";

export const RpsPrivateStateId = "rpsPrivateState" as const;

export type RpsCircuits = AnyProvableCircuitId;

export type RpsProviders = MidnightProviders<
  RpsCircuits,
  typeof RpsPrivateStateId,
  RpsPrivateState
>;

export type DeployedRpsContract =
  | DeployedContract<Rps.Contract<RpsPrivateState>>
  | FoundContract<Rps.Contract<RpsPrivateState>>;
