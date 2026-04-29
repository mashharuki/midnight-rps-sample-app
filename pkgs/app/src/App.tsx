import { AddressCard } from "./components/AddressCard";
import { ConnectSection } from "./components/ConnectSection";
import { CounterSection } from "./components/CounterSection";
import { LanguageToggle } from "./components/LanguageToggle";
import { useWallet } from "./contexts/useWallet";

/**
 * アプリのルートコンポーネント。
 * ウォレットの接続状態に応じて表示を切り替える：
 * - connected → ウォレット情報カード (AddressCard) + Counter UI
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
          <CounterSection />
        </div>
      ) : (
        <ConnectSection />
      )}
    </main>
  );
}

export default App;
