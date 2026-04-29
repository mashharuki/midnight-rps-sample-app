# 実装計画

## Task 1: Compact コントラクト実装

- [x] 1.1 rps.compact を作成する
  - `pkgs/contract/src/rps.compact` を新規作成
  - デザインのソースコード設計に従い、`GameState` / `Move` / `GameResult` enum、13 フィールドの `export ledger`、4 witness 宣言、`derive_pk` / `make_commit` / `who_wins` pure circuit、`commit()` / `reveal()` export circuit を実装
  - `pragma language_version >= 0.16 && <= 0.21` と `import CompactStandardLibrary` を先頭に記載
  - `compactc pkgs/contract/src/rps.compact` がエラーなくコンパイルできること（Task 2 の前提）
  - _Requirements: 1, 2, 3, 4_
  - _Boundary: pkgs/contract/src/_

- [x] 1.2 rps-witnesses.ts を作成する
  - `pkgs/contract/src/rps-witnesses.ts` を新規作成
  - `RpsPrivateState` 型・`RpsPrivateStateId` 定数・`INITIAL_RPS_PRIVATE_STATE`（`secretKey` を `crypto.getRandomValues(32)` で初期化）・`rpsWitnesses` オブジェクト（4 witness 関数）をデザイン仕様通りに実装
  - `pkgs/contract/src/index.ts` に `export * as Rps from "./managed/rps/contract/index.js"` および `rpsWitnesses` / `RpsPrivateStateId` / `INITIAL_RPS_PRIVATE_STATE` / `RpsPrivateState` のエクスポートを追加
  - `import type { RpsPrivateState } from "contract"` が型エラーなく解決できること
  - _Requirements: 4_
  - _Boundary: pkgs/contract/src/_

---

## Task 2: ZK ビルドインフラ整備

- [x] 2.1 rps.compact をコンパイルして ZK キーを生成する
  - `compactc pkgs/contract/src/rps.compact` を実行し `pkgs/contract/src/managed/rps/` を生成
  - `pkgs/contract/src/managed/rps/contract/index.d.ts` に `commit` / `reveal` の回路型定義が存在すること
  - `pkgs/contract/src/managed/rps/keys/` に prover / verifier ファイルが存在すること
  - _Requirements: 1, 2_
  - _Depends: Task 1_
  - _Boundary: pkgs/contract/src/managed/_

- [x] 2.2 sync-keys-rps スクリプトを追加する
  - ルートの `package.json` の `scripts` セクションに `"sync-keys-rps"` エントリを追加（`pkgs/contract/src/managed/rps/keys/` と `pkgs/contract/src/managed/rps/zkir/` を `pkgs/app/public/managed/rps/` 以下にコピーするコマンド）
  - `npm run sync-keys-rps` 実行後、`pkgs/app/public/managed/rps/keys/` と `pkgs/app/public/managed/rps/zkir/` が生成されること
  - ブラウザの `FetchZkConfigProvider` が `/managed/rps` 以下のキーファイルを取得できる状態になること
  - _Requirements: 1, 2_
  - _Depends: Task 2.1_
  - _Boundary: pkgs/app/public/, package.json_

---

## Task 3: 型定義ファイル作成

- [x] 3.1 rps-types.ts を作成する
  - `pkgs/app/src/lib/rps-types.ts` を新規作成
  - デザインの `rps-types.ts` セクションに従い、`RpsCircuits` / `RpsProviders` / `RpsContractInstance` / `DeployedRpsContract` / `RpsMove` / `RpsGameState` / `RpsGameResult` / `RpsLedgerState` を実装
  - `const enum` を使用し、`any` を一切使わないこと
  - `import type { RpsLedgerState } from "./rps-types"` が TypeScript エラーなく解決できること
  - _Requirements: 1, 2, 3, 4, 5, 6, 7, 8_
  - _Boundary: pkgs/app/src/lib/_

---

## Task 4: アプリ API 層実装

