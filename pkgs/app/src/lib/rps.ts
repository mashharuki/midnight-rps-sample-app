import * as CompactJs from "@midnight-ntwrk/compact-js";
import type { ContractAddress } from "@midnight-ntwrk/compact-runtime";
import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import {
  assertIsContractAddress,
  toHex,
} from "@midnight-ntwrk/midnight-js-utils";
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
  const current =
    (await providers.privateStateProvider.get(RpsPrivateStateId)) ??
    INITIAL_PRIVATE_STATE;
  // Preserve the existing salt when one is already stored.  Regenerating the
  // salt on every call would break the on-chain commitment if the first submit
  // succeeded but the wallet reported an error (e.g. Lace runtime.lastError
  // channel-close).  A fresh salt is only needed for the very first commit of
  // each game; reset() clears mySalt so the next game always gets a new one.
  const salt = current.mySalt ?? crypto.getRandomValues(new Uint8Array(32));
  await providers.privateStateProvider.set(RpsPrivateStateId, {
    ...current,
    myMove: move,
    mySalt: salt,
  });
};

// p1_key/p2_key on the ledger are `derive_pk(secretKey)`, a ZK-private pseudonym —
// unrelated to the wallet's coinPublicKey. Recomputing it the same way the contract
// does is the only way to tell which side ("player1" or "player2") this browser is.
export const getMyPublicKeyHex = async (
  providers: RpsProviders,
): Promise<string> => {
  const current =
    (await providers.privateStateProvider.get(RpsPrivateStateId)) ??
    INITIAL_PRIVATE_STATE;
  return toHex(Rps.pureCircuits.derive_pk(current.secretKey));
};

// TEMP DEBUG: dump the raw stored private state to diagnose why myMove/mySalt
// disappear between commit() and reveal() even without a reload/reset.
export const debugPrivateState = async (
  providers: RpsProviders,
  label: string,
): Promise<void> => {
  const current = await providers.privateStateProvider.get(RpsPrivateStateId);
  console.log(`[debug:${label}] privateState =`, current);
};

export const clearPrivateState = async (
  providers: RpsProviders,
): Promise<void> => {
  const current =
    (await providers.privateStateProvider.get(RpsPrivateStateId)) ??
    INITIAL_PRIVATE_STATE;
  await providers.privateStateProvider.set(RpsPrivateStateId, {
    ...current,
    myMove: null,
    mySalt: null,
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
