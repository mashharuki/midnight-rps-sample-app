import { AddressCard } from "./components/AddressCard";
import { ConnectSection } from "./components/ConnectSection";
import { LanguageToggle } from "./components/LanguageToggle";
import { RpsGame } from "./components/RpsGame";
import { useWallet } from "./contexts/useWallet";

/**
 * アプリのルートコンポーネント。
 * ウォレットの接続状態に応じて表示を切り替える：
 * - connected → ウォレット情報カード (AddressCard) + RPS ゲーム
 * - それ以外  → 接続ボタン画面 (ConnectSection)
 */
function App() {
  const { state } = useWallet();

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <LanguageToggle />
      {state.status === "connected" ? (
        <div className="flex flex-col gap-4 w-full max-w-md">
          <AddressCard />
          <RpsGame />
        </div>
      ) : (
        <ConnectSection />
      )}
    </main>
  );
}

export default App;
