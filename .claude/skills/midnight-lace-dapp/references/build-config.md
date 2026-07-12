# Vite ビルド設定 (WebAssembly + Node.js polyfill)

> **検証済み事例（`midnight-rps-sample-app`）**: 以下の「本番ビルド限定で起きる罠」節は、実際に Vercel へ初回デプロイした際に発生した障害から得られたパターン。`vite build` / `tsc` では検出できず、本番ビルドをブラウザで開いて初めて顕在化する点に注意。

## 本番ビルド限定で起きる罠: `exports is not defined`

開発サーバー（esbuild による事前バンドル）では問題なく動くのに、`vite build` の本番バンドル（Rollup）だけで次のエラーが出ることがある:

```
Uncaught ReferenceError: exports is not defined
```

**原因**: `node-stdlib-browser` が持ち込むレガシー CJS ポリフィル（`util`, `assert`, `crypto`(=crypto-browserify とその依存ツリー全体)）や、`semver`、`path-browserify`、さらには `@midnight-ntwrk/midnight-js-utils` の CJS ビルドなど、一部のパッケージは `@rollup/plugin-commonjs` に "部分的にしか" 変換されない。内部の一部ファイルは正しく IIFE でラップされるが、エントリファイルのトップレベルにある `exports.foo = ...` / `module.exports = ...` は素の未束縛参照として残ってしまう。ESM には Node の CJS ローダーのような暗黙の `exports`/`module` バインディングが無いため、ブラウザ上で `ReferenceError` になる。`commonjsOptions` の `transformMixedEsModules` / `strictRequires` / `include` をいくら調整してもこの根本問題は直らない。

**対処**: 問題のあるパッケージだけを Rollup の commonjs 変換の手前で esbuild に直接バンドルさせる（esbuild の CJS→ESM interop は Rollup のものと違い、このパターンを正しく処理できる）。以下は実際に動作した `cjsInteropBuildShimPlugin`:

```typescript
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import type { Plugin } from 'vite';

const _require = createRequire(import.meta.url);

interface CjsInteropEntry {
  /** インターセプトするバレスペシファイア (例: "util", "node:util") */
  specifiers: string[];
  /** node-stdlib-browser や _require.resolve が解決した絶対パッケージディレクトリ */
  pkgDir: string;
  /** pkgDir からの相対パスで、実際の CJS エントリファイル */
  entryFile: string;
  /** esbuild にバンドルさせず外部化する import (esbuild の `external`) */
  external?: string[];
  /**
   * `external` を指定すると esbuild は副作用の不在を証明できなくなり、
   * 名前付き ES export を合成せず `export default <cjsModuleExports>` だけを
   * 出力するようになる。その場合、既知の `exports.foo = ...` の名前をここに
   * 列挙して default export から再分割代入する（React CJS シムと同じ手法）。
   */
  namedExports?: string[];
  /** esbuild に別解決させたい import (esbuild の `alias`)。
   * `platform: 'browser'` の esbuild リゾルバは `stream` のような
   * 素の Node ビルトイン specifier を単体では解決できないため、
   * node-stdlib-browser が既に解決したポリフィルパスを渡して
   * 依存ツリー全体を1つのクリーンな ESM ユニットとして inline させる。 */
  alias?: Record<string, string>;
}

function cjsInteropBuildShimPlugin(entries: CjsInteropEntry[]): Plugin {
  const resolved = entries.map((e, i) => ({
    ...e,
    virtualId: `\0virtual:cjs-interop-build-${i}`,
    entryPath: path.join(e.pkgDir, e.entryFile),
  }));
  const cache = new Map<string, string>();

  return {
    name: 'cjs-interop-build-shim',
    apply: 'build', // 開発サーバーでは esbuild の事前バンドルで解決済みなので不要
    enforce: 'pre',
    resolveId(id) {
      for (const e of resolved) {
        if (e.specifiers.includes(id) || id === e.pkgDir || id === `${e.pkgDir}/` || id === e.entryPath) {
          return e.virtualId;
        }
      }
    },
    async load(id) {
      const e = resolved.find((r) => r.virtualId === id);
      if (!e) return;
      const cached = cache.get(e.virtualId);
      if (cached) return cached;
      const viteRequire = createRequire(_require.resolve('vite/package.json'));
      const esbuild = await import(viteRequire.resolve('esbuild'));
      const result = await esbuild.build({
        entryPoints: [e.entryPath],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        write: false,
        target: 'es2020',
        external: e.external,
        alias: e.alias,
      });
      let code = result.outputFiles[0].text;
      if (e.namedExports) {
        const matches = [...code.matchAll(/export default ([^;]+);/g)];
        const lastMatch = matches.at(-1); // 末尾に license バナーが付くことがあるため最後の一致を使う
        if (!lastMatch) throw new Error(`expected an "export default <expr>;" for ${e.entryPath}`);
        const before = code.slice(0, lastMatch.index);
        const after = code.slice(lastMatch.index + lastMatch[0].length);
        code = `${before}const __shimExports = ${lastMatch[1]};
