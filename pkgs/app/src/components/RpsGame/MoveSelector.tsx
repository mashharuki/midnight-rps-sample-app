import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { type RPS_MOVE_KEYS, RpsMove } from "@/lib/rps-types";
import { cn } from "@/lib/utils";

type MoveKey = (typeof RPS_MOVE_KEYS)[number];

interface MoveConfig {
  move: RpsMove;
  emoji: string;
  key: MoveKey;
  borderColor: string;
  glowColor: string;
  labelColor: string;
}

const MOVES: MoveConfig[] = [
  {
    move: RpsMove.rock,
    emoji: "🪨",
    key: "rock",
    borderColor: "rgba(168,85,247,0.6)",
    glowColor: "rgba(168,85,247,0.15)",
    labelColor: "#a855f7",
  },
  {
    move: RpsMove.scissors,
    emoji: "✌️",
    key: "scissors",
    borderColor: "rgba(34,211,238,0.6)",
    glowColor: "rgba(34,211,238,0.15)",
    labelColor: "#22d3ee",
  },
  {
    move: RpsMove.paper,
    emoji: "🖐",
    key: "paper",
    borderColor: "rgba(244,114,182,0.6)",
    glowColor: "rgba(244,114,182,0.15)",
    labelColor: "#f472b6",
  },
];

interface MoveSelectorProps {
  selectedMove: RpsMove | null;
  onSelect: (move: RpsMove) => void;
  disabled: boolean;
}

export function MoveSelector({
  selectedMove,
  onSelect,
  disabled,
}: MoveSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-3">
      {MOVES.map(({ move, emoji, key, borderColor, glowColor, labelColor }) => {
        const isSelected = selectedMove === move;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(move)}
            disabled={disabled}
            className={cn(
              "relative flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl",
              "border transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              !disabled &&
                !isSelected &&
                "hover:-translate-y-0.5 hover:bg-white/5",
              isSelected ? "border-current" : "border-white/10 bg-white/3",
            )}
            style={
              isSelected
                ? {
                    borderColor,
                    backgroundColor: glowColor,
                    boxShadow: `0 0 20px ${glowColor}`,
                  }
                : undefined
            }
          >
            {isSelected && (
              <CheckCircle2
                className="absolute top-2 right-2 h-3.5 w-3.5"
                style={{ color: labelColor }}
              />
            )}
            <span className="text-3xl leading-none">{emoji}</span>
            <span
              className="text-xs font-medium"
              style={
                isSelected
                  ? { color: labelColor }
                  : { color: "rgba(255,255,255,0.5)" }
              }
            >
              {t(`rps.moves.${key}`)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
