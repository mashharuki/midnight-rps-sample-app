import type { RpsLedgerState } from "@/lib/rps-types";
import { RpsGameState } from "@/lib/rps-types";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SealedMove } from "./SealedMove";
import { OpponentStatus } from "./OpponentStatus";

interface WaitingStateProps {
  ledgerState: RpsLedgerState;
  myPublicKey: string;
}

export function WaitingState({ ledgerState, myPublicKey }: WaitingStateProps) {
  const { t } = useTranslation();

  const isPlayer1 = toHex(ledgerState.p1_key) === myPublicKey;
  const myRevealed = isPlayer1
    ? ledgerState.p1_revealed
    : ledgerState.p2_revealed;
  const opponentCommitted = isPlayer1
    ? ledgerState.p2_joined
    : ledgerState.p1_joined;
  const myCommitHash = toHex(
    isPlayer1 ? ledgerState.p1_commit : ledgerState.p2_commit,
  );

  // Case 1: P1 joined, waiting for P2 to commit
  if (ledgerState.p1_joined && !ledgerState.p2_joined) {
    return (
      <div className="flex flex-col gap-3 animate-fade-in-up">
        <SealedMove commitHash={myCommitHash} />
        <OpponentStatus state="waiting" />
      </div>
    );
  }

  // Case 2: Both committed — ready to reveal
  if (ledgerState.state === RpsGameState.committed && !myRevealed) {
    return (
      <div className="flex flex-col gap-3 animate-fade-in-up">
        <SealedMove commitHash={myCommitHash} />
        <OpponentStatus state={opponentCommitted ? "committed" : "waiting"} />
      </div>
    );
  }

  // Case 3: I revealed — waiting for opponent
  return (
    <div className="flex flex-col items-center gap-3 py-4 animate-fade-in-up">
      <CheckCircle2 className="h-10 w-10 text-cyan-400" />
      <p className="text-sm font-medium text-white/60">
        {t("rps.waiting.forOpponentReveal")}
      </p>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-cyan-500/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
