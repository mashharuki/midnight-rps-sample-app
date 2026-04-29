# Vite ビルド設定 (WebAssembly + Node.js polyfill)

## 必要なパッケージ

```bash
yarn add -D \
  vite \
  @vitejs/plugin-react \
  vite-plugin-wasm \
  @originjs/vite-plugin-commonjs \
  @rollup/plugin-inject \
  node-stdlib-browser
```

## vite.config.ts 完全版

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import wasm from 'vite-plugin-wasm';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import inject from '@rollup/plugin-inject';
import stdLibBrowser from 'node-stdlib-browser';

export default defineConfig({
  plugins: [
    react(),
    wasm(),
    // @midnight-ntwrk/* の一部が CommonJS モジュールのため必須
    viteCommonjs(),
    // ブラウザに存在しない Node.js グローバルを注入
    inject({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
  resolve: {
    // Node.js 標準ライブラリのブラウザ版エイリアス
    alias: stdLibBrowser,
  },
  optimizeDeps: {
    // level-private-state-provider は事前バンドル対象から除外
    exclude: ['@midnight-ntwrk/midnight-js-level-private-state-provider'],
  },
  worker: {
    // WebWorker 内でも WASM が動作するよう設定
    format: 'es',
    plugins: () => [wasm()],
  },
  server: {
    port: 8080,
    // 開発サーバーのヘッダー設定（SharedArrayBuffer等に必要）
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'esnext', // WASM に必要
    rollupOptions: {
      // 大きなパッケージを分割してロード時間を削減
      output: {
        manualChunks: {
          'midnight-sdk': [
            '@midnight-ntwrk/midnight-js-contracts',
            '@midnight-ntwrk/midnight-js-types',
            '@midnight-ntwrk/compact-runtime',
          ],
          'ledger': ['@midnight-ntwrk/ledger', '@midnight-ntwrk/zswap'],
        },
      },
    },
  },
});
```

## ZK キーファイルの配置

Compact コンパイラが生成するキーファイルをブラウザから取得できるよう `public/` に配置：

```
public/
  dist/
    managed/
      <contract-name>/       ← Compact コンパイラの出力名
        proving_key.cbor
        verifying_key.cbor
        circuit.json
```

```typescript
// FetchZkConfigProvider はこのパスに HTTP GET する
// baseURL = window.location.origin の場合:
//   GET /dist/managed/<contract-name>/proving_key.cbor
new FetchZkConfigProvider(window.location.origin, fetch.bind(window));
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["ESNext", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  }
}
```

## よくあるビルドエラーと対処

### `process is not defined`
```typescript
// vite.config.ts の inject プラグインに追加
inject({ process: 'process/browser' })
```

### `Buffer is not defined`
```typescript
inject({ Buffer: ['buffer', 'Buffer'] })
```

### `Module "crypto" not found`
```typescript
// node-stdlib-browser の alias が必要
resolve: { alias: stdLibBrowser }
```

### `Cannot use 'import.meta' outside a module` (in worker)
```typescript
worker: { format: 'es' }
```

### WASM ファイルのロードエラー
```
MIME type mismatch: application/octet-stream vs application/wasm
```
→ サーバーの MIME タイプ設定で `wasm` → `application/wasm` を追加

### SharedArrayBuffer エラー（Chrome）
→ COOP/COEP ヘッダーが必要（上記 server.headers 設定）

## モノレポ構成の場合

```typescript
// apps/web/vite.config.ts
import { resolve } from 'path';

export default defineConfig({
  // ...
  resolve: {
    alias: {
      ...stdLibBrowser,
      // ローカルパッケージのソースを直接参照（ビルド不要）
      '@repo/my-api': resolve(__dirname, '../../packages/api/my-package/src'),
    },
  },
  optimizeDeps: {
    exclude: [
      '@midnight-ntwrk/midnight-js-level-private-state-provider',
      // CommonJS 変換が必要なローカルパッケージ
    ],
    include: [
      // CommonJS パッケージを事前バンドル
      'semver',
    ],
  },
});
```
