import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

interface SealedMoveProps {
  commitHash: string;
}

export function SealedMove({ commitHash }: SealedMoveProps) {
  const { t } = useTranslation();
  const shortHash =
    commitHash.length > 20
      ? `${commitHash.slice(0, 10)}…${commitHash.slice(-8)}`
      : commitHash;

  return (
    <div className="relative overflow-hidden rounded-xl border border-violet-500/30 bg-violet-500/5 px-4 py-5">
      {/* Ongoing ZK scan line */}
      <div
        className="absolute inset-x-0 h-px pointer-events-none animate-zk-scan"
        style={{
          background:
            "linear-gradient(90deg, transparent, #a855f7, transparent)",
        }}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-violet-500/50 bg-violet-500/10">
          <Shield className="h-7 w-7 text-violet-400" />
          <span className="absolute bottom-0.5 text-[9px] font-mono font-bold text-violet-300">
            ZK
          </span>
        </div>

        <p className="text-sm font-semibold text-white/80">
          {t("rps.sealed.title")}
        </p>

        {commitHash && (
          <p className="font-mono text-[11px] text-white/25 break-all text-center px-2">
            {shortHash}
          </p>
        )}

        <p className="font-mono text-xs text-violet-300/50">
          {t("rps.sealed.zkSealed")}
        </p>
      </div>
    </div>
  );
}