export default __shimExports;
export const { ${e.namedExports.join(', ')} } = __shimExports;
${after}`;
      }
      cache.set(e.virtualId, code);
      return code;
    },
  };
}
```

使い方（`util`/`assert`/`crypto`/`path`/`semver`/`@midnight-ntwrk/midnight-js-utils` を対象にする例）:

```typescript
const utilPkgDir = (stdLibBrowser.util as unknown) as string;
const assertPkgDir = (stdLibBrowser.assert as unknown) as string;
const cryptoPkgDir = (stdLibBrowser.crypto as unknown) as string;
const pathPkgDir = (stdLibBrowser.path as unknown) as string;
const semverEntry = _require.resolve('semver');
// `@midnight-ntwrk/midnight-js-utils` は package.json の exports map に
// "./package.json" が無いため、_require.resolve でエントリファイルを直接解決する
const midnightJsUtilsCjsEntry = _require.resolve('@midnight-ntwrk/midnight-js-utils');
const nodeBuiltinAliasesForEsbuild = Object.fromEntries(
  Object.entries(stdLibBrowser).filter(([find]) => !find.startsWith('node:')),
) as Record<string, string>;

// vite.config.ts の plugins 配列の先頭に追加（他の plugin より前に解決させる）
cjsInteropBuildShimPlugin([
  { specifiers: ['util', 'node:util'], pkgDir: utilPkgDir, entryFile: 'util.js' },
  { specifiers: ['assert', 'node:assert'], pkgDir: assertPkgDir, entryFile: 'build/assert.js' },
  { specifiers: ['path', 'node:path'], pkgDir: pathPkgDir, entryFile: 'index.js' },
  { specifiers: ['semver'], pkgDir: path.dirname(semverEntry), entryFile: path.basename(semverEntry) },
  {
    specifiers: ['@midnight-ntwrk/midnight-js-utils'],
    pkgDir: path.dirname(midnightJsUtilsCjsEntry),
    entryFile: path.basename(midnightJsUtilsCjsEntry),
    // wallet-sdk-address-format は ESM 専用で .wasm ロードを含むため esbuild
    // 単体でバンドルできない。external にして named export だけ再現する。
    external: ['@midnight-ntwrk/wallet-sdk-address-format'],
    namedExports: ['assertDefined', 'assertIsContractAddress', 'assertIsHex', 'toHex', 'fromHex', /* ... */],
  },
  {
    specifiers: ['crypto', 'node:crypto'],
    pkgDir: cryptoPkgDir,
    entryFile: 'index.js',
    // crypto は private-state (手・salt) の LevelDB ストア暗号化に実際に使われる
    // (@midnight-ntwrk/midnight-js-level-private-state-provider)。
    alias: nodeBuiltinAliasesForEsbuild,
    namedExports: ['randomBytes', 'createHash', 'createHmac', 'pbkdf2Sync', 'createCipheriv', 'createDecipheriv', /* ... */],
  },
]);
```

**教訓**: `vm`/`stream` を `resolve.alias` にブランケットで追加/削除する前に、まず「何が実際にそれを import しているか」を確認すること。本プロジェクトでは crypto-browserify の依存ツリーが `require('stream')` するだけで、アプリ自身のコードは `vm`/`stream` を一切 import していなかった。alias から `vm`/`stream` を外して代わりに esbuild 側の `alias` オプションで crypto の shim だけに閉じたスコープで渡すことで、Rollup 側は該当パッケージに一切触れなくなり問題が消えた。**この構成を安易に「整理」して `vm`/`stream` を戻したり `cjsInteropBuildShimPlugin` のエントリを削ったりしないこと** — 一見冗長に見えても本番ビルドの healthcheck。

## 罠その2: Lace の Service Worker が `127.0.0.1` への fetch をブロックする

Lace Wallet はページの全 `fetch` 呼び出しを Service Worker でインターセプトする。Service Worker コンテキストから `http://127.0.0.1:6300`（Proof Server）への fetch は Chrome によって `ERR_FAILED` でブロックされる。

**対処**: Proof Server 宛のリクエストを同一オリジンのパス経由にし、Vite の dev サーバー（Node.js プロセス）でサーバーサイドにプロキシする。同一オリジンなら Service Worker はリクエストをそのまま通過させる:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      '/proof-server': {
        target: 'http://127.0.0.1:6300',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proof-server/, ''),
      },
    },
  },
});
```

```typescript
// providers.ts 側: ProofProvider にはブラウザの window.location.origin 経由の URL を渡す
const proverServerUri = `${window.location.origin}/proof-server`;
const proofProvider = httpClientProofProvider(proverServerUri, zkConfigProvider);
```

本番環境（Lace のブラウザ拡張を使う実運用）では、この同一オリジンパスを実際に到達可能な HTTPS Proof Server へリライトする設定（例: `vercel.json` の `rewrites`）が別途必要になる。dev サーバーのプロキシだけではデプロイ後は機能しない。

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