- [ ] 4.1 providers.ts に createRpsProviders() を追加する
  - `pkgs/app/src/lib/providers.ts` を編集し `createRpsProviders()` 関数を追加
  - `FetchZkConfigProvider` のパスを `/managed/rps`、`privateStateProvider` の namespace を `RpsPrivateStateId` に設定
  - `createCounterProviders` との差分が zkConfigPath と namespace のみであること
  - `createRpsProviders` のテスト（Task 9.3）で正しい zkConfigPath が返ることを確認できること
  - _Requirements: 1, 2_
  - _Depends: Task 3_
  - _Boundary: pkgs/app/src/lib/_

- [ ] 4.2 rps.ts を作成する (P)
  - `pkgs/app/src/lib/rps.ts` を新規作成
  - `joinRpsContract` / `deployRpsContract` / `setMyMove` / `commitMove` / `revealMove` / `getRpsLedgerState` / `subscribeToRpsState` を実装
  - `CompiledContract.make("rps", Rps.Contract).pipe(CompiledContract.withVacantWitnesses)` パターンで `rpsContractInstance` を生成
  - `subscribeToRpsState` が `contractStateObservable` を `map(state => Rps.ledger(state.data))` で変換した Observable を返すこと
  - _Requirements: 1, 2, 6_
  - _Depends: Task 3_
  - _Boundary: pkgs/app/src/lib/_

---

## Task 5: CLI RPS 拡張（Task 4 と並行可）

- [ ] 5.1 common-types.ts に RPS 型を追加する
  - `pkgs/cli/src/common-types.ts` を編集し `RpsCircuits` / `RpsProviders` / `DeployedRpsContract` を追加
  - CLI の `@midnight-ntwrk/midnight-js/types` インポートパターン（既存 `CounterCircuits` 等と同一）に準拠すること
  - TypeScript コンパイルエラーなし
  - _Requirements: 9_
  - _Depends: Task 2.1_
  - _Boundary: pkgs/cli/src/_

- [ ] 5.2 api.ts に RPS API 関数を追加する (P)
  - `pkgs/cli/src/api.ts` を編集し `deployRps` / `joinRps` / `commitRps` / `revealRps` / `getRpsState` を追加
  - `commitRps` では circuit 呼び出し前に `setMyMove()` で private state を更新するロジックを含むこと
  - 2 プレイヤー統合テストを想定し、プレイヤーごとに別 `accountId` を持つ独立した `providers` を構成できるようにすること（別 LevelDB namespace により P1/P2 の private state が分離される）
  - `withStatus` スピナーヘルパーを利用したログ出力を含むこと
  - _Requirements: 9_
  - _Depends: Task 5.1_
  - _Boundary: pkgs/cli/src/_

- [ ] 5.3 cli.ts に RPS インタラクティブメニューを追加する
  - `pkgs/cli/src/cli.ts` を編集し RPS ゲーム操作メニュー（deploy / join / commit / reveal / state 取得）を追加
  - 既存 Counter メニューのフロー（wallet → deploy/join → actions）と同一パターンを踏襲すること
  - CLI を起動して RPS メニューが表示・選択できること
  - _Requirements: 9_
  - _Depends: Task 5.2_
  - _Boundary: pkgs/cli/src/_

---

## Task 6: useRpsGame フック実装

- [ ] 6.1 useRpsGame.ts を作成する
  - `pkgs/app/src/hooks/useRpsGame.ts` を新規作成
  - `RpsStatus` 型と `UseRpsGameResult` インターフェース（8 状態: idle / joining / joined / committing / committed / revealing / finished / error）をデザイン仕様通りに実装
  - `subscribeToRpsState` の RxJS 購読ライフサイクル（`useRef` による subscription 管理・`unsubscribe`）を `useCounter` フックのパターンに準拠して実装
  - `join()` 成功後に `subscribeToRpsState` が開始され、台帳状態変化が `ledgerState` に反映されること
  - エラー発生時は `status` を `"error"` に遷移させ、次の操作で前の状態に戻ること
  - _Requirements: 5, 6, 7, 8, 10_
  - _Depends: Task 4_
  - _Boundary: pkgs/app/src/hooks/_

