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

  // p1_key/p2_key on the ledger are derived from the private-state secretKey (see
  // getMyPublicKeyHex), not the wallet's coinPublicKey. The private-state provider only
  // knows which contract's store to read once findDeployedContract() (called from join())
  // has run providers.privateStateProvider.setContractAddress() internally — reading it
  // any earlier throws "Contract address not set". So this must depend on deployedContract,
  // not just providers, and must recompute after every successful join (not just once).
  useEffect(() => {
    if (!providers || !deployedContract) {
      setMyPublicKey("");
      return;
    }
    let cancelled = false;
    void getMyPublicKeyHex(providers).then((key) => {
      if (!cancelled) setMyPublicKey(key);
    });
    return () => {
      cancelled = true;
    };
  }, [providers, deployedContract]);

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
          error: (e: unknown) => setError(String(e)),
        });

        setStatus("joined");
      } catch (e) {
        prevStatusRef.current = "idle";
        setStatus("error");
        setError(String(e));
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
      await commitMove(deployedContract);
      setStatus("committed");
    } catch (e) {
      prevStatusRef.current = "joined";
      setStatus("error");
      setError(String(e));
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
      await revealMove(deployedContract);
      // Status transitions to "finished" automatically via subscription
      // when the ledger confirms both players have revealed
    } catch (e) {
      prevStatusRef.current = "committed";
      setStatus("error");
      setError(String(e));
    }
  }, [deployedContract, status, ledgerState]);

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
