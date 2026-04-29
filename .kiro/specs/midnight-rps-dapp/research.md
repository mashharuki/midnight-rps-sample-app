# ギャップ分析: midnight-rps-dapp

**分析日**: 2026-04-29  
**フェーズ**: 要件生成済み（デザイン生成前）  
**言語設定**: ja

---

## デザイン合成決定事項（2026-04-29 追記）

### Compact 言語調査結果

MCP `midnight-get-latest-syntax` と `midnight-search-compact` による調査で以下を確認：

| 調査項目 | 結果 |
|---|---|
| ハッシュ関数 | `persistentHash<Vector<2, Bytes<32>>>([a, b])` を使用 |
| 公開鍵導出 | `public_key()` は builtin ではない → `persistentHash` でドメイン分離ハッシュ |
| `disclose` の使い方 | witness 値を条件分岐・台帳書き込みに使う前に必須 |
| `persistentCommit` | hiding commitment だが opaque → `make_commit` で検証不可のため不採用 |
| pure circuit 構文 | `pure circuit` (関数ではない) |
| enum アクセス | `Move.rock` (Rust スタイル `::` は構文エラー) |
| Uint→Bytes キャスト | 2 段 cast: `(m as Field) as Bytes<32>` |
| pragma | `>= 0.16 && <= 0.21` |

### Build vs. Adopt 決定

- **`persistentHash` を採用**: CompactStandardLibrary に含まれる、same-input = same-output 保証あり
- **`persistentCommit` を不採用**: opaque コミットメントであり `assert(computed == stored_commit)` のパターン検証に使えない
- **カスタム `make_commit` を実装**: `H(H(move_bytes), salt)` パターンで hiding + binding を実現
- **`crypto.getRandomValues`**: TypeScript 側 salt 生成に使用（`Math.random()` は禁止）

### 合成結果

1. **Generalization**: commit() / reveal() は同一 witness セット（sk, move, salt）を使う共通パターン → `make_commit` pure circuit に抽象化
2. **Simplification**: 別途 `RpsGameContext` は不要 → `useRpsGame` hook のみで管理
3. **secretKey 戦略**: 初期化時に `crypto.getRandomValues(32)` で生成し LevelDB に永続化。Lace 鍵への依存なし

---

## 分析サマリー

- **スコープ**: Counter サンプルを基盤に RPS コントラクト・React UI・CLI を追加する brownfield 拡張
- **最大の課題**: Compact 言語の commitment スキーム（`hash` 演算子）・`disclose` 演算子・`local_secret_key()` witness の具体的な実装パターンが未検証
- **推奨アプローチ**: ハイブリッド（Option C）— 新規ファイルを大量作成し、既存ファイルは最小限に拡張
- **工数見積もり**: L（1〜2 週間）
- **リスク評価**: High — ZK 回路設計・witness 永続化パターンに未知部分が多い

---

## 1. 現状調査

### 1.1 既存コードベース構造

```
pkgs/
├── contract/
│   └── src/
│       ├── counter.compact          ← 既存: 14行のシンプルなコントラクト
│       ├── managed/counter/         ← compactc 生成の ZK キー・TS 型
│       ├── witnesses.ts             ← Counter witness（空実装、空 vacantWitnesses）
│       └── index.ts                 ← パッケージエクスポート
├── app/src/
│   ├── lib/
│   │   ├── counter.ts               ← joinCounterContract / incrementCounter / subscribeToCounterState
│   │   ├── counter-types.ts         ← CounterCircuits / CounterProviders / DeployedCounterContract
│   │   └── providers.ts             ← createCounterProviders（Lace 接続から全プロバイダを構築）
│   ├── hooks/useCounter.ts          ← join / increment / subscribe パターン（再利用可能）
│   ├── components/CounterSection.tsx← Card + Button + input の完成形 UI
│   └── i18n/locales/ja.ts, en.ts    ← i18n 構造（counter.* キー追加済み）
└── cli/src/
    ├── api.ts                        ← deploy / join / increment / displayCounterValue
    ├── cli.ts                        ← 対話型メニュー（wallet→deploy→counter ループ）
    ├── common-types.ts               ← CounterCircuits / CounterProviders など
    └── test/counter.api.test.ts      ← Vitest + testcontainers 統合テストパターン
```

### 1.2 再利用できるパターン

