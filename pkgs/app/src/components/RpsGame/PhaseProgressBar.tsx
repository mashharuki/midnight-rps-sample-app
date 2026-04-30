import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RpsStatus } from "@/hooks/useRpsGame";

interface PhaseProgressBarProps {
  status: RpsStatus;
}

const PHASES = [
  { key: "select" as const },
  { key: "commit" as const },
  { key: "reveal" as const },
  { key: "result" as const },
];

function getActivePhase(status: RpsStatus): number {
  if (status === "idle" || status === "joining") return 0;
  if (status === "joined" || status === "committing") return 1;
  if (status === "committed" || status === "revealing") return 2;
  if (status === "finished") return 3;
  return 0;
}

export function PhaseProgressBar({ status }: PhaseProgressBarProps) {
  const { t } = useTranslation();
  const active = getActivePhase(status);

  return (
    <div className="flex items-start gap-0">
      {PHASES.map((phase, i) => {
        const done = i < active;
        const current = i === active;
        const dotColor = done
          ? "#22d3ee"
          : current
            ? "#a855f7"
            : "rgba(255,255,255,0.2)";
        const labelColor = done
          ? "#22d3ee80"
          : current
            ? "#a855f780"
            : "rgba(255,255,255,0.15)";

        return (
          <div key={phase.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div
                className="h-6 w-6 rounded-full flex items-center justify-center transition-all duration-300"
                style={{
                  border: `1px solid ${dotColor}`,
                  background: done
                    ? "rgba(34,211,238,0.12)"
                    : current
                      ? "rgba(168,85,247,0.12)"
                      : "rgba(255,255,255,0.04)",
                }}
              >
                {done ? (
                  <CheckCircle2
                    className="h-3.5 w-3.5"
                    style={{ color: dotColor }}
                  />
                ) : (
                  <span
                    className="text-[10px] font-bold"
                    style={{ color: dotColor }}
                  >
                    {i + 1}
                  </span>
                )}
              </div>
              <span
                className="text-[9px] uppercase tracking-wider whitespace-nowrap"
                style={{ color: labelColor }}
              >
                {t(`rps.phase.${phase.key}`)}
              </span>
            </div>

            {i < PHASES.length - 1 && (
              <div
                className="flex-1 h-px mx-1 mt-[-10px]"
                style={{
                  background: done
                    ? "rgba(34,211,238,0.3)"
                    : "rgba(255,255,255,0.08)",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
