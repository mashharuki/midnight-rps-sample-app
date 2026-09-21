# midnight-rps-sample-app

このプロジェクトは Midnight Network 上に構築されています。

> [!CAUTION]
> このワークショップで作成したウォレットおよび生成した秘密鍵はメインネットでは絶対に使わないようにしてください！

## デモ動画 - YouTube

[![サービス紹介動画](https://github.com/user-attachments/assets/e432744b-5752-4232-8e81-d8aab4451b07)](https://youtu.be/jmUyDCOBVCY)

## 概要

`midnight-rps-sample-app` は、プライバシー重視のブロックチェーンである Midnight 上に構築された、匿名じゃんけん dApp のサンプルプロジェクトです。

### 主な特徴

* **ゼロ知識証明（ZK Proof）を活用した公平なゲームプレイ**
  このアプリでは、Compact スマートコントラクトを利用した「Commit / Reveal」方式を採用しています。

  プレイヤーは、じゃんけんの手（グー・チョキ・パー）をソルトとともにハッシュ化した値として最初にコミットします。

  すべてのプレイヤーがコミットした後、それぞれの手を公開（Reveal）します。

  これにより、相手の手を見てから自分の手を変更する「後出し」のような不正ができない、公平で改ざん耐性のあるゲームを実現しています。

* **Midnight Blockchain を利用**
  スマートコントラクトは Midnight の PreProd テストネットへデプロイされ、すべてのトランザクションがオンチェーンに記録されます。

* **フルスタック構成**

  | パッケージ           | 役割                                   |
  | --------------- | ------------------------------------ |
  | `pkgs/contract` | Compact 言語で記述されたスマートコントラクト           |
  | `pkgs/shared`   | `cli` と `app` で共有するドメイン型、ネットワーク設定、定数 |
  | `pkgs/cli`      | コントラクトのデプロイおよび操作を行う CLI ツール          |
  | `pkgs/app`      | React + Vite で構築されたフロントエンド UI        |

* **Lace Wallet との統合**
  `@midnight-ntwrk/dapp-connector-api` を利用して Lace Wallet と接続し、安全な署名とトランザクション処理を行います。

### ゲームの流れ

1. **Commit フェーズ** — 各プレイヤーが、自分の手とソルトをハッシュ化した値としてブロックチェーンへコミットします（ZK Proof を生成）。
2. **Reveal フェーズ** — 両プレイヤーが、事前にコミットしていた手を公開します。
3. **Settlement（決着）** — コントラクトが結果（`player1_wins` / `player2_wins` / `draw`）を判定し、オンチェーンへ記録します。

## 前提条件

> このリポジトリのソースコードを動かすためには以下の準備が必要です！

※ Lace Walletについては作成後、しばらく同期する必要があるためセットアップに時間がかかります。

​- ご自身の端末にVSCodeのインストールすること
- GitHubアカウントの作成
- ご自身の端末にDocker Desktopのインストールすること
- ご自身の端末にBraveブラウザのインストールすること
- Braveブラウザに2つ以上のプロファイルを用意すること
  - それぞれのプロファイルでLace Walletを作成しておくこと！
  - ジャンケンには2つプレイヤーのウォレットが必要です
    - ​https://www.lace.io/
- testnet faucetを取得しておくこと
  - これがないとコントラクトをデプロイしたり、動かしたりすることができません！
  - https://faucet.preprod.midnight.network/
  - https://cloud.google.com/application/web3/

## 環境情報

> 以下の環境にて動作確認済みです。

```bash
Docker version 27.4.0
compact 0.2.0        # ラッパー CLI（compactc のバージョンを管理）
compactc 0.30.0      # 実際の Compact コンパイラ — 必ずこのバージョンを使用すること
bun 1.3.13
node 23.3.0
```

> **重要**: `compact 0.2.0` はあくまで CLI ラッパーです。
> このコントラクトは **compactc 0.30.0**（言語バージョン 0.22）を使用して作成・検証されています。
>
> より新しい compactc（例: 0.31.0。言語バージョン 0.23 を出力）をインストールすると、pragma のチェックに失敗します。
>
> `compact` ラッパー CLI をインストールした後、正しい compactc のバージョンに固定してください。
>
> ```bash
> compact update 0.30.0
> ```
>
> 以下のコマンドで確認できます。
>
> ```bash
> compact list   # → 0.30.0 が有効なバージョンとして → マーク付きで表示されること
> ```

## アプリケーション画像

![](./docs/0.png)

![](./docs/1.png)

![](./docs/2.png)

![](./docs/3.png)

![](./docs/4.png)

![](./docs/5.png)

![](./docs/6.png)

![](./docs/7.png)

![](./docs/8.png)

![](./docs/9.png)

![](./docs/10.png)

![](./docs/11.png)

![](./docs/12.png)

![](./docs/13.png)

## 開発方法

### 自分のGitHubアカウントにこのGitHubリポジトリをクローンしてくる

```bash
git clone https://github.com/<YOUR_GITHUB_ACCOUNT>/midnight-rps-sample-app
```

### Devcontainer を使用する（推奨）

このリポジトリには、事前設定済みの Devcontainer 環境が含まれています。

1. VS Code 拡張機能 `Dev Containers`（`ms-vscode-remote.remote-containers`）をインストールします。
2. VS Code でこのリポジトリを開きます。
3. コマンドパレットから `Dev Containers: Reopen in Container` を実行します。
4. コンテナの起動が完了するまで待ちます。

コンテナ作成時に、`postCreateCommand` によって `compactc 0.30.0` が自動的に固定されます。

### ブラウザへ Lace Wallet をインストール

まだ Lace Wallet をインストールしていない場合は、以下のページから Lace Wallet をインストールしてください。

https://www.lace.io/

次に、Midnight 用のウォレットアカウントを作成する必要があります。

> PreProd Network に切り替えてください。

### インストール

```bash
bun install
```

### ビルド

最初に Compact コントラクトをコンパイルします。

```bash
bun contract compact
```

今回は以下のようなスマートコントラクトを使うことになります！

```ts
pragma language_version >= 0.16 && <= 0.22;

import CompactStandardLibrary;

// ========================================
// じゃんけんゲームの状態
// ========================================
//
// waiting   : プレイヤーの参加・コミット待ち
// committed : 2人とも手をコミット済み
// finished  : 勝敗確定済み
export enum GameState {
  waiting,
  committed,
  finished
}

// プレイヤーが選べる手
export enum Move {
  rock,
  paper,
  scissors
}

// ゲームの結果
export enum GameResult {
  not_determined,
  player1_wins,
  player2_wins,
  draw
}

// ========================================
// オンチェーンで管理するゲーム状態
// ========================================

// 現在のゲーム状態
export ledger state: GameState;

// ゲームが終了しているか
export ledger game_over: Boolean;

// Player 1 / Player 2 を識別する公開キー
//
// 秘密鍵そのものは公開せず、
// 秘密鍵から生成した値だけをオンチェーンに保存する。
export ledger p1_key: Bytes<32>;
export ledger p2_key: Bytes<32>;

// 各プレイヤーが参加済みかどうか
export ledger p1_joined: Boolean;
export ledger p2_joined: Boolean;

// 各プレイヤーのコミットメント
//
// 「じゃんけんの手 + salt」から作られたハッシュ値。
// commit時点では実際の手は公開しない。
export ledger p1_commit: Bytes<32>;
export ledger p2_commit: Bytes<32>;

// 各プレイヤーが reveal 済みかどうか
export ledger p1_revealed: Boolean;
export ledger p2_revealed: Boolean;

// reveal 後に公開される実際のじゃんけんの手
export ledger p1_move: Move;
export ledger p2_move: Move;

// 最終的なゲーム結果
export ledger result: GameResult;


// ========================================
// Witness
// ========================================
//
// witness はユーザー側のローカル環境から提供される
// プライベートな値や処理を定義する。
// これらの値は、そのままオンチェーンには公開されない。

// プレイヤー自身の秘密鍵
witness local_secret_key(): Bytes<32>;

// プレイヤーが選んだじゃんけんの手
witness get_my_move(): Move;

// コミットメント作成時に使用するランダムな salt
//
// salt を使うことで、
// rock / paper / scissors のハッシュを総当たりされるのを防ぐ。
witness get_my_salt(): Bytes<32>;

// 選択した手とsaltをローカルに保存する処理
//
// commit後、reveal時に同じ値を使うために保存しておく。
witness store_move_and_salt(
  m: Move,
  s: Bytes<32>
): [];


// ========================================
// プレイヤー識別用の公開キーを生成
// ========================================
//
// 秘密鍵 sk そのものは公開せず、
// ハッシュ化した値をプレイヤーIDとして利用する。
//
// "rps:pk:v1" はドメイン分離用の固定文字列。
// 同じ秘密鍵が別用途のハッシュで使われても
// 衝突しにくくする目的がある。
export pure circuit derive_pk(
  sk: Bytes<32>
): Bytes<32> {
  return persistentHash<Vector<2, Bytes<32>>>([
    pad(32, "rps:pk:v1"),
    sk
  ]);
}


// ========================================
// じゃんけんの手のコミットメントを作成
// ========================================
//
// Commit-Reveal方式では、最初に実際の手を公開せず
// ハッシュ値だけを公開する。
//
// commitment = Hash(Hash(move), salt)
//
// これにより相手はcommit時点では
// 自分が何を選んだのか知ることができない。
pure circuit make_commit(
  m: Move,
  salt: Bytes<32>
): Bytes<32> {

  // enum の Move を Field に変換し、
  // さらに32byteの値へ変換する。
  const move_bytes = (m as Field) as Bytes<32>;

  // じゃんけんの手を一度ハッシュ化する。
  const move_hash =
    persistentHash<Vector<1, Bytes<32>>>([
      move_bytes
    ]);

  // 手のハッシュとsaltを組み合わせて
  // 最終的なコミットメントを作る。
  return persistentHash<Vector<2, Bytes<32>>>([
    move_hash,
    salt
  ]);
}


// ========================================
// 勝敗判定
// ========================================
//
// Player 1 と Player 2 の手を比較し、
// じゃんけんの結果を返す。
pure circuit who_wins(
  m1: Move,
  m2: Move
): GameResult {

  // 同じ手なら引き分け
  if (m1 == m2) {
    return GameResult.draw;
  }

  // 以下は Player 1 が勝つケース
  if (
    m1 == Move.rock &&
    m2 == Move.scissors
  ) {
    return GameResult.player1_wins;
  }

  if (
    m1 == Move.scissors &&
    m2 == Move.paper
  ) {
    return GameResult.player1_wins;
  }

  if (
    m1 == Move.paper &&
    m2 == Move.rock
  ) {
    return GameResult.player1_wins;
  }

  // 上記以外は Player 2 の勝ち
  return GameResult.player2_wins;
}


// ========================================
// Commitフェーズ
// ========================================
//
// プレイヤーはここでじゃんけんの手を選択するが、
// 実際の手はまだ公開しない。
//
// 公開されるのは
//
//   Hash(move + salt)
//
// に相当するコミットメントだけ。
//
// これにより、後から手を変更することも、
// 相手の手を先に確認することも防げる。
export circuit commit(): [] {

  // すでにゲームが終了していたら実行不可
  assert(
    !game_over,
    "Game is already over"
  );

  // commit可能なのは waiting 状態のみ
  assert(
    state == GameState.waiting,
    "Not in waiting state"
  );

  // ローカル環境から秘密鍵を取得
  const sk = local_secret_key();

  // 秘密鍵からプレイヤー識別用の公開キーを生成
  const pk = derive_pk(sk);

  // ユーザーが選択したじゃんけんの手
  const my_move = get_my_move();

  // ランダムなsalt
  const my_salt = get_my_salt();

  // 手とsaltからコミットメントを作成
  const commitment =
    make_commit(my_move, my_salt);

  // reveal時に必要なので、
  // 手とsaltをローカルに保存しておく
  store_move_and_salt(
    my_move,
    my_salt
  );


  // ========================================
  // Player 1 の登録
  // ========================================

  if (!p1_joined) {

    // disclose() を使うことで、
    // ZK回路内部の値を明示的に公開する。
    //
    // 秘密鍵 sk 自体は公開せず、
    // derive_pk(sk) の結果だけを公開する。
    p1_key = disclose(pk);

    // 実際の手ではなく
    // コミットメントだけを公開する。
    p1_commit = disclose(commitment);

    p1_joined = true;

  } else {

    // ========================================
    // Player 2 の登録
    // ========================================

    // すでにPlayer 2まで参加している場合は拒否
    assert(
      !p2_joined,
      "Both players already committed"
    );

    p2_key = disclose(pk);
    p2_commit = disclose(commitment);

    p2_joined = true;

    // 2人ともcommitしたので
    // revealフェーズへ移行する。
    state = GameState.committed;
  }
}


// ========================================
// Revealフェーズ
// ========================================
//
// commit時に使用した
//
//   move
//   salt
//
// を使ってコミットメントを再計算する。
//
// 再計算した値がオンチェーン上のcommitmentと
// 一致することを確認することで、
//
// 「commit後に手を変更していない」
//
// ことを検証する。
export circuit reveal(): [] {

  // ゲーム終了後はreveal不可
  assert(
    !game_over,
    "Game is already over"
  );

  // 2人ともcommit済みでなければreveal不可
  assert(
    state == GameState.committed,
    "Not in committed state"
  );

  // ローカル秘密鍵
  const sk = local_secret_key();

  // 自分のプレイヤーIDを再生成
  const pk = derive_pk(sk);

  // commit時に選択した手
  const my_move = get_my_move();

  // commit時に使用したsalt
  const my_salt = get_my_salt();

  // move + salt からcommitmentを再計算
  const computed =
    make_commit(my_move, my_salt);


  // ========================================
  // 自分がどちらのプレイヤーか確認
  // ========================================

  const is_p1 =
    disclose(p1_key == pk);

  const is_p2 =
    disclose(p2_key == pk);

  // 登録済みのPlayer 1またはPlayer 2以外は
  // revealできない。
  assert(
    is_p1 || is_p2,
    "Caller is not a registered player"
  );


  // ========================================
  // Player 1 の Reveal
  // ========================================

  if (is_p1) {

    // 二重revealを防止
    assert(
      !p1_revealed,
      "Player 1 already revealed"
    );

    // commit時のcommitmentと、
    // 今回再計算したcommitmentが一致するか確認
    //
    // 一致しない場合、
    // move または salt がcommit時と異なる。
    assert(
      disclose(computed == p1_commit),
      "Commitment mismatch for P1"
    );

    // 検証に成功したので
    // 実際の手を公開する。
    p1_move = disclose(my_move);

    p1_revealed = true;
  }


  // ========================================
  // Player 2 の Reveal
  // ========================================

  if (is_p2) {

    assert(
      !p2_revealed,
      "Player 2 already revealed"
    );

    assert(
      disclose(computed == p2_commit),
      "Commitment mismatch for P2"
    );

    p2_move = disclose(my_move);

    p2_revealed = true;
  }


  // ========================================
  // 2人ともReveal済みなら勝敗判定
  // ========================================

  if (
    disclose(
      p1_revealed &&
      p2_revealed
    )
  ) {

    // 公開された2人の手から勝敗を決定
    result =
      who_wins(
        p1_move,
        p2_move
      );

    // ゲーム終了
    game_over = true;

    state = GameState.finished;
  }
}
```

次に、すべての TypeScript パッケージをビルドします（contract → ZK キー同期 → shared → CLI → app）。

```bash
bun run build
```

`bun run build` コマンドでは、以下の処理が順番に実行されます。

1. `pkgs/contract` — TypeScript のコンパイル + `managed/` を `dist/` へコピー
2. コントラクトから ZK キー / Circuit を `pkgs/app/public/` へ同期
3. `pkgs/shared` — TypeScript のコンパイル
4. `pkgs/cli` — TypeScript のコンパイル
5. `pkgs/app` — Vite によるビルド

### Proof Server を起動する

> Proof Serverはコントラクトのデプロイやコントラクトのメソッドを実行するのに必要です。

```bash
docker compose -f pkgs/cli/proof-server.yml up
```

> **提供されている Devcontainer を使用している場合**
>
> Devcontainer では Docker-in-Docker を使用するのではなく、ホスト側の
> `/var/run/docker.sock` を bind mount する Docker-outside-of-Docker 構成になっています。
>
> そのため、上記コマンドで起動したコンテナは独立した Docker ネットワーク上で動作し、Devcontainer 内から `127.0.0.1:6300` ではアクセスできません。
>
> この場合、`cli` / `app` では以下のようなエラーが発生します。
>
> `ECONNREFUSED 127.0.0.1:6300`
>
> または
>
> `"Failed to prove transaction"`
>
> Devcontainer を利用する場合は、代わりに Devcontainer 専用の compose ファイルを使用してください。
>
> この compose ファイルでは、Proof Server と Devcontainer が同じネットワーク名前空間を共有します。
>
> ```bash
> DEVCONTAINER_HOST_ID=$HOSTNAME docker compose -f pkgs/cli/proof-server.devcontainer.yml up
> ```
>
> `bun cli preprod-ps` / `bun cli preview-ps` は、この処理を自動で行います。
>
> `REMOTE_CONTAINERS=true` を検出すると、適切な compose ファイルが自動選択されます。
>
> そのため、Devcontainer 内では
>
> `bun cli preprod` / `preview`
>
> と手動で Proof Server を起動する方法よりも、
>
> `bun cli preprod-ps` / `bun cli preview-ps`
>
> を利用することを推奨します。

### PreProd Network へコントラクトをデプロイする

テストネット用の NIGHT Token を持っていない場合は、以下のサイトから取得できます。

https://faucet.preprod.midnight.network/

```bash
bun cli preprod
```

> 2回目以降は、以下のコマンドを実行してください。

```bash
bun cli preprod-ps
```

デプロイ時に新しくウォレットを作成するか秘密鍵をインポートするかを聞かれるので「秘密鍵をインポートする」を選択して秘密鍵はLace Walletに作成したものを貼り付けてください(Lace Walletから秘密鍵を取得しておいてください)。

> [!IMPORTANT]
> デプロイしたコントラクトのアドレスは後で使うのでメモしておいてください。
>
> もし、新しくデプロイしたくなったら Ctrl + C を押して一度処理を中断し、再度上記のコマンドを実行してデプロイをやり直してください！

デプロイ済みコントラクトアドレス情報（PreProd Network）

```bash
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              Midnight RPS Example                            ║
║              ─────────────────────                           ║
║              Rock-Paper-Scissors with ZK commit-reveal       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
.
.
.
[19:24:25.997] INFO (40223): Deploying RPS contract...
  ⠇ Deploying RPS contract[19:24:51.416] INFO (40223): Deployed RPS contract at: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
  ✓ Deploying RPS contract
  Contract deployed at: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
```

### (ここは飛ばして良いです)Preview Network へコントラクトをデプロイする

Preview は PreProd よりも軽量な公開テストネットです。

過去のイベント数が少ないため、ウォレットの同期をより高速に行えます。

テストネット用 NIGHT Token を持っていない場合は、以下のサイトから取得できます。

https://faucet.preview.midnight.network/

```bash
bun cli preview
```

> 2回目以降は、以下のコマンドを実行してください。

```bash
bun cli preview-ps
```

デプロイ済みコントラクトアドレス情報（Preview Network）

```bash
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              Midnight RPS Example                            ║
║              ─────────────────────                           ║
║              Rock-Paper-Scissors with ZK commit-reveal       ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
.
.
.
[09:47:53.729] INFO (82390): Deploying RPS contract...
  ⠋ Deploying RPS contract[09:48:16.409] INFO (82390): Deployed RPS contract at: 9070775f7615e1598dc8642398453d7d4bb9cd0939c06019849f5ec80ef5ee5c
  ✓ Deploying RPS contract
  Contract deployed at: 9070775f7615e1598dc8642398453d7d4bb9cd0939c06019849f5ec80ef5ee5c
```

### CLI からじゃんけんを操作する

コントラクトのデプロイが完了したら以下のようにCLIベースでコントラクトが操作できます！

フロントエンドから確認する前にまずはコントラクトの機能が正常に動作するか確認しまししょう。

```bash

# 番号で呼び出す操作を選択します。

──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 3,497,759,478,999,999,996
  Contract: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
> 1

──────────────────────────────────────────────────────────────
  Select your move(自分が出す手を決めます)
──────────────────────────────────────────────────────────────
  [1] Rock     🪨
  [2] Paper    🖐
  [3] Scissors ✌️
──────────────────────────────────────────────────────────────
> 1
[19:36:19.509] INFO (40223): Committing move 0...
  ⠸ Committing move (Rock) — generating ZK proof[19:36:45.473] INFO (40223): Commit TX 0072b7ad5d6127b3e6d02373ccd967c7329b2ca7a8be35d099f44ebb6736728cca added in block 618227
  ✓ Committing move (Rock) — generating ZK proof

# しばらく時間がかかりますがこれはブロックチェーンにトランザクションをブロードキャストする他にZKProofを生成している処理も含めれているためです。

──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 3,503,362,116,999,999,995
  Contract: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
> 2
[19:37:05.494] INFO (40223): Revealing move...
  ⠇ Revealing move — generating ZK proof[19:37:33.105] INFO (40223): Reveal TX 00ba3dd2c40736337619c979afeb2210d8b36fc917a93e403a90b1378f07eb680e added in block 618235
  ✓ Revealing move — generating ZK proof

──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 3,503,458,932,999,999,994
  Contract: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
──────────────────────────────────────────────────────────────

──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 3,504,021,088,999,999,994
  Contract: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
> 3
[19:38:49.770] INFO (40223): Checking RPS ledger state...
[19:38:50.631] INFO (40223): RPS state: {"state":2,"game_over":true,"p1_key":"0xc3625c1f...","p2_key":"0x12c4698e...","p1_joined":true,"p2_joined":true,"p1_commit":"0x9accc673...","p2_commit":"0x7516506b...","p1_revealed":true,"p2_revealed":true,"p1_move":1,"p2_move":0,"result":1}

  Game State:   finished
  Game Over:    true
  P1 Joined:   true
  P2 Joined:   true
  P1 Revealed: true
  P2 Revealed: true
  Result:       player1_wins

# うまくいけばこのようにゲーム状況を確認してどこまで進んでいるかをチェックできます。

──────────────────────────────────────────────────────────────
  RPS Actions                         DUST: 3,504,095,491,999,999,994
  Contract: 23149945fed06aa010cc3e48e9f5df91625567300fae4e09371bb788d07a6bd8
──────────────────────────────────────────────────────────────
  [1] Commit my move
  [2] Reveal my move
  [3] Show game state
  [4] Exit
──────────────────────────────────────────────────────────────
```

CLIでの確認が完了したらいよいよフロントエンドからの確認です！

### フロントエンドアプリを起動する

```bash
bun app dev
```

> Devcontainer を使用する場合は、以下のコマンドを実行してください。

```bash
bun app dev --host
```

1. 事前に、異なる2つのブラウザへ Lace Wallet 拡張機能をインストールしておきます
   Brave の利用を推奨します。
   それぞれのブラウザでウォレットを1つずつ作成してください。

2. Faucet からテスト用 tNight を取得し、それぞれのウォレットへ送金しておきます。

3. `bun app dev` コマンドでアプリケーションを起動し、それぞれのブラウザから `localhost:5173` へアクセスします。

4. ウォレットを接続します。

5. CLI を使ってデプロイしたコントラクトのアドレスを入力します。

6. それぞれのブラウザで自分の手を選択し、送信します。

7. それぞれのブラウザで Reveal ボタンをクリックします。

8. それぞれのブラウザにゲーム結果が表示されます。

   * Reveal の順番は Commit の順番と一致させる必要があります。
   * 例えば Wallet A → Wallet B の順で Commit した場合、Reveal も Wallet A → Wallet B の順で行う必要があります。
