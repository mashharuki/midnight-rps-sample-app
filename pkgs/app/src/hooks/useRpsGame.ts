import type { ContractAddress } from "@midnight-ntwrk/compact-runtime";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Subscription } from "rxjs";
import { useNetwork } from "@/contexts/useNetwork";
import { useWallet } from "@/contexts/useWallet";
import { createRpsProviders } from "@/lib/providers";
import {
  clearPrivateState,
  commitMove,
  debugPrivateState,
  getMyPublicKeyHex,
  joinRpsContract,
  revealMove,
  setMyMove,
  subscribeToRpsState,
} from "@/lib/rps";
import type {
  DeployedRpsContract,
  RpsLedgerState,
  RpsMove,
} from "@/lib/rps-types";
import { RpsGameState } from "@/lib/rps-types";

// preprod/preview で保存済みコントラクトアドレスが混ざらないようネットワーク別に分離する
const contractAddressStorageKey = (networkId: string) =>
  `rps-contract-address:${networkId}`;

// Effect-TS errors (e.g. ContractRuntimeError from compact-js) wrap the real
// assertion failure in `.cause`, which plain String(e) drops. Walk the chain
// so circuit assertion messages (e.g. "Commitment mismatch for P2") reach the
// error banner instead of just the generic "Error executing circuit 'reveal'".
const formatError = (e: unknown): string => {
  const parts: string[] = [];
  let current: unknown = e;
  const seen = new Set<unknown>();
  while (current != null && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      parts.push(current.message);
      current = (current as { cause?: unknown }).cause;
    } else {
      parts.push(String(current));
      break;
    }
  }
  return parts.join(" -> ");
};

export type RpsStatus =
  | "idle"
  | "joining"
  | "joined"
  | "committing"
  | "committed"
  | "revealing"
  | "finished"
  | "error";

export interface UseRpsGameResult {
  contractAddress: string;
  ledgerState: RpsLedgerState | null;
  selectedMove: RpsMove | null;
  status: RpsStatus;
  error: string | null;
  coinPublicKey: string;
  myPublicKey: string;
  setContractAddress: (addr: string) => void;
  join: (addr: string) => Promise<void>;
  selectMove: (move: RpsMove) => void;
  commit: () => Promise<void>;
  reveal: () => Promise<void>;
  reset: () => void;
}