| パターン | ファイル | RPS への転用 |
|---|---|---|
| Compact コントラクト構造 | `counter.compact` | `rps.compact` の雛形（ledger/circuit 構造） |
| `CompiledContract.make` + `withVacantWitnesses` | `counter.ts:16-21` | `rpsContractInstance` で同一パターン |
| `findDeployedContract` 接続パターン | `counter.ts:33-47` | `joinRpsContract` で流用 |
| `contractStateObservable` → RxJS map | `counter.ts:89-99` | `subscribeToRpsState` で流用（台帳フィールドが複数になる） |
| `FetchZkConfigProvider` + `httpClientProofProvider` | `providers.ts:79-98` | path を `/managed/rps` に変更するだけ |
| `levelPrivateStateProvider` | `providers.ts:88-91` | `RpsPrivateState` 向けに accountId/password を変更 |
| useCounter ステートマシン | `useCounter.ts` | `useRpsGame` の状態遷移設計の雛形 |
| CounterSection UI パターン | `CounterSection.tsx` | カード・ローディング・エラー表示の雛形 |
| testcontainers 統合テスト | `test/counter.api.test.ts` | `test/rps.api.test.ts` の雛形 |

### 1.3 アーキテクチャ制約

- **ZK キー**: `compactc rps.compact` 実行後に `managed/rps/` が生成され、そのキーを `app/public/managed/rps/` へコピーしてから `FetchZkConfigProvider` が機能する
- **PrivateStateProvider**: `levelPrivateStateProvider` はアカウント ID と名前空間でスコープされるため、Counter と RPS は干渉しない
- **WalletContext**: Lace 接続・`coinPublicKey`・`encPublicKey` を提供する既存 Context をそのまま使用できる（変更不要）
- **Sonner トースト**: 既に `main.tsx` に `<Toaster>` 設置済み。エラー表示は `toast.error()` で即使える
- **i18n**: `useTranslation()` + `t("key")` パターンが確立。`ja.ts` / `en.ts` に RPS キーを追加するだけ

---

## 2. 要件フィージビリティ分析

### 2.1 要件→技術資産マッピング

| 要件 | 必要な技術 | 現状 | ギャップ |
|---|---|---|---|
| 要件 1: commit 登録 | `rps.compact` commit() 回路 + ZK 証明 | counter.compact で基本回路パターンあり | **Missing**: commit() 回路、hash 演算子の使い方、コミットメントスキーム実装 |
| 要件 2: reveal + ZK 検証 | `rps.compact` reveal() 回路 + disclose 演算子 | なし | **Missing**: reveal() 回路、disclose 演算子、commit 検証ロジック |
| 要件 3: 勝敗判定 | `who_wins` pure circuit + 台帳書き込み | なし | **Missing**: `who_wins` ロジック、自動結果確定処理 |
| 要件 4: 不正防止 | ZK 証明による binding + `local_secret_key()` witness | なし | **Missing**: 秘密鍵 witness 実装、プレイヤー識別メカニズム |
| 要件 5: 手の選択・コミット UI | React コンポーネント + useRpsGame hook | useCounter パターンあり | **Missing**: MoveSelector, CommitButton, useRpsGame |
| 要件 6: ゲーム状態表示 | RxJS Observable 購読 + リアルタイム更新 | subscribeToCounterState パターンあり | **Missing**: subscribeToRpsState（複数フィールド）、WaitingState コンポーネント |
| 要件 7: リビール UI | RevealButton + ローディング状態 | Counter の incrementing 状態パターンあり | **Missing**: RevealButton コンポーネント |
| 要件 8: ゲーム結果表示 | ResultDisplay + i18n | i18n 機構あり | **Missing**: ResultDisplay、RPS 用 i18n キー |
| 要件 9: CLI 操作 | deployRps / commitRps / revealRps API | deploy / increment パターンあり | **Missing**: RPS 専用 API、RPS CLI メニュー、rps.api.test.ts |
| 要件 10: パフォーマンス | ZK < 10 秒、TX < 30 秒 | Counter でも同じ制約（インフラ側の問題） | **Unknown**: RPS 回路の ZK 生成時間（commit+reveal で Counter より重い可能性） |

### 2.2 未知事項（Research Needed）

1. **`Research Needed`: Compact `hash` 演算子の構文**
   - `CompactStandardLibrary` に含まれるハッシュ関数の正確な名前・シグネチャが不明
   - `make_commit(m, salt) = hash(hash(move), salt)` の実装にこの情報が必須

2. **`Research Needed`: `disclose` 演算子の使い方**
   - reveal() 回路で `p1_move = disclose(my_move)` として台帳に書き込む方法
   - `disclose` が Compact 0.20+ で有効かどうかの確認

