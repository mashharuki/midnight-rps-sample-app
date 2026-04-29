import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCounter } from "@/hooks/useCounter";
import { Hash, Loader2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Counter コントラクトの UI カード。
 * - コントラクトアドレス入力 → Join
 * - 現在のカウンター値表示（リアルタイム購読）
 * - Increment ボタン（ZK 証明付きトランザクション発行）
 */
export function CounterSection() {
  const { t } = useTranslation();

  // カウンターフックから状態とアクションを取得
  const {
    contractAddress,
    counterValue,
    status,
    error,
    setContractAddress,
    join,
    increment,
  } = useCounter();

  const isJoining = status === "joining";
  const isIncrementing = status === "incrementing";
  const isJoined = status === "joined";

  return (
    <Card className="w-full border border-white/10 bg-white/5 backdrop-blur-md shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-white/80 uppercase tracking-wider">
          <Hash className="h-4 w-4 text-violet-400" />
          {t("counter.title")}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Contract address input + join */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-white/50 uppercase tracking-wider">
            {t("counter.contractAddress")}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder={t("counter.addressPlaceholder")}
              disabled={isJoining || isIncrementing}
              className="
                flex-1 min-w-0 rounded-lg px-3 py-2 text-sm
                bg-white/5 border border-white/10
                text-white placeholder:text-white/30
                focus:outline-none focus:ring-1 focus:ring-violet-500/60
                disabled:opacity-50 font-mono
              "
            />
            <Button
              onClick={() => join(contractAddress)}
              disabled={!contractAddress || isJoining || isIncrementing}
              size="sm"
              variant="outline"
              className="shrink-0 border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  {t("counter.joining")}
                </>
              ) : (
                t("counter.join")
              )}
            </Button>
          </div>
        </div>

        {/* Counter value display */}
        <div className="rounded-xl bg-white/5 border border-white/10 px-4 py-3">
          <p className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
            {t("counter.currentValue")}
          </p>
          {isJoined ? (
            <p className="text-4xl font-bold text-white tabular-nums tracking-tight">
              {counterValue != null ? counterValue.toString() : "—"}
            </p>
          ) : (
            <p className="text-sm text-white/35 italic">
              {t("counter.notJoined")}
            </p>
          )}
        </div>

        {/* Increment button */}
        <Button
          onClick={increment}
          disabled={!isJoined || isIncrementing}
          className="
            w-full gap-2 font-semibold
            bg-gradient-to-r from-violet-600 to-purple-600
            hover:from-violet-500 hover:to-purple-500
            disabled:opacity-40
            transition-all duration-200
          "
        >
          {isIncrementing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("counter.incrementing")}
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              {t("counter.increment")}
            </>
          )}
        </Button>

        {/* Error display */}
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
            <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-0.5">
              {t("counter.error")}
            </p>
            <p className="text-xs text-red-300/80 font-mono break-all">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
