# 要件定義書

## はじめに

Midnight ブロックチェーンの ZK プライバシー機能を活用した 2 人対戦グー・チョキ・パー（RPS）dApp のフルスタック実装。既存の Counter サンプル実装を基盤として、RPS ゲームに特化した Compact コントラクト・React UI コンポーネント・CLI ツールを追加する。

対象ユーザー: Midnight / ZK ブロックチェーンに興味を持つ開発者、および dApp ゲームプレイヤー。

## スコープ境界

- **対象**: rps.compact コントラクト（commit/reveal/result）、RpsGame React コンポーネント群（MoveSelector/CommitButton/RevealButton/ResultDisplay/WaitingState）、useRpsGame フック、lib/rps.ts SDK 統合、CLI への RPS API 追加・統合テスト、RPS ZK キー同期スクリプト（sync-keys-rps）
- **対象外**: tDUST トークンの賭け機能、マルチゲーム・ロビー機能、プレイヤーランキング、モバイルアプリ
- **隣接システム期待値**: Lace Wallet 接続は既存 WalletContext/useWallet が提供する。Docker インフラ（Proof Server・Indexer・Node）は既存 standalone.yml が提供する。Midnight SDK プロバイダー設定は既存 providers.ts のパターンに準拠する。

---

## 要件一覧

### 要件 1: 手のコミットメント登録

**目的:** ゲームプレイヤーとして、手を選んで秘密のコミットメントとして登録したい。そうすることで、ゲーム中に相手に自分の手が知られないようにしてプレイできる。

#### 受入基準

1. When ゲームプレイヤーがグー・チョキ・パーのいずれかを選択してコミット操作を実行したとき, the RPS dApp shall ZK 証明を生成し手のハッシュコミットメントをオンチェーンの台帳に登録する
2. When 1 人目のプレイヤーがコミットしたとき, the RPS dApp shall そのプレイヤーを P1 として台帳に記録する（p1_joined = true、p1_key = プレイヤー公開鍵、p1_commit = ハッシュコミットメント）
3. When 2 人目のプレイヤーがコミットしたとき, the RPS dApp shall そのプレイヤーを P2 として台帳に記録し（p2_joined = true）、ゲーム状態を committed に遷移させる
4. If 既にコミット済みのプレイヤーが再度コミット操作を試みたとき, the RPS dApp shall トランザクションを拒否する
5. If ゲームが waiting 状態でないときにコミット操作を試みたとき, the RPS dApp shall トランザクションを拒否する
6. The RPS dApp shall コミット段階では相手ゲームクライアントから手の内容を知ることができないようにする（コミットメントハッシュのみを台帳に公開する）

---

### 要件 2: 手の公開・ZK 検証

**目的:** ゲームプレイヤーとして、コミット後に自分の手を ZK 証明付きで公開したい。そうすることで、後出し不正なしに手が正しいことを数学的に保証できる。

#### 受入基準

1. When ゲームプレイヤーがリビール操作を実行したとき, the RPS dApp shall ZK 証明を用いてコミット時の手と塩の一致を検証し、手をオンチェーンに公開する
2. When P1 がリビールを完了したとき, the RPS dApp shall P1 の手を台帳に記録する（p1_move = 選択した手、p1_revealed = true）
3. When P2 がリビールを完了したとき, the RPS dApp shall P2 の手を台帳に記録する（p2_move = 選択した手、p2_revealed = true）
4. If リビール時に提示した手がコミット済みのハッシュと一致しないとき, the RPS dApp shall ZK 証明の検証失敗としてトランザクションを拒否する
5. If 既にリビール済みのプレイヤーが再度リビール操作を試みたとき, the RPS dApp shall トランザクションを拒否する
6. If ゲームが committed 状態でないときにリビール操作を試みたとき, the RPS dApp shall トランザクションを拒否する
7. If P1 でも P2 でもないプレイヤーがリビール操作を試みたとき, the RPS dApp shall トランザクションを拒否する

---

### 要件 3: 勝敗判定・ゲーム終了

**目的:** ゲームプレイヤーとして、両者のリビールが完了したあとに自動的に勝敗が確定してほしい。そうすることで、追加の操作なしにゲーム結果を知ることができる。

#### 受入基準

1. When P1 と P2 の両方がリビールを完了したとき, the RPS dApp shall 標準 RPS ルール（グー＞チョキ、チョキ＞パー、パー＞グー）に従い勝敗を判定してオンチェーンに結果を記録する
2. When 両者の手が同じだったとき, the RPS dApp shall 引き分け（draw）として台帳に結果を記録する
3. When ゲームが終了したとき, the RPS dApp shall game_over フラグを true にして状態を finished に遷移させる
4. While ゲームが finished 状態のとき, the RPS dApp shall いかなるコミット・リビール操作も受け付けない

---

### 要件 4: 不正行為防止

**目的:** ゲームプレイヤーとして、ゲームが公正に進行することを数学的に保証されたい。そうすることで、相手による後出しやなりすましを防止できる。

#### 受入基準