---

## Task 7: UI コンポーネント実装

- [ ] 7.1 MoveSelector.tsx を作成する (P)
  - `pkgs/app/src/components/RpsGame/MoveSelector.tsx` を新規作成
  - グー（🪨）・チョキ（✌️）・パー（🖐）の 3 ボタンを実装。選択中はハイライト表示し、`disabled=true` のとき操作不可
  - Props: `selectedMove: RpsMove | null`, `onSelect: (move: RpsMove) => void`, `disabled: boolean`
  - shadcn/ui + Tailwind CSS を使用すること
  - _Requirements: 5_
  - _Boundary: pkgs/app/src/components/RpsGame/_

- [ ] 7.2 CommitButton.tsx を作成する (P)
  - `pkgs/app/src/components/RpsGame/CommitButton.tsx` を新規作成
  - ZK 証明生成中は `Loader2` アイコン + ローディングテキストを表示し、ボタンを無効化
  - Props: `onCommit: () => void`, `disabled: boolean`, `isLoading: boolean`
  - `isLoading=true` のとき `Loader2` アイコンが表示されること
  - _Requirements: 5_
  - _Boundary: pkgs/app/src/components/RpsGame/_

- [ ] 7.3 RevealButton.tsx を作成する (P)
  - `pkgs/app/src/components/RpsGame/RevealButton.tsx` を新規作成
  - ZK 証明生成中はローディング表示し、`disabled` のとき操作不可
  - Props: `onReveal: () => void`, `disabled: boolean`, `isLoading: boolean`
  - _Requirements: 7_
  - _Boundary: pkgs/app/src/components/RpsGame/_

- [ ] 7.4 WaitingState.tsx を作成する (P)
  - `pkgs/app/src/components/RpsGame/WaitingState.tsx` を新規作成
  - ゲーム状態（p1_joined / p2_joined / myRevealed）に応じて待機メッセージを切り替える 3 ケースを実装
  - Props: `ledgerState: RpsLedgerState`, `coinPublicKey: string`
  - _Requirements: 6_
  - _Boundary: pkgs/app/src/components/RpsGame/_

- [ ] 7.5 ResultDisplay.tsx を作成する (P)
  - `pkgs/app/src/components/RpsGame/ResultDisplay.tsx` を新規作成
  - 両者の手と最終結果（勝利 / 敗北 / 引き分け）を表示。i18n で日英対応
  - Props: `ledgerState: RpsLedgerState`, `coinPublicKey: string`
  - 勝利 / 敗北 / 引き分けの 3 ケースで正しいメッセージが表示されること
  - _Requirements: 8_
  - _Boundary: pkgs/app/src/components/RpsGame/_

---

## Task 8: 統合・i18n・UI 組み立て

- [ ] 8.1 i18n ロケールに RPS キーを追加する
  - `pkgs/app/src/i18n/locales/ja.ts` と `en.ts` に `rps.*` キーグループを追加
  - MoveSelector・CommitButton・RevealButton・WaitingState・ResultDisplay が使用するすべてのテキスト（手の名前・ローディングテキスト・待機メッセージ・勝利 / 敗北 / 引き分けメッセージ・エラーメッセージ）をカバーすること
  - i18next の型チェックがエラーなく通ること
  - _Requirements: 8_
  - _Boundary: pkgs/app/src/i18n/_

- [ ] 8.2 RpsGame/index.tsx を作成する
  - `pkgs/app/src/components/RpsGame/index.tsx` を新規作成
  - `useRpsGame()` を呼び出し、`status` に応じて子コンポーネントを切り替えるロジックを実装（デザイン仕様の 7 ケース分岐に準拠）
  - contractAddress 入力フォーム + Join ボタン・エラーバナー + リトライを含む
  - CounterSection と同一の shadcn/ui Card レイアウトを踏襲すること
  - _Requirements: 5, 6, 7, 8_
  - _Depends: Task 7_
  - _Boundary: pkgs/app/src/components/RpsGame/_