3. **`Research Needed`: `local_secret_key()` witness の実装**
   - プレイヤーを一意識別する 32 バイト秘密鍵をどこから生成するか
   - Lace Wallet の `coinPublicKey` や `encryptionPublicKey` を使うのか
   - LevelDB の `privateState` に保存するランダム鍵を生成するのか
   - `levelPrivateStateProvider` が RPS の private state に安全にアクセスできるか

4. **`Research Needed`: commit〜reveal 間の move+salt の永続化**
   - `store_move_and_salt(m, s)` witness で移動・塩をローカル保存する方法
   - `RpsPrivateState` の型と `levelPrivateStateProvider` の関係
   - Counter の `{ privateCounter: 0 }` に相当する RPS 初期 private state の構造

5. **`Research Needed`: RPS 回路の ZK 生成時間**
   - commit/reveal 両回路は Counter の increment より複雑（hash 演算、条件分岐）
   - 要件 10 の「< 10 秒」を満たせるか、ローカル Proof Server での実測が必要

---

## 3. 実装アプローチ検討

### Option A: 既存コンポーネントの拡張のみ

**対象**: `counter.compact` に RPS 状態を追加、`api.ts` に RPS 関数を追加、`useCounter.ts` を拡張

**評価**:
- ✅ ファイル数が増えない
- ❌ 全く別のコントラクト（台帳 13 フィールド vs 1 フィールド）を既存ファイルに混在させると可読性・保守性が著しく低下
- ❌ Counter の tests が RPS 変更の影響を受けるリスク
- ❌ `useCounter.ts` のステートマシンが RPS の複雑な状態遷移を扱えない
- **→ 非推奨**

### Option B: 全て新規ファイル作成

**対象**: RPS 関連の全ファイルを新規作成、既存ファイルは一切変更しない

**評価**:
- ✅ 完全な分離。Counter への影響ゼロ
- ✅ テストが容易
- ❌ `App.tsx` と `providers.ts`（createRpsProviders の追加）など最低限の変更は避けられない
- ❌ i18n ファイルは既存構造に追記するのが自然
- **→ 部分的に採用**

### Option C: ハイブリッドアプローチ（推奨）

**新規作成（RPS 専用）**:

| ファイル | 理由 |
|---|---|
| `pkgs/contract/src/rps.compact` | 独立したコントラクト。Counter とは台帳・回路が全く異なる |
| `pkgs/contract/src/rps-witnesses.ts` | RPS 専用の witness 実装（move+salt 永続化ロジック） |
| `pkgs/app/src/lib/rps.ts` | Counter と同構造だが circuit 名・ledger 型が完全に異なる |
| `pkgs/app/src/lib/rps-types.ts` | RpsCircuits / RpsProviders / DeployedRpsContract |
| `pkgs/app/src/hooks/useRpsGame.ts` | 5 状態ステートマシン（idle/joining/committed/revealing/finished） |
| `pkgs/app/src/components/RpsGame/index.tsx` | RPS ゲームルートコンポーネント |
| `pkgs/app/src/components/RpsGame/MoveSelector.tsx` | グー・チョキ・パー選択 UI |
| `pkgs/app/src/components/RpsGame/CommitButton.tsx` | コミット送信 + ローディング |
| `pkgs/app/src/components/RpsGame/RevealButton.tsx` | リビール送信 + ローディング |
| `pkgs/app/src/components/RpsGame/ResultDisplay.tsx` | 両者の手 + 結果表示 |
| `pkgs/app/src/components/RpsGame/WaitingState.tsx` | 相手のアクション待機表示 |
| `pkgs/cli/src/test/rps.api.test.ts` | 2 プレイヤー統合テスト |

**最小限の拡張（既存ファイル）**:

| ファイル | 変更内容 |
|---|---|
| `pkgs/contract/src/index.ts` | RPS エクスポートを追加 |
| `pkgs/app/src/lib/providers.ts` | `createRpsProviders()` 関数を追加（zkConfigPath のみ変更） |
| `pkgs/app/src/App.tsx` | `<RpsGame />` セクションを追加 |
| `pkgs/app/src/i18n/locales/ja.ts` | `rps.*` キーを追加 |
| `pkgs/app/src/i18n/locales/en.ts` | `rps.*` キーを追加 |
| `pkgs/cli/src/api.ts` | `deployRps` / `joinRps` / `commitRps` / `revealRps` を追加 |
| `pkgs/cli/src/common-types.ts` | RPS 型定義を追加 |
| `pkgs/cli/src/cli.ts` | RPS メニューを追加 |
| `package.json` (root) | `sync-keys-rps` スクリプトを追加 |

