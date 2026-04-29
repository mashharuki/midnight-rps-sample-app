# 開発コマンド一覧

## 日常開発

```bash
# フロントエンド開発サーバー起動 (http://localhost:5173)
bun run dev

# フォーマット (Biome: スペース2, ダブルクォート)
bun run format

# リント
bun run lint

# テスト (Vitest - contract シミュレータテスト)
bun run test

# 型チェック (app + cli + contract)
bun run typecheck

# フルビルド (contract → sync-keys → cli → app)
bun run build
```

## インフラ (Docker)

```bash
# ローカル完全環境起動 (Node + Indexer + Proof Server)
docker compose -f pkgs/cli/standalone.yml up -d

# Proof Server のみ起動 (テストネット接続時)
docker compose -f pkgs/cli/proof-server.yml up -d

# Proof Server バージョン確認
curl http://localhost:6300/version

# Indexer ポート確認
docker compose -f pkgs/cli/standalone.yml port indexer 8088
```

## コントラクト

```bash
# Counter コントラクトの ZK キーをフロントエンドに同期
bun run sync-keys

# (RPS 実装後) RPS ZK キー同期
# bun run sync-keys-rps  ← 未実装

# Compact コントラクトコンパイル (compactc が必要)
compact compile pkgs/contract/src/rps.compact pkgs/contract/src/managed/rps
```

## CLI (pkgs/cli)

```bash
# ローカル standalone 環境で実行
bun run --cwd pkgs/cli standalone

# Preview ネット接続
bun run --cwd pkgs/cli preview

# Preprod ネット接続
bun run --cwd pkgs/cli preprod
```

## ネットワーク設定

| 環境 | Node | Indexer | Proof Server | Network ID |
|---|---|---|---|---|
| ローカル | ws://127.0.0.1:9944 | http://127.0.0.1:8088 | http://127.0.0.1:6300 | undeployed |
| Preview | パブリック | パブリック | http://localhost:6300 | preview |
| Preprod | パブリック | パブリック | http://localhost:6300 | preprod |