1. The RPS dApp shall 秘密鍵から導出したプレイヤー固有の公開鍵をコミット時に台帳に記録し、リビール時に同一プレイヤーであることを ZK 証明で検証する
2. If コミット後に異なる手でリビールを試みたとき, the RPS dApp shall ZK 証明の不一致によりトランザクションを拒否する
3. The RPS dApp shall コミットメントの生成に 32 バイトのランダム塩を使用し、コミットメントから手を逆算できないようにする
4. The RPS dApp shall プレイヤーの秘密鍵および塩をネットワーク上に公開しない

---

### 要件 5: 手の選択・コミット UI

**目的:** ゲームプレイヤーとして、ブラウザ上でグー・チョキ・パーを選択してコミットを送信したい。そうすることで、ウォレット接続後すぐにゲームを開始できる。

#### 受入基準

1. While ウォレットが接続済み状態のとき, the RPS dApp shall グー・チョキ・パーの 3 択を UI に表示する
2. When プレイヤーが手を選択したとき, the RPS dApp shall 選択状態を視覚的にハイライト表示する
3. When プレイヤーがコミットボタンを押したとき, the RPS dApp shall ZK 証明生成中であることをローディング状態として表示し、操作を無効化する
4. When コミットトランザクションが確定したとき, the RPS dApp shall コミット完了を通知してゲーム状態を更新する
5. If コミット操作が失敗したとき, the RPS dApp shall エラー内容をトースト通知で表示する

---

### 要件 6: 相手コミット待機・ゲーム状態表示

**目的:** ゲームプレイヤーとして、相手のアクションをリアルタイムで把握したい。そうすることで、自分がいつリビール操作を行えるかわかる。

#### 受入基準

1. While 自分がコミット済みで相手がコミット未完了のとき, the RPS dApp shall 相手のコミット待機中であることを表示する
2. When 両者のコミットが完了したとき, the RPS dApp shall リビール操作が可能であることを UI で通知する
3. While ゲームが waiting または committed 状態のとき, the RPS dApp shall 台帳の更新をリアルタイムで監視してゲーム状態を自動更新する
4. When P1 または P2 のいずれかがリビールを完了したとき, the RPS dApp shall 相手のリビール待機状態を表示する

---

### 要件 7: リビール UI

**目的:** ゲームプレイヤーとして、ボタン操作でリビールを実行したい。そうすることで、最小限の操作でゲームを完了できる。

#### 受入基準

1. While ゲームが committed 状態かつ自分がリビール未実行のとき, the RPS dApp shall リビールボタンを表示する
2. When プレイヤーがリビールボタンを押したとき, the RPS dApp shall ZK 証明生成中であることをローディング状態として表示し、操作を無効化する
3. When リビールトランザクションが確定したとき, the RPS dApp shall リビール完了を通知してゲーム状態を更新する
4. If リビール操作が失敗したとき, the RPS dApp shall エラー内容をトースト通知で表示する

---

### 要件 8: ゲーム結果表示

**目的:** ゲームプレイヤーとして、両者の手と勝敗結果をゲーム終了後に確認したい。そうすることで、ゲームの公正性を検証できる。

#### 受入基準

1. When ゲームが finished 状態に遷移したとき, the RPS dApp shall P1・P2 双方の手（グー・チョキ・パー）と最終結果（勝者またはドロー）を表示する
2. When 自分が勝利したとき, the RPS dApp shall 勝利メッセージを表示する
3. When 自分が敗北したとき, the RPS dApp shall 敗北メッセージを表示する
4. When 引き分けのとき, the RPS dApp shall 引き分けメッセージを表示する
5. The RPS dApp shall 結果表示を日本語・英語の両言語でサポートする（既存 i18n 機構に準拠）

---

### 要件 9: CLI による RPS 操作

**目的:** 開発者として、CLI からコントラクトのデプロイ・ゲーム操作ができるようにしたい。そうすることで、ローカル環境での動作確認やテストを効率的に行える。

#### 受入基準

1. When 開発者が CLI からデプロイコマンドを実行したとき, the RPS CLI shall RPS コントラクトを Midnight ノードにデプロイしてコントラクトアドレスを出力する
2. When 開発者が CLI から commit コマンドを実行したとき, the RPS CLI shall 指定した手でコミット操作を実行してトランザクション結果を出力する
3. When 開発者が CLI から reveal コマンドを実行したとき, the RPS CLI shall リビール操作を実行して最新のゲーム状態と結果を出力する
4. The RPS CLI shall ローカル Docker 環境（standalone）での 2 プレイヤー間の統合テストをサポートする

---

### 要件 10: パフォーマンス・動作環境

**目的:** ゲームプレイヤーとして、ZK 証明生成とトランザクション確定が実用的な時間内に完了してほしい。そうすることで、ストレスなくゲームをプレイできる。

#### 受入基準

1. The RPS dApp shall ZK 証明の生成を 10 秒以内に完了する（ローカル Proof Server 使用時）
2. The RPS dApp shall トランザクション確定を 30 秒以内に完了する（ローカル Docker 環境）
3. The RPS dApp shall Chrome 120 以降かつ Lace Wallet 拡張機能がインストールされた環境で動作する
4. While Lace Wallet 未インストール状態のとき, the RPS dApp shall インストール案内を表示する
5. If Proof Server に接続できないとき, the RPS dApp shall エラートーストを表示してユーザーにリトライを促す
6. If ネットワーク切断が発生したとき, the RPS dApp shall 接続エラーを通知してリトライを案内する
