import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export type OpponentState = "waiting" | "committed";

interface OpponentStatusProps {
  state: OpponentState;
}

export function OpponentStatus({ state }: OpponentStatusProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-xl border border-white/8 bg-white/3 px-4 py-3 flex items-center gap-3">
      <span className="text-xs text-white/35 uppercase tracking-wider shrink-0">
        {t("rps.opponent.label")}
      </span>

      {state === "waiting" ? (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-white/25 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <span className="text-sm text-white/45">
            {t("rps.opponent.waiting")}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          <span className="text-sm text-cyan-300">
            {t("rps.opponent.committed")}
          </span>
        </div>
      )}
    </div>
  );
}