export function useRpsGame(): UseRpsGameResult {
  const { state } = useWallet();
  const { networkId } = useNetwork();

  const connection = state.status === "connected" ? state.connection : null;
  const coinPublicKey =
    state.status === "connected" ? state.connection.state.coinPublicKey : "";

  // Memoize RPS providers: re-created only when the wallet connection or network changes
  const providers = useMemo(
    () => (connection ? createRpsProviders(connection, networkId) : null),
    [connection, networkId],
  );

  const [contractAddress, setContractAddressState] = useState<string>(
    () => localStorage.getItem(contractAddressStorageKey(networkId)) ?? "",
  );
  const [ledgerState, setLedgerState] = useState<RpsLedgerState | null>(null);
  const [selectedMove, setSelectedMove] = useState<RpsMove | null>(null);
  const [deployedContract, setDeployedContract] =
    useState<DeployedRpsContract | null>(null);
  const [status, setStatus] = useState<RpsStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [myPublicKey, setMyPublicKey] = useState<string>("");

  // Persists the status before an error so the user can retry from the same point
  const prevStatusRef = useRef<RpsStatus>("idle");
  const subscriptionRef = useRef<Subscription | null>(null);

  // Reload the stored address whenever the active network changes, so a
  // Preprod address never leaks into a Preview session (or vice versa).
  useEffect(() => {
    setContractAddressState(
      localStorage.getItem(contractAddressStorageKey(networkId)) ?? "",
    );
  }, [networkId]);

  const setContractAddress = useCallback(
    (addr: string) => {
      setContractAddressState(addr);
      localStorage.setItem(contractAddressStorageKey(networkId), addr);
    },
    [networkId],
  );

  const join = useCallback(
    async (addr: string) => {
      if (!providers) return;
      prevStatusRef.current = "idle";
      setStatus("joining");
      setError(null);

      try {
        const contract = await joinRpsContract(providers, addr);
        setDeployedContract(contract);
        setContractAddress(addr);

        // p1_key/p2_key on the ledger are derived from the private-state secretKey
        // (see getMyPublicKeyHex), not the wallet's coinPublicKey. The private-state
        // provider only knows which contract's store to read once
        // joinRpsContract()/findDeployedContract() (just above) has run
        // providers.privateStateProvider.setContractAddress() internally — so this
        // must run right here, against this same `providers` reference, rather than
        // in a separate effect that could fire against a since-recreated `providers`
        // instance that never had setContractAddress() called on it.
        setMyPublicKey(await getMyPublicKeyHex(providers));

        // Start ledger subscription; auto-transition status when game state advances.
        // This reconciles the app status with the actual on-chain state, which is
        // critical after a page refresh or after a wallet error that obscured a
        // successful commit transaction.
        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = subscribeToRpsState(
          providers,
          addr as ContractAddress,
        ).subscribe({
          next: (ls) => {
            setLedgerState(ls);
            if (ls.state === RpsGameState.finished) {
              setStatus("finished");
            } else if (ls.state === RpsGameState.committed) {
              // Both players have committed on-chain. If our local status is still
              // "joined" (e.g. after a page refresh or a silently-succeeded commit
              // that the wallet reported as failed), advance to "committed" so the
              // reveal button becomes available.
              setStatus((prev) =>
                prev === "joined" || prev === "idle" ? "committed" : prev,
              );
            }
          },
          error: (e: unknown) => {
            console.error("[rps] subscription error:", e);
            setError(formatError(e));
          },
        });

        setStatus("joined");
      } catch (e) {
        console.error("[rps] join failed:", e);
        prevStatusRef.current = "idle";
        setStatus("error");
        setError(formatError(e));
      }
    },
    [providers, setContractAddress],
  );

  const selectMove = useCallback((move: RpsMove) => {
    setSelectedMove(move);
  }, []);

  const commit = useCallback(async () => {
    if (!providers || !deployedContract || selectedMove === null) return;

    // Restore from error state if needed
    if (status === "error") {
      setStatus(prevStatusRef.current);
      setError(null);
      return;
    }

    // Guard: on-chain state must be "waiting" before committing.
    // If it's already "committed", our previous commit went through despite
    // the wallet reporting an error (e.g. Lace runtime.lastError channel close).
    if (ledgerState !== null && ledgerState.state !== RpsGameState.waiting) {
      setStatus("committed");
      return;
    }

    prevStatusRef.current = "joined";
    setStatus("committing");
    setError(null);

    try {
      // Update private state with selected move before calling circuit
      await setMyMove(providers, selectedMove);
      await debugPrivateState(providers, "after setMyMove");
      await commitMove(deployedContract);
      await debugPrivateState(providers, "after commitMove");
      setStatus("committed");
    } catch (e) {
      console.error("[rps] commit failed:", e);
      prevStatusRef.current = "joined";
      setStatus("error");
      setError(formatError(e));
    }
  }, [providers, deployedContract, selectedMove, status, ledgerState]);

  const reset = useCallback(() => {
    subscriptionRef.current?.unsubscribe();
    subscriptionRef.current = null;
    // Clear move/salt so the next game always gets a fresh commitment.
    // secretKey is preserved (derived pk is not stored on-chain after game ends).
    if (providers) void clearPrivateState(providers);
    setDeployedContract(null);
    setLedgerState(null);
    setSelectedMove(null);
    setStatus("idle");
    setError(null);
  }, [providers]);

  const reveal = useCallback(async () => {
    if (!deployedContract) return;

    // Restore from error state if needed.
    // If prevStatus was "joined" but the ledger is already "committed", the
    // earlier commit went through on-chain despite the wallet throwing an error
    // (e.g. Lace runtime.lastError channel close). Treat this as "committed"
    // so the user can proceed to reveal instead of being sent back to the
    // commit phase and hitting "Not in waiting state".
    if (status === "error") {
      const restoredStatus =
        prevStatusRef.current === "joined" &&
        ledgerState?.state === RpsGameState.committed
          ? "committed"
          : prevStatusRef.current;
      setStatus(restoredStatus);
      setError(null);
      return;
    }

    prevStatusRef.current = "committed";
    setStatus("revealing");
    setError(null);

    try {
      if (providers) await debugPrivateState(providers, "before revealMove");
      await revealMove(deployedContract);
      // Status transitions to "finished" automatically via subscription
      // when the ledger confirms both players have revealed
    } catch (e) {
      console.error("[rps] reveal failed:", e);
      prevStatusRef.current = "committed";
      setStatus("error");
      setError(formatError(e));
    }
  }, [deployedContract, status, ledgerState, providers]);

  // Clean up subscription when wallet disconnects or component unmounts
  useEffect(() => {
    if (state.status !== "connected") {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
      startTransition(() => {
        setDeployedContract(null);
        setLedgerState(null);
        setSelectedMove(null);
        setStatus("idle");
        setMyPublicKey("");
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
    ledgerState,
    selectedMove,
    status,
    error,
    coinPublicKey,
    myPublicKey,
    setContractAddress,
    join,
    selectMove,
    commit,
    reveal,
    reset,
  };
}
