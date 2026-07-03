import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRpsGame } from "@/hooks/useRpsGame";
import { RpsGameState } from "@/lib/rps-types";
import { Gamepad2, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CommitButton } from "./CommitButton";
import { MoveSelector } from "./MoveSelector";
import { PhaseProgressBar } from "./PhaseProgressBar";
import { ResultDisplay } from "./ResultDisplay";
import { RevealButton } from "./RevealButton";
import { WaitingState } from "./WaitingState";

/**
 * RPS ゲームルートコンポーネント。
 * useRpsGame() の status に応じて子コンポーネントを切り替える。
 *
 * idle|joining       → contract address 入力 + Join ボタン
 * joined             → MoveSelector + CommitButton (enabled)
 * committing         → ZK panel (CommitButton loading state)
 * committed          → SealedMove + OpponentStatus + RevealButton
 * revealing          → SealedMove + OpponentStatus + RevealButton (loading)
 * finished           → ResultDisplay + Play Again
 * error              → 直前フェーズの UI + エラーバナー
 */
export function RpsGame() {
  const { t } = useTranslation();

  const {
    contractAddress,
    ledgerState,
    selectedMove,
    status,
    error,
    myPublicKey,
    setContractAddress,
    join,
    selectMove,
    commit,
    reveal,
    reset,
  } = useRpsGame();

  const prevStatusRef = useRef(status);

  // Toast notifications for commit/reveal success
  useEffect(() => {
    const prev = prevStatusRef.current;
    if (prev === "committing" && status === "committed") {
      toast.success(t("rps.toast.commitOk"));
    }
    if (prev === "revealing" && status === "finished") {
      toast.success(t("rps.toast.revealOk"));
    }
    prevStatusRef.current = status;
  }, [status, t]);

  const isJoining = status === "joining";
  const isCommitting = status === "committing";
  const isRevealing = status === "revealing";

  const inAddressPhase =
    status === "idle" ||
    status === "joining" ||
    (status === "error" && ledgerState === null);

  const inMovePhase =
    status === "joined" ||
    status === "committing" ||
    (status === "error" &&
      ledgerState !== null &&
      ledgerState.state === RpsGameState.waiting);

  const inWaitingPhase =
    status === "committed" ||
    status === "revealing" ||
    (status === "error" &&
      ledgerState !== null &&
      ledgerState.state === RpsGameState.committed);

  const showRevealButton =
    inWaitingPhase && ledgerState?.state === RpsGameState.committed;

  const showResult = status === "finished";

  return (
    <Card className="w-full border border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wider">
          <Gamepad2 className="h-4 w-4 text-cyan-400" />
          {t("rps.title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Phase progress bar — hidden on idle/joining */}
        {status !== "idle" && status !== "joining" && (
          <PhaseProgressBar status={status} />
        )}

        {/* ── Phase 1: Contract address input ── */}
        {inAddressPhase && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-white/50 uppercase tracking-wider">
              {t("rps.contractAddress")}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={contractAddress}
                onChange={(e) => setContractAddress(e.target.value)}
                placeholder={t("rps.addressPlaceholder")}
                disabled={isJoining}
                className="
                  flex-1 min-w-0 rounded-lg px-3 py-2 text-sm
                  bg-white/5 border border-white/10
                  text-white placeholder:text-white/30
                  focus:outline-none focus:ring-1 focus:ring-cyan-500/60
                  disabled:opacity-50 font-mono
                "
              />
              <Button
                onClick={() => void join(contractAddress)}
                disabled={!contractAddress || isJoining}
                size="sm"
                variant="outline"
                className="shrink-0 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                {isJoining ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    {t("rps.joining")}
                  </>
                ) : (
                  t("rps.join")
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Joined: contract address (readonly label) */}
        {!inAddressPhase && !showResult && (
          <div className="rounded-lg bg-white/3 border border-white/[0.08] px-3 py-2">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-1">
              {t("rps.contractAddress")}
            </p>
            <p className="text-xs font-mono text-white/60 truncate">
              {contractAddress}
            </p>
          </div>
        )}

        {/* ── Phase 2: Move selection ── */}
        {inMovePhase && (
          <div className="space-y-3">
            <MoveSelector
              selectedMove={selectedMove}
              onSelect={selectMove}
              disabled={isCommitting}
            />
            <CommitButton
              onCommit={() => void commit()}
              disabled={selectedMove === null || isCommitting}
              isLoading={isCommitting}
              selectedMove={selectedMove}
            />
          </div>
        )}

        {/* ── Phase 3: Waiting / Reveal ── */}
        {inWaitingPhase && ledgerState !== null && (
          <WaitingState ledgerState={ledgerState} myPublicKey={myPublicKey} />
        )}

        {showRevealButton && (
          <RevealButton
            onReveal={() => void reveal()}
            disabled={isRevealing}
            isLoading={isRevealing}
          />
        )}

        {/* ── Phase 4: Result ── */}
        {showResult && ledgerState !== null && (
          <ResultDisplay
            ledgerState={ledgerState}
            myPublicKey={myPublicKey}
            onPlayAgain={reset}
          />
        )}

        {/* Error banner */}
        {error !== null && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-0.5">
              {t("rps.error")}
            </p>
            <p className="text-xs text-red-300/80 font-mono break-all">
              {error}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
