import { Button } from "@/components/ui/button";
import { useWallet } from "@/contexts/useWallet";
import { APP_NAME } from "@/utils/constants";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * ウォレット未接続時に表示されるランディングセクション。
 * - 接続ボタン押下で WalletProvider.connect() を呼び出す
 * - 接続中はボタンをスピナー付きで無効化
 * - 接続失敗時はエラーメッセージを表示
 */
export function ConnectSection() {
  const { state, connect } = useWallet();
  const { t } = useTranslation();
  const isConnecting = state.status === "connecting";

  return (
    <div className="flex flex-col items-center gap-8 px-4 text-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
        <span
          className="relative text-7xl"
          role="img"
          aria-label={t("aria.midnightLogo")}
        >
          🌑
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          {APP_NAME}
        </h1>
        <p className="max-w-sm text-base text-muted-foreground">
          {t("app.subtitle")}
        </p>
      </div>

      <Button
        size="lg"
        onClick={connect}
        disabled={isConnecting}
        className="min-w-52 bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70"
      >
        {isConnecting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("button.connecting")}
          </>
        ) : (
          t("button.connect")
        )}
      </Button>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{t("error.connectFailed")}</p>
      )}
    </div>
  );
}
