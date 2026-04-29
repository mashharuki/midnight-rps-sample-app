import { useWallet } from "@/contexts/useWallet";
import { createRpsProviders } from "@/lib/providers";
import {
  commitMove,
  joinRpsContract,
  revealMove,
  setMyMove,
  subscribeToRpsState,
} from "@/lib/rps";
import type { DeployedRpsContract, RpsLedgerState, RpsMove } from "@/lib/rps-types";
import { RpsGameState } from "@/lib/rps-types";
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

const STORAGE_KEY = "rps-contract-address";

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
  setContractAddress: (addr: string) => void;
  join: (addr: string) => Promise<void>;
  selectMove: (move: RpsMove) => void;
  commit: () => Promise<void>;
  reveal: () => Promise<void>;
}

export function useRpsGame(): UseRpsGameResult {
  const { state } = useWallet();

  const connection = state.status === "connected" ? state.connection : null;
  const coinPublicKey =
    state.status === "connected" ? state.connection.state.coinPublicKey : "";

  // Memoize RPS providers: re-created only when the wallet connection changes
  const providers = useMemo(
    () => (connection ? createRpsProviders(connection) : null),
    [connection],
  );

  const [contractAddress, setContractAddressState] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? "",
  );
  const [ledgerState, setLedgerState] = useState<RpsLedgerState | null>(null);
  const [selectedMove, setSelectedMove] = useState<RpsMove | null>(null);
  const [deployedContract, setDeployedContract] =
    useState<DeployedRpsContract | null>(null);
  const [status, setStatus] = useState<RpsStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  // Persists the status before an error so the user can retry from the same point
  const prevStatusRef = useRef<RpsStatus>("idle");
  const subscriptionRef = useRef<Subscription | null>(null);

  const setContractAddress = useCallback((addr: string) => {
    setContractAddressState(addr);
    localStorage.setItem(STORAGE_KEY, addr);
  }, []);

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

        // Start ledger subscription; auto-transition to finished when game ends
        subscriptionRef.current?.unsubscribe();
        subscriptionRef.current = subscribeToRpsState(
          providers,
          addr as ContractAddress,
        ).subscribe({
          next: (ls) => {
            setLedgerState(ls);
            if (ls.state === RpsGameState.finished) {
              setStatus("finished");
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
  }, [providers, deployedContract, selectedMove, status]);

  const reveal = useCallback(async () => {
    if (!deployedContract) return;

    // Restore from error state if needed
    if (status === "error") {
      setStatus(prevStatusRef.current);
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
  }, [deployedContract, status]);

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
    setContractAddress,
    join,
    selectMove,
    commit,
    reveal,
  };
}
