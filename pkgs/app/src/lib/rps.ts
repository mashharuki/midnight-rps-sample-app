import * as CompactJs from "@midnight-ntwrk/compact-js";
import type { ContractAddress } from "@midnight-ntwrk/compact-runtime";
import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import { assertIsContractAddress } from "@midnight-ntwrk/midnight-js-utils";
import type { RpsPrivateState } from "contract";
import { INITIAL_RPS_PRIVATE_STATE, Rps, rpsWitnesses } from "contract";
import * as Rx from "rxjs";
import type {
  DeployedRpsContract,
  RpsContractInstance,
  RpsLedgerState,
  RpsMove,
  RpsProviders,
} from "./rps-types";
import { RpsPrivateStateId } from "./rps-types";

// rps.compact declares 4 witnesses — withWitnesses registers the TypeScript implementations.
// TypeScript 6.0 resolves the conditional `witnesses` parameter type to `never` when the
// contract generic cannot be determined from an `any` base — `any` is no longer assignable
// to `never` in TS6.  Casting `withWitnesses` itself to `any` bypasses the conditional-type
// check while preserving the correct runtime behaviour.
// biome-ignore lint/suspicious/noExplicitAny: Rps.Contract class constructor type not externally accessible
const _rpsBase = CompactJs.CompiledContract.make(
  "rps",
  Rps.Contract as any,
) as any;
export const rpsContractInstance: RpsContractInstance =
  // biome-ignore lint/suspicious/noExplicitAny: bypass TS6 never-assignability of conditional witness param
  (CompactJs.CompiledContract.withWitnesses as any)(
    _rpsBase,
    rpsWitnesses,
  ) as unknown as RpsContractInstance;

const INITIAL_PRIVATE_STATE: RpsPrivateState = INITIAL_RPS_PRIVATE_STATE;

export const joinRpsContract = async (
  providers: RpsProviders,
  contractAddress: string,
): Promise<DeployedRpsContract> => {
  return findDeployedContract(providers, {
    // biome-ignore lint/suspicious/noExplicitAny: rpsContractInstance inferred as any from chain above
    compiledContract: rpsContractInstance as any,
    contractAddress: contractAddress as ContractAddress,
    privateStateId: RpsPrivateStateId,
    initialPrivateState: INITIAL_PRIVATE_STATE,
  }) as unknown as Promise<DeployedRpsContract>;
};

export const deployRpsContract = async (
  providers: RpsProviders,
): Promise<DeployedRpsContract> => {
  return deployContract(providers, {
    // biome-ignore lint/suspicious/noExplicitAny: rpsContractInstance inferred as any from chain above
    compiledContract: rpsContractInstance as any,
    privateStateId: RpsPrivateStateId,
    initialPrivateState: INITIAL_PRIVATE_STATE,
    args: [],
  }) as unknown as Promise<DeployedRpsContract>;
};

export const setMyMove = async (
  providers: RpsProviders,
  move: RpsMove,
): Promise<void> => {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const current =
    (await providers.privateStateProvider.get(RpsPrivateStateId)) ??
    INITIAL_PRIVATE_STATE;
  await providers.privateStateProvider.set(RpsPrivateStateId, {
    ...current,
    myMove: move,
    mySalt: salt,
  });
};

export const commitMove = async (
  contract: DeployedRpsContract,
): Promise<void> => {
  // biome-ignore lint/suspicious/noExplicitAny: DeployedRpsContract uses AnyProvableCircuitId; callTx circuit methods not statically typed
  await (contract as any).callTx.commit();
};

export const revealMove = async (
  contract: DeployedRpsContract,
): Promise<void> => {
  // biome-ignore lint/suspicious/noExplicitAny: see commitMove
  await (contract as any).callTx.reveal();
};

export const getRpsLedgerState = async (
  providers: RpsProviders,
  contractAddress: ContractAddress,
): Promise<RpsLedgerState | null> => {
  assertIsContractAddress(contractAddress);
  const contractState =
    await providers.publicDataProvider.queryContractState(contractAddress);
  return contractState != null
    ? // biome-ignore lint/suspicious/noExplicitAny: StateValue/ChargedState union not re-exported; cast defers to runtime
      (Rps.ledger(contractState.data as any) as unknown as RpsLedgerState)
    : null;
};

export const subscribeToRpsState = (
  providers: RpsProviders,
  contractAddress: ContractAddress,
): Rx.Observable<RpsLedgerState> => {
  return providers.publicDataProvider
    .contractStateObservable(contractAddress, { type: "latest" })
    .pipe(
      Rx.map(
        (contractState) =>
          // biome-ignore lint/suspicious/noExplicitAny: see getRpsLedgerState
          Rps.ledger(contractState.data as any) as unknown as RpsLedgerState,
      ),
    );
};