- [ ] 8.3 App.tsx に RpsGame セクションを追加する
  - `pkgs/app/src/App.tsx` を編集し `<CounterSection />` の下に `<RpsGame />` を追加
  - `WalletContext` の `connected` 状態のときのみ RpsGame を表示（CounterSection と同じ条件分岐）
  - ブラウザで RpsGame セクションが `<CounterSection />` の下に表示されること
  - _Requirements: 5_
  - _Depends: Task 8.2_
  - _Boundary: pkgs/app/src/_

---

## Task 9: テスト

- [ ] 9.1 コントラクトシミュレーターテストを作成する
  - `pkgs/contract/src/test/rps-simulator.ts` を新規作成（既存の `counter-simulator.ts` を雛形として参照）
  - `who_wins()` の 9 通りの手の組み合わせをすべてテスト（Req 3.1, 3.2）
  - `make_commit()` の hiding / binding 特性テスト（同じ move + salt → 同じ hash；異なる salt → 異なる hash）
  - 二重コミット（Req 1.4）・二重リビール（Req 2.5）の assert が発火することをテスト
  - `npx vitest run` でシミュレーターテストがすべてパスすること
  - _Requirements: 1, 2, 3, 4_
  - _Depends: Task 1_
  - _Boundary: pkgs/contract/src/test/_

- [ ] 9.2 CLI 統合テストを作成する
  - `pkgs/cli/src/test/rps.api.test.ts` を新規作成（既存の `counter.api.test.ts` を雛形として参照）
  - testcontainers で `DockerComposeEnvironment`（`standalone.yml`）を起動し、2 プレイヤー（別 `accountId`）による完全ゲームフローを実行
  - P1: rock, P2: paper → `result = player2_wins` を検証（Req 3.1）
  - P1: rock, P2: rock → `result = draw` を検証（Req 3.2）
  - P1 が commit 後に再 commit 試行 → TX 拒否を検証（Req 1.4）
  - `npx vitest run rps.api.test` でテストがパスすること（Docker 環境が必要）
  - _Requirements: 1, 2, 3, 9_
  - _Depends: Task 5_
  - _Boundary: pkgs/cli/src/test/_

- [ ]* 9.3 useRpsGame フックの単体テストを作成する（オプション）
  - `pkgs/app/src/hooks/useRpsGame.test.ts` を新規作成
  - `renderHook` で idle → joining → joined → committing → committed → revealing → finished の状態遷移をテスト
  - `committing` 状態中は `status === "committing"` が true であり、commit ボタンが無効化されること（Req 5.3）
  - `createRpsProviders` が Counter 版と異なる zkConfigPath（`/managed/rps`）を返すことを確認
  - _Requirements: 5, 6, 7_
  - _Depends: Task 6_
  - _Boundary: pkgs/app/src/hooks/_

