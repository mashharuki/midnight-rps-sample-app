# コードスタイル・規約

## フォーマット (Biome 2.4.12)

- **インデント**: スペース 2 個 (`indentStyle: "space"`)
- **クォート**: ダブルクォート (`quoteStyle: "double"`)
- **除外**: `dist/`, `node_modules/`, `*.css`, `src/managed/` (生成物)
- **import 整理**: `organizeImports: "on"` (自動)

## TypeScript

- `strict` モード使用
- `any` は最小限 (`// eslint-disable-next-line @typescript-eslint/no-explicit-any` でコメント付き)
- パスエイリアス: `@/` → `pkgs/app/src/` (app パッケージ内)

## 命名規則

- コンポーネント: PascalCase (例: `CounterSection`, `MoveSelector`)
- フック: `use` プレフィックス + camelCase (例: `useCounter`, `useRpsGame`)
- 型: PascalCase (例: `CounterProviders`, `RpsPrivateState`)
- 定数: UPPER_SNAKE_CASE (例: `STORAGE_KEY`, `FALLBACK_URIS`)
- ファイル: kebab-case (例: `counter-types.ts`, `rps-witnesses.ts`)

## コメント

- 日本語コメント推奨 (日本語で WHY を説明)
- JSDoc は関数の目的・パラメータに限定
- ライセンスヘッダー: Apache-2.0 (既存ファイル)

## パターン

- **契約層**: `counter-types.ts` に型定義 → `lib/counter.ts` に API → `hooks/useCounter.ts` にフック
- **状態管理**: React Context (`WalletContext`) + カスタムフック + RxJS Observable
- **エラー通知**: Sonner トースト
- **国際化**: i18next (ja/en ロケール, `pkgs/app/src/i18n/`)
- **Lace Wallet**: `window.midnight.mnLace` ポーリング → semver チェック → 接続

## ライセンスヘッダー (既存ファイル準拠)
```typescript
// This file is part of midnightntwrk/example-counter.
// Copyright (C) 2025 Midnight Foundation
// SPDX-License-Identifier: Apache-2.0
```