**トレードオフ**:
- ✅ Counter 実装への影響を最小化（変更は追記のみ）
- ✅ RPS ファイルは独立してテスト・レビュー可能
- ✅ 既存の WalletContext・Sonner・i18n インフラを最大限再利用
- ❌ ファイル数が約 13 個増加（ナビゲーションコスト）
- ❌ ZK キーのビルド手順が 2 系統（Counter + RPS）になる

---

## 4. 工数・リスク評価

### 工数

| 領域 | 工数 | 根拠 |
|---|---|---|
| Compact コントラクト設計・実装 | M（3〜7 日） | hash/disclose 演算子の学習コスト、commit+reveal 回路の ZK 設計が新規 |
| `compactc` コンパイル・ZK キー生成 | S（0.5〜1 日） | ツールチェーン手順は既存 Counter で確立済み |
| TypeScript API 層（rps.ts / rps-types.ts） | S（1〜2 日） | counter.ts を雛形に流用可能 |
| React hooks / コンポーネント（6 ファイル） | M（3〜5 日） | 状態マシンが Counter より複雑（5 状態）、MoveSelector の UX 設計を含む |
| i18n・providers 更新 | S（0.5〜1 日） | キー追加のみ |
| CLI 拡張（api.ts + cli.ts） | S（1〜2 日） | deploy/increment パターンを RPS 向けに複製 |
| 統合テスト（rps.api.test.ts） | S〜M（1〜3 日） | 2 プレイヤー分の wallet が必要でテスト設計が複雑 |
| **合計** | **L（1〜2 週間）** | |

### リスク

| リスク | レベル | 詳細 |
|---|---|---|
| Compact `hash` / `disclose` 演算子の構文不明 | High | CompactStandardLibrary の API を設計フェーズで調査必須 |
| `local_secret_key()` の実装方法 | High | Lace Wallet の鍵か独立した乱数か未決定。プレイヤー識別の根幹に関わる |
| commit〜reveal 間の private state 永続化 | High | levelPrivateStateProvider での move+salt 保持方法が未検証 |
| RPS 回路の ZK 生成時間が 10 秒超え | Medium | commit/reveal は Counter increment より重い。実測前は不明 |
| 2 プレイヤー統合テストの wallet 管理 | Medium | counter.test は 1 wallet のみ。RPS は genesis seed を 2 系統用意する必要あり |

---

## 5. デザインフェーズへの推奨事項

### 優先調査項目（デザインフェーズで必須）

1. **Compact 標準ライブラリの hash API**
   - `CompactStandardLibrary` に含まれるハッシュ関数の正確なシグネチャ
   - `make_commit = hash(hash(move_as_bytes), salt)` の実装可能性確認

2. **`disclose` 演算子の使用法**
   - `p1_move = disclose(my_move)` の正確な Compact 構文
   - 台帳フィールドへの書き込みと `disclose` の関係

3. **witness での private state 設計**
   - `store_move_and_salt` の実装: TypeScript の `levelPrivateStateProvider` でどう永続化するか
   - `local_secret_key()` の生成戦略: 乱数を private state に保存 or Lace の鍵を流用

4. **RPS ZK 証明の生成時間の実測**
   - ローカル Proof Server（`midnightntwrk/proof-server:8.0.3`）で commit/reveal 各回路のベンチマーク

### 推奨アプローチ

**Option C（ハイブリッド）を採用**し、以下の順で実装する：

```
Phase 1: rps.compact + compactc コンパイル（最初にやる。ZK キーがないと何も動かない）
Phase 2: rps.ts / rps-types.ts / providers.ts 拡張（コントラクトと並行可能）
Phase 3: useRpsGame + RpsGame コンポーネント群（API 層の完成後）
Phase 4: CLI 拡張 + 統合テスト（コントラクト + API の完成後）
Phase 5: i18n / sync-keys-rps / App.tsx 統合（最後の仕上げ）
```

### 持ち越しリサーチ

デザインドキュメントで以下を決定すること：

- `RpsPrivateState` の型定義（`secretKey`, `myMove`, `mySalt` + 型の詳細）
- `local_secret_key()` witness の実装戦略（推奨: 初回起動時に 32 バイトランダム生成 → private state に永続化）
- `compactc` が提供する hash 演算子名と引数型
- commit〜reveal 間の状態管理: `localStorage` のみで十分か、`levelPrivateStateProvider` が必要か