## Task 10: UIデザインアップグレード
- [] 10.1 UIデザインをアップグレードする
  - 1. デザイントークン（最重要）
    - Design Tokens 
      Use these exact CSS variables (already in index.css):
      ```css
      --bg: #0a0a0f
      --card: #12121a  
      --border: #1e1e2e
      --primary: #a855f7   /* violet — commit actions */
      --cyan: #22d3ee      /* cyan — reveal actions, success states */
      --fg: #f8fafc
      --muted: #94a3b8
      --radius: 14px
      --sans: 'Geist Variable'
      --mono: 'Geist Mono'
      ```
    - Card style:   
      bg rgba(18,18,26,0.85) · backdrop-blur-24 · border 1px rgba(255,255,255,0.08) · border-radius 20px

  - 2. コンポーネント仕様
    - RPS UI Components
      - MoveCard (Rock/Scissors/Paper selector)
      - 3 equal-width flex cards in a row
      - Selected state: colored border + background glow + checkmark badge (top-right)
      - Colors per move: rock=#a855f7, scissors=#22d3ee, paper=#f472b6
      - Hover: translateY(-2px) + box-shadow glow
      - Disabled when ZK proof is generating
    - ZK Commit State (during proof generation)
      - Show selected move icon in a panel with purple border
      - Animate a horizontal scan line (top→bottom, 1.5s loop) to convey "sealing"
      - Show progress bar: linear-gradient(#a855f7 → #22d3ee) animating left→right
      - Label: "Generating ZK Proof..." in monospace
    - SealedMove (after commit, while waiting)
      - Shield icon with "ZK" text inside
      - Scan line animation (same as above, ongoing)
      - Text: "Your move is sealed · commitment hash · ZK sealed" in mono
    - OpponentStatus
      - 3 states: waiting (gray dot) / committed (cyan check) / revealed (move icon in color)
      - Animated dots when waiting
    - RevealButton
      - Cyan gradient: linear-gradient(#22d3ee, #0ea5e9) 
      - Black text (not white) for contrast
      - Only appears when BOTH players committed
    - ResultDisplay
      - Large colored banner (win=cyan, lose=pink, draw=cyan)
      - Side-by-side P1 vs P2 move cards with "WINNER" label
      - "Play Again" button in violet gradient

  - 3. ゲームフロー＆ステート
    - Game State Machine

      ```ts
      type GamePhase = 
        | 'select'      // Choose rock/scissors/paper
        | 'commit'      // ZK proof generating (3s)  
        | 'committed'   // Waiting for opponent commit
        | 'revealing'   // ZK reveal proof generating (3s)
        | 'result'      // Show winner

      type OpponentStatus = 'waiting' | 'committed' | 'revealed'
      ```

    - Phase Progress Bar
      - 4 steps: Select → Commit → Reveal → Result
        - Completed: cyan fill + checkmark
        - Active: violet fill + number
        - Inactive: dark fill + number

    - Key UX Rules
      - Commit button disabled until move selected
      - Reveal button ONLY appears when opponentStatus === 'committed'
      - All buttons disabled during ZK proof generation
      - Chain polling indicator shown while waiting (spinner + mono text)
      - Toast notifications: commitOk / revealOk / errors (bottom-right, 3.2s)

  - 4. アニメーション指示
    - Animations
      - --zk-scan: position:absolute scan line, top:0%→100%, 1.5s ease-in-out infinite
        background: linear-gradient(90deg, transparent, var(--primary), transparent)
      - --progress-bar: width 0%→100% linear over 3s (ZK proof duration)
      - --fadeInUp: opacity 0→1 + translateY(16px→0), 0.4s ease
      - --star-twinkle: opacity 0.2→0.8→0.2, 2-5s per star (60 stars, fixed position)
      - --float: translateY 0→-6px→0, 3s ease-in-out infinite (logo only)
      - Toast: opacity 0 + translateY(16px) + scale(0.95) → 1/0/1, 0.3s ease

  - 5. 実装優先度
    - Implementation Priority
      - P0 (must match design exactly):
        - ZK scan line animation on commit/reveal states  
        - Move card color system (rock/scissors/paper → purple/cyan/pink)
        - Reveal button = cyan (not violet) — signals different action type
        - SealedMove component (ongoing shield while waiting)
      - P1 (important):
        - Phase progress bar with correct active/done/pending states  
        - Opponent status transitions (waiting→committed→revealed)
        - Toast system bottom-right
      - P2 (nice to have):
        - Stars background
        - Floating logo animation
        - Glassmorphism blur on cards

## Implementation Notes

- Task 1.1: コンパイラは 0.22.0 のため pragma を `<= 0.21` から `<= 0.22` に変更が必要。設計仕様の `<= 0.21` はコンパイラ更新前の記述。他のコントラクト（counter.compact）の pragma も同様に更新が必要な場合は確認すること。
- Task 1.1: vitest はプロジェクトの node_modules に未インストール。`bun add -d vitest --cwd pkgs/contract` で追加済み。
