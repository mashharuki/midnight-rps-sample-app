import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import { Minus, RotateCcw, Trophy, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RpsLedgerState } from "@/lib/rps-types";
import { RPS_MOVE_KEYS, RpsGameResult, RpsMove } from "@/lib/rps-types";

function getMoveEmoji(move: RpsMove): string {
  if (move === RpsMove.rock) return "🪨";
  if (move === RpsMove.paper) return "🖐";
  return "✌️";
}

function getMoveColor(move: RpsMove): string {
  if (move === RpsMove.rock) return "#a855f7";
  if (move === RpsMove.paper) return "#f472b6";
  return "#22d3ee";
}

interface ResultDisplayProps {
  ledgerState: RpsLedgerState;
  myPublicKey: string;
  onPlayAgain?: () => void;
}

export function ResultDisplay({
  ledgerState,
  myPublicKey,
  onPlayAgain,
}: ResultDisplayProps) {
  const { t } = useTranslation();

  // Explicitly checking both keys (rather than falling back to "not p1 = p2")
  // avoids mislabeling an unregistered viewer (myPublicKey matching neither key)
  // as player2's perspective.
  const isPlayer1 = toHex(ledgerState.p1_key) === myPublicKey;
  const isPlayer2 = toHex(ledgerState.p2_key) === myPublicKey;
  const isDraw = ledgerState.result === RpsGameResult.draw;
  const didWin =
    (ledgerState.result === RpsGameResult.player1_wins && isPlayer1) ||
    (ledgerState.result === RpsGameResult.player2_wins && isPlayer2);
  const didLose =
    (ledgerState.result === RpsGameResult.player1_wins && isPlayer2) ||
    (ledgerState.result === RpsGameResult.player2_wins && isPlayer1);

  const resultKey = isDraw ? "draw" : didWin ? "win" : "lose";
  const bannerColor = didLose ? "#f472b6" : "#22d3ee";
  const bannerBg = didLose ? "rgba(244,114,182,0.1)" : "rgba(34,211,238,0.1)";
  const bannerBorder = didLose
    ? "rgba(244,114,182,0.3)"
    : "rgba(34,211,238,0.3)";

  const myMove = isPlayer1 ? ledgerState.p1_move : ledgerState.p2_move;
  const opponentMove = isPlayer1 ? ledgerState.p2_move : ledgerState.p1_move;

  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      {/* Result banner */}
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: bannerBg, border: `1px solid ${bannerBorder}` }}
      >
        {isDraw ? (
          <Minus className="h-5 w-5 shrink-0" style={{ color: bannerColor }} />
        ) : didWin ? (
          <Trophy className="h-5 w-5 shrink-0" style={{ color: bannerColor }} />
        ) : (
          <XCircle
            className="h-5 w-5 shrink-0"
            style={{ color: bannerColor }}
          />
        )}
        <p className="font-bold text-lg" style={{ color: bannerColor }}>
          {t(`rps.result.${resultKey}`)}
        </p>
      </div>

      {/* Move comparison */}
      <div className="flex items-center gap-3">
        <MoveCard
          move={myMove}
          label={t("rps.result.yourMove")}
          moveLabel={t(`rps.moves.${RPS_MOVE_KEYS[myMove]}`)}
          isWinner={didWin}
          winnerLabel={t("rps.result.winner")}
        />
        <p className="text-white/30 font-bold text-sm shrink-0">VS</p>
        <MoveCard
          move={opponentMove}
          label={t("rps.result.opponentMove")}
          moveLabel={t(`rps.moves.${RPS_MOVE_KEYS[opponentMove]}`)}
          isWinner={didLose}
          winnerLabel={t("rps.result.winner")}
        />
      </div>

      {/* Play Again */}
      {onPlayAgain && (
        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-semibold text-sm text-white transition-all duration-200 hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
        >
          <RotateCcw className="h-4 w-4" />
          {t("rps.result.playAgain")}
        </button>
      )}
    </div>
  );
}

interface MoveCardProps {
  move: RpsMove;
  label: string;
  moveLabel: string;
  isWinner: boolean;
  winnerLabel: string;
}

function MoveCard({
  move,
  label,
  moveLabel,
  isWinner,
  winnerLabel,
}: MoveCardProps) {
  const color = getMoveColor(move);

  return (
    <div
      className="flex-1 flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 px-2"
      style={
        isWinner
          ? { borderColor: `${color}40`, backgroundColor: `${color}08` }
          : undefined
      }
    >
      <p className="text-xs text-white/40 uppercase tracking-wider">{label}</p>
      <span className="text-3xl leading-none">{getMoveEmoji(move)}</span>
      <span className="text-xs font-medium" style={{ color }}>
        {moveLabel}
      </span>
      {isWinner && (
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {winnerLabel}
        </span>
      )}
    </div>
  );
}
