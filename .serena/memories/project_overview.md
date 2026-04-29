# プロジェクト概要: midnight-rps-sample-app

## 目的
Midnight ブロックチェーンの ZK（ゼロ知識）プライバシー機能を活用した 2 人対戦グー・チョキ・パー（RPS）dApp のフルスタックサンプル実装。

- ゲーム中: ZK 証明コミットメントスキームにより相手の手は非公開
- ゲーム後: 両者の手がオンチェーンに公開され、誰でも検証可能
- 参照元: midnightntwrk/example-counter をベースに RPS 機能を追加

## モノレポ構成

```
midnight-rps-sample-app/
├── pkgs/
│   ├── contract/   # Compact スマートコントラクト + ZK キー生成
│   ├── app/        # React フロントエンド (Vite + Tailwind CSS v4)
│   └── cli/        # デプロイ・テスト用 CLI (Node.js / ts-node)
├── biome.json      # Biome 設定 (フォーマット + リント)
└── package.json    # Bun ワークスペースルート
```

## 技術スタック

| 層 | 技術 |
|---|---|
| パッケージマネージャー | Bun 1.2.0 |
| フロントエンド | React 19, TypeScript, Vite 5, Tailwind CSS v4, shadcn/ui |
| スマートコントラクト | Compact 言語 (compactc コンパイル), compact-runtime 0.15.0 |
| Midnight SDK | @midnight-ntwrk/midnight-js ^4.0.4, wallet-sdk-* ^3.0.0 |
| ウォレット | Lace Wallet (@midnight-ntwrk/dapp-connector-api ^3.0.0) |
| 状態管理 | React Context + RxJS Observable |
| CLI | ts-node, Pino, testcontainers |
| フォーマット/リント | Biome 2.4.12 |
| テスト | Vitest ^4.1.0 |

## 実装状況

- **実装済み**: Counter サンプル (コントラクト・UI・CLI), Lace Wallet 接続, Docker インフラ
- **未実装 (RPS)**: rps.compact, RpsGame コンポーネント群, useRpsGame フック, lib/rps.ts, CLI RPS API
