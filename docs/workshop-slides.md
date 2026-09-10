---
marp: true
theme: midnight-dark
paginate: true
size: 16:9
html: true
style: |
  /* @theme midnight-dark
     Dark, monochrome-first theme for the Midnight workshop deck.
     Black & white base with a single violet accent + semantic colors.
  */

  /* =========================================
     Base
     ========================================= */
  section {
    --accent:      #a78bfa;
    --accent-warm: #fbbf24;
    --success:     #34d399;
    --danger:      #f87171;
    --dark:        #000000;
    --dark-2:      #131318;
    --muted:       #9494a3;
    --border:      #2b2b35;
    --bg-subtle:   #131318;

    width: 1280px;
    height: 720px;
    box-sizing: border-box;
    font-family: 'Hiragino Sans', 'BIZ UDGothic', 'Yu Gothic Medium',
                 'Noto Sans JP', 'Segoe UI', -apple-system, sans-serif;
    background: #08080b;
    color: #f2f2f5;
    padding: 48px 72px 58px;
    font-size: 24px;
    line-height: 1.65;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  /* Gradient top bar on all slides */
  section::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: linear-gradient(90deg, var(--accent), var(--accent-warm));
  }

  /* Page number */
  section::after {
    font-size: 0.5em;
    color: var(--muted);
    bottom: 20px;
    right: 40px;
    letter-spacing: 0.04em;
  }

  /* =========================================
     Typography
     ========================================= */
  h1 {
    font-size: 2.0em;
    font-weight: 800;
    color: #f8f8fa;
    margin: 0 0 14px;
    line-height: 1.2;
    letter-spacing: -0.02em;
  }

  h2 {
    font-size: 1.45em;
    font-weight: 700;
    color: #f8f8fa;
    margin: 0 0 18px;
    padding-bottom: 10px;
    border-bottom: 3px solid var(--accent);
    line-height: 1.3;
  }

  h3 {
    font-size: 1.05em;
    font-weight: 600;
    color: var(--accent);
    margin: 14px 0 8px;
  }

  p { margin: 8px 0; }

  /* Lists */
  ul, ol { margin: 8px 0; padding-left: 1.4em; }
  li { margin: 5px 0; }
  ul > li::marker { color: var(--accent); font-size: 1.1em; }
  ol > li::marker { color: var(--accent); font-weight: 700; }

  /* Emphasis — use to draw attention to key terms */
  strong { color: var(--accent); font-weight: 700; }
  em     { color: var(--accent-warm); font-style: normal; font-weight: 600; }

  /* =========================================
     Code
     ========================================= */
  code {
    font-family: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace;
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 0.82em;
    color: #5eead4;
  }

  pre {
    background: #000000;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 18px 22px;
    margin: 10px 0;
    flex-shrink: 0;
  }

  pre code {
    background: none;
    border: none;
    color: #e5e5ea;
    padding: 0;
    font-size: 0.75em;
    line-height: 1.6;
  }

  /* =========================================
     Table
     ========================================= */
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 10px 0;
    font-size: 0.88em;
    background: transparent;
  }

  th {
    background: var(--accent);
    color: #08080b;
    padding: 8px 14px;
    text-align: left;
    font-weight: 700;
  }

  td {
    padding: 7px 14px;
    border-bottom: 1px solid var(--border);
    color: #e5e5ea;
    background: #08080b;
  }

  tr:nth-child(even) td { background: var(--bg-subtle); }

  /* =========================================
     Blockquote
     ========================================= */
  blockquote {
    border-left: 4px solid var(--accent);
    background: var(--bg-subtle);
    margin: 10px 0;
    padding: 10px 18px;
    border-radius: 0 6px 6px 0;
    color: var(--muted);
    font-size: 0.95em;
  }

  hr {
    border: none;
    border-top: 2px solid var(--border);
    margin: 16px 0;
  }

  /* =========================================
     Slide Class Variants
     ========================================= */

  /* --- title: Cover slide --- */
  section.title {
    background:
      radial-gradient(ellipse 60% 50% at 25% 15%, rgba(167,139,250,0.28), transparent 60%),
      linear-gradient(160deg, #000000 0%, #0a0a10 55%, #000000 100%);
    color: white;
    justify-content: flex-end;
    padding-bottom: 64px;
  }

  section.title::before { height: 6px; }

  section.title h1 {
    color: white;
    font-size: 2.4em;
    letter-spacing: -0.03em;
    max-width: 86%;
    border-bottom: none;
    margin-bottom: 0;
  }

  section.title h2 {
    color: rgba(255,255,255,0.65);
    font-size: 1.0em;
    font-weight: 400;
    border-bottom: none;
    margin-top: 12px;
  }

  section.title p {
    color: rgba(255,255,255,0.45);
    font-size: 0.8em;
    margin-top: 28px;
  }

  /* --- section: Chapter break slide --- */
  section.section {
    background: linear-gradient(135deg, #5b21b6 0%, #1e1033 65%, #000000 100%);
    color: white;
    justify-content: center;
  }

  section.section::before {
    background: rgba(255,255,255,0.25);
  }

  section.section h2 {
    color: white;
    font-size: 2.0em;
    border-bottom: 2px solid rgba(255,255,255,0.4);
    padding-bottom: 12px;
  }

  section.section p {
    color: rgba(255,255,255,0.8);
    font-size: 0.9em;
  }

  /* --- lead: Centered key message --- */
  section.lead {
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  section.lead h1 {
    font-size: 2.5em;
    border-bottom: none;
  }

  section.lead h2 {
    border-bottom: none;
    color: var(--muted);
    font-weight: 400;
  }

  /* --- dark: Deepest-black accent slide (code showcase etc.) --- */
  section.dark {
    background: #000000;
    color: #e5e5ea;
  }

  section.dark h1 { color: white; }

  section.dark h2 {
    color: white;
    border-color: var(--accent);
  }

  section.dark code {
    background: #131318;
    border-color: #2b2b35;
    color: #5eead4;
  }

  section.dark td { border-color: #2b2b35; }
  section.dark tr:nth-child(even) td { background: #131318; }
  section.dark blockquote { background: #131318; }

  /* --- ending: Thank you / closing slide --- */
  section.ending {
    background:
      radial-gradient(ellipse 60% 50% at 75% 85%, rgba(167,139,250,0.25), transparent 60%),
      linear-gradient(160deg, #000000 0%, #0a0a10 100%);
    color: white;
    justify-content: center;
    align-items: center;
    text-align: center;
  }

  section.ending::before { height: 6px; }

  section.ending h1 {
    color: white;
    font-size: 2.8em;
    border-bottom: none;
    margin-bottom: 12px;
  }

  section.ending h2 {
    color: rgba(255,255,255,0.65);
    border-bottom: none;
    font-weight: 400;
    font-size: 1.0em;
  }

  section.ending p {
    color: rgba(255,255,255,0.45);
    font-size: 0.82em;
    margin-top: 20px;
  }

  /* =========================================
     Layout Components
     (use inside HTML <div> elements)
     ========================================= */

  /* Two-column grid */
  .columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 36px;
    align-items: start;
  }

  .columns.col-3    { grid-template-columns: 1fr 1fr 1fr; gap: 24px; }
  .columns.col-6-4  { grid-template-columns: 3fr 2fr; }
  .columns.col-4-6  { grid-template-columns: 2fr 3fr; }
  .columns.middle   { align-items: center; }

  /* Card */
  .card {
    background: var(--bg-subtle);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 14px 18px;
    margin: 6px 0;
    color: #e5e5ea;
  }

  .card.accent  { border-left: 4px solid var(--accent);      background: rgba(167,139,250,0.08); }
  .card.warn    { border-left: 4px solid var(--accent-warm); background: rgba(251,191,36,0.08); }
  .card.success { border-left: 4px solid var(--success);     background: rgba(52,211,153,0.08); }
  .card.danger  { border-left: 4px solid var(--danger);      background: rgba(248,113,113,0.08); }

  /* Highlight box — key messages */
  .highlight {
    background: linear-gradient(135deg, rgba(167,139,250,0.16), rgba(251,191,36,0.08));
    border: 1px solid rgba(167,139,250,0.35);
    border-radius: 10px;
    padding: 14px 22px;
    font-size: 1.05em;
    font-weight: 600;
    text-align: center;
    margin: 10px 0;
    color: #f8f8fa;
  }

  /* Big number / metric */
  .number {
    font-size: 2.8em;
    font-weight: 800;
    color: var(--accent);
    line-height: 1.0;
    display: block;
    letter-spacing: -0.03em;
  }

  .number.warm { color: var(--accent-warm); }

  /* Tag / badge */
  .tag {
    display: inline-block;
    background: var(--accent);
    color: #08080b;
    font-size: 0.6em;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 999px;
    vertical-align: middle;
    letter-spacing: 0.03em;
    margin: 0 3px;
  }

  .tag.warm    { background: var(--accent-warm); color: #08080b; }
  .tag.success { background: var(--success); color: #08080b; }
  .tag.danger  { background: var(--danger); color: #08080b; }
  .tag.outline { background: none; border: 1.5px solid var(--accent); color: var(--accent); }

  /* Icon row — emoji + label */
  .icons {
    display: flex;
    gap: 20px;
    justify-content: center;
    align-items: flex-start;
    margin: 16px 0;
  }

  .icon-item { text-align: center; flex: 1; }
  .icon-item .icon  { font-size: 2.2em; display: block; margin-bottom: 6px; }
  .icon-item .label { font-size: 0.75em; font-weight: 600; color: var(--muted); }

  /* Progress bar */
  .progress {
    height: 8px;
    background: var(--border);
    border-radius: 4px;
    overflow: hidden;
    margin: 6px 0 12px;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), var(--accent-warm));
    border-radius: 4px;
  }

  /* Step list — numbered steps with visual treatment */
  .steps { counter-reset: step; }
  .step {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    margin: 10px 0;
    color: #e5e5ea;
  }
  .step::before {
    counter-increment: step;
    content: counter(step);
    background: var(--accent);
    color: #08080b;
    font-weight: 700;
    font-size: 0.85em;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 2px;
  }
  .step strong { color: var(--accent); }
  .step code {
    background: #08080b;
    border-color: var(--border);
  }
---

<!-- _class: title -->

# Midnight ハンズオンワークショップ
## ゼロ知識証明で作る、後出し不可能なジャンケンdApp

2026-09 · midnight-rps-sample-app

---

## 本日のゴールとアジェンダ

<div class="highlight">
🎯 Midnight上でZK commit-revealを使ったdAppを、自分の手で動かす
</div>

1. **Midnightの概要・アーキテクチャ**
2. **ゼロ知識証明(ZK)の基礎**
3. **MidnightでdAppを作るための4要素**
4. **今日作るもの：Midnight RPS dApp**
5. **ハンズオン**

---

<!-- _class: section -->

## 01　Midnightの概要・アーキテクチャ

プライバシーを第一級市民として扱うブロックチェーン

---

## Midnightとは

- **プライバシー特化**のパブリックブロックチェーン
- Cardanoエコシステムの**パートナーチェーン**として稼働
- スマートコントラクトの**入力・ロジックを秘匿**しつつ、結果は誰でも検証可能
- ネイティブ言語 **Compact** でZK回路を記述する
- テストネット：**Preprod** / **Preview**、ネイティブトークン **tNight**

<span class="tag">Cardano Partner Chain</span><span class="tag warm">ZK-native</span><span class="tag success">Compact</span>

---

## なぜプライバシーが必要か

<div class="columns">
<div class="card danger">

### 一般的なパブリックチェーン
- 残高・取引履歴が**誰でも閲覧可能**
- コントラクトへの**入力値も丸見え**
- 企業利用・金融・ゲームでは致命的

</div>
<div class="card success">

### Midnightの答え
- 何を**公開**し何を**秘匿**するか設計できる
- ロジックの正しさは**ZK証明**で保証
- 「見せずに証明する」を標準機能に

</div>
</div>

---

## Midnightのアプローチ：選択的開示

- コントラクト開発者が**公開する情報**を明示的に選ぶ
- 秘匿したいデータは **witness** としてローカルに保持
- オンチェーンには**ハッシュ値や証明**のみが記録される
- 本ワークショップの例：ジャンケンの手は**リビールするまで誰にも見えない**

<div class="highlight">
💡「全部隠す」でも「全部見せる」でもなく、必要な粒度で公開範囲を選べる
</div>

---

## 全体アーキテクチャ

<div class="icons">
<div class="icon-item"><span class="icon">🖥️</span><span class="label">Node</span></div>
<div class="icon-item"><span class="icon">📇</span><span class="label">Indexer</span></div>
<div class="icon-item"><span class="icon">🔐</span><span class="label">Proof Server</span></div>
<div class="icon-item"><span class="icon">👛</span><span class="label">Lace Wallet</span></div>
<div class="icon-item"><span class="icon">🌐</span><span class="label">dApp</span></div>
</div>

- **Node** — トランザクションの検証・ブロック生成
- **Indexer** — 台帳データを検索しやすい形でdAppに提供
- **Proof Server** — ZK証明の生成を担うオフチェーン計算機
- **Lace Wallet** — 秘密鍵管理・署名・shieldedアドレス
- **dApp（CLI／フロントエンド）** — ユーザー操作の入口

---

## shielded / unshielded という考え方

<div class="columns">
<div class="card accent">

### tNight（shielded token）
- Midnightの**ネイティブトークン**
- 保有量・移転を**秘匿可能**
- テストネットでは **faucet** から取得

</div>
<div class="card warn">

### DUST
- トランザクション実行に必要な**ガス的資源**
- tNight保有から**時間経過で生成**
- 証明生成・TX手数料に消費される

</div>
</div>

---

## Compact言語のポジション

- **回路（circuit）** と **台帳状態（ledger）** を1つのDSLで記述
- `compactc` コンパイラが **ZK鍵一式** と **TypeScript型** を生成
- Solidityとの違い：**秘密の入力（witness）** を第一級で扱う構文がある
- 本リポジトリ：`pkgs/contract/src/rps.compact`

```compact
export ledger p1_commit: Bytes<32>;

circuit commit(move: Field, salt: Field): [] {
  // ZK回路として証明可能な形でロジックを記述
}
```

---

<!-- _class: section -->

## 02　ゼロ知識証明（ZK）の基礎

「見せずに証明する」を可能にする暗号技術

---

## ゼロ知識証明とは

<div class="highlight">
🔑 秘密の情報を明かさずに、「その情報を知っている」ことだけを証明する技術
</div>

- 証明者（Prover）は**答えそのものを見せない**
- 検証者（Verifier）は**計算が正しいことだけ**を確認できる
- 数学的に、**偽の証明はほぼ100%の確率で失敗する**
- Midnightではこれを`compactc`が生成するZK回路が担う

---

## なぜdAppにZKが必要か

- ブロックチェーンの計算は本来**全ノードが再実行して検証**する
- 秘密の入力（自分の手・残高など）を使う処理は、そのままでは**公開が必須**になる
- ZK証明があれば：**秘密の入力で計算 → 結果の正しさだけを公開**
- 本ワークショップの適用先：**「自分の手」を明かさずに勝敗を検証する**

---

## コミット・リビール方式 + ZK

<div class="steps">
<div class="step"><strong>Commit</strong> — 手とsaltをハッシュ化しon-chainに送信（ZK証明つき）</div>
<div class="step"><strong>待機</strong> — 相手もコミットするまで、手は誰にも分からない</div>
<div class="step"><strong>Reveal</strong> — 手とsaltを公開し、ハッシュが一致することを検証</div>
<div class="step"><strong>Settle</strong> — コントラクトが勝敗を判定し記録</div>
</div>

---

## 証明生成の流れ

<div class="columns col-4-6 middle">
<div>

- `witness` — 秘密値（手・salt）をローカルから回路に渡す
- `circuit` — Compactで書かれたZKロジック
- Proof Serverが **証明（proof）** を生成
- ノードが **検証（verify）** しTXを承認

</div>
<div class="card accent">

**witness → circuit → proof → verify**

`rps-witnesses.ts` が `cli` / `app` 双方に秘密値を供給する

</div>
</div>

---

<!-- _class: section -->

## 03　MidnightでdAppを作るための4要素

フロントエンド・ウォレット・スマートコントラクト・Proof Server

---

## dApp構成要素の全体像

<div class="icons">
<div class="icon-item"><span class="icon">🌐</span><span class="label">① フロントエンド</span></div>
<div class="icon-item"><span class="icon">👛</span><span class="label">② ウォレット</span></div>
<div class="icon-item"><span class="icon">📜</span><span class="label">③ コントラクト</span></div>
<div class="icon-item"><span class="icon">🔐</span><span class="label">④ Proof Server</span></div>
</div>

<div class="highlight">
この4つが揃って初めてMidnight dAppは動く。次のスライドから1つずつ見ていく
</div>

---

## ① フロントエンド：Providerチェーン

- **Wallet Provider** → 署名・アドレス取得
- **Midnight Provider** → コントラクト呼び出しの基盤
- **ZK Config Provider** → 証明に必要な鍵・回路を取得
- **Proof Provider** → Proof Serverへ証明生成を依頼
- **Private / Public Data Provider** → 秘密状態（LevelDB）／台帳状態を管理

<div class="highlight">
6つのProviderを直列に組み合わせて、初めてコントラクトを呼び出せる
</div>

---

## ① フロントエンド：本リポジトリでの実例

<div class="columns">
<div class="card accent">

### `pkgs/app`
- React + Vite の**ブラウザdApp**
- **Lace Wallet**接続で署名
- 2ブラウザで対戦できる

</div>
<div class="card success">

### `pkgs/cli`
- Node.jsの**ヘッドレスCLI**
- **HDウォレット**を内蔵し署名
- ブラウザ不要で対戦・検証が可能

</div>
</div>

同じコントラクトに対する**2つの独立したフロントエンド**

---

## ② ウォレット（Lace Wallet）

- ブラウザ拡張機能として動作し、`@midnight-ntwrk/dapp-connector-api` 経由で接続
- **shieldedアドレス**を管理し、TXへの署名を担当
- dApp側は `connect(networkId)` でネットワーク一致を要求する
- 対応ネットワーク：**Preprod** / **Preview**（ワークショップ内で切り替え可能）

> `pkgs/cli`はLaceを使わず、内蔵HDウォレットで同等の役割を代替する

---

## ③ スマートコントラクト：ビルドフロー

<div class="steps">
<div class="step"><code>rps.compact</code> を記述 — ledger／circuit／witnessを定義</div>
<div class="step"><code>compactc</code> でコンパイル — ZK鍵（zkir/keys）+ TypeScript型を生成</div>
<div class="step">生成物を <code>managed/rps</code> として <code>cli</code>・<code>app</code> 双方にコピー</div>
<div class="step">ネットワーク非依存 — 一度コンパイルすれば全ネットワークで共用</div>
</div>

---

## ③ コントラクト：3つの構成要素

| 要素 | 役割 | 本リポジトリの例 |
|---|---|---|
| **ledger** | 公開状態（誰でも読める） | `p1_commit`, `game_over`, `result` |
| **circuit** | ZK証明可能なロジック | `commit()`, `reveal()` |
| **witness** | 秘密値の受け渡し | `rps-witnesses.ts`（手・salt） |

<div class="highlight">
ledgerは公開、witnessは秘密、circuitがその橋渡しを証明する
</div>

---

## ④ Proof Server — 他のチェーンにはない要素

| | Ethereum / Solana | Midnight |
|---|---|---|
| 計算の実行場所 | **オンチェーン**で直接実行 | **オフチェーン**のProof Serverで証明生成 |
| ノードの仕事 | 計算を**再実行**して検証 | 証明を**検証**するだけ |
| 秘密情報の扱い | 扱えない（全て公開） | **witnessとして秘匿**したまま計算 |
| dApp構成要素 | フロントエンド／ウォレット／コントラクト | 上記 + **Proof Server** |

<div class="highlight">
Proof ServerはMidnight特有の第4のインフラ要素
</div>

---

## ④ Proof Server の役割と配置

- ZK証明生成は **CPU負荷の高い処理** → オフチェーンに切り出す設計
- ローカル開発では **Docker** で起動する（`docker compose -f proof-server.yml up`）
- `cli` / `app` 双方が同じProof Serverを利用する
- ネットワークを切り替えても Proof Server の**再起動は不要**（ZK鍵はネットワーク非依存）

---

## ④ Proof Server：ハンズオンでの注意点

<div class="card warn">

- ポート **6300** に固定でバインドされる
- `isProofServerRunning()` が既存プロセスを検知し**二重起動を回避**
- 2回目以降は `bun cli preprod-ps` / `preview-ps` を使うと自動判定される

</div>

<div class="card danger">

- Devcontainer利用時は `proof-server.devcontainer.yml` を使うこと
- 通常のcompose起動だとネットワーク分離により `ECONNREFUSED` になる

</div>

---

## 4要素のまとめ

<div class="columns col-4-6 middle">
<div>

**フロントエンド**が呼び出し
→ **ウォレット**が署名
→ **コントラクト**がロジックを定義
→ **Proof Server**が証明を生成
→ ノードが検証しTX確定

</div>
<div class="card accent">

<span class="tag">Frontend</span>
<span class="tag success">Wallet</span>
<span class="tag warm">Contract</span>
<span class="tag outline">Proof Server</span>

</div>
</div>

<div class="highlight">
この一連の流れが、これから作るRPS dAppでそのまま体験できる
</div>

---

<!-- _class: section -->

## 04　ワークショップで作るもの

Midnight RPS dApp — ZK手役かくしジャンケン

---

## 今日作るもの：ZK手役かくしジャンケン

- グー・チョキ・パーを **2人のプレイヤー** で対戦
- 手は **コミット・リビール方式** で秘匿
- **後出し・覗き見が数学的に不可能**なフェアなゲーム
- デモ動画：[youtu.be/jmUyDCOBVCY](https://youtu.be/jmUyDCOBVCY)

<div class="highlight">
今日学んだZKの概念が、そのまま1本のゲームとして動く
</div>

---

## ゲームフロー

<div class="steps">
<div class="step"><strong>Commit Phase</strong> — 手+saltをハッシュ化してon-chain送信、ZK証明を生成</div>
<div class="step"><strong>（待機）</strong> — 両者がコミットするまで相手の手は不明</div>
<div class="step"><strong>Reveal Phase</strong> — 両者が手とsaltを公開し、ハッシュ一致を検証</div>
<div class="step"><strong>Settlement</strong> — <code>player1_wins</code> / <code>player2_wins</code> / <code>draw</code> を判定し記録</div>
</div>

---

## 本リポジトリのパッケージ構成

| Package | 役割 |
|---|---|
| `pkgs/contract` | Compactコントラクト + witness + Vitestテスト |
| `pkgs/shared` | RPS型・ネットワーク設定・通貨定数（cli/app共通） |
| `pkgs/cli` | HDウォレット内蔵のヘッドレスCLI |
| `pkgs/app` | Lace Wallet接続のReact + Viteブラウザアプリ |

`cli`と`app`は**同じコントラクト**に対する独立した2つのフロントエンド

---

## なぜ「後出し」できないのか

- コミット時に送信するのは **手+saltのハッシュ値** のみ
- ハッシュは**一方向関数** — 逆算して元の手を求めることは事実上不可能
- リビール時に手を変えると、**ハッシュが一致せず検証に失敗**する
- コントラクトが**数学的に不正を検出**するため、信頼できる第三者は不要

<div class="highlight">
「約束を破ったら即バレる」を暗号学的に保証する仕組み
</div>

---

## 今日のハンズオンの流れ

<div class="steps">
<div class="step"><strong>環境構築</strong> — <code>bun install</code> / <code>compact update 0.30.0</code></div>
<div class="step"><strong>コントラクトビルド</strong> — <code>bun contract compact</code> → <code>bun run build</code></div>
<div class="step"><strong>Proof Server起動</strong> — Docker Composeでローカル起動</div>
<div class="step"><strong>CLIで対戦</strong> — <code>bun cli preprod-ps</code> でデプロイ・commit・reveal</div>
<div class="step"><strong>（余裕があれば）ブラウザ対戦</strong> — 2つのLaceウォレットでリアルタイム対戦</div>
</div>

---

<!-- _class: ending -->

# ありがとうございました

## ご質問はいつでもどうぞ

github.com/mashharuki/midnight-rps-sample-app ・ docs.midnight.network
