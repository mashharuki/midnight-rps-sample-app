# タスク完了時のチェックリスト

## 必須実行コマンド

1. **フォーマット**
   ```bash
   bun run format
   ```

2. **リント**
   ```bash
   bun run lint
   ```

3. **型チェック**
   ```bash
   bun run typecheck
   ```

4. **テスト** (コントラクト変更時)
   ```bash
   bun run test
   ```

5. **ビルド確認** (大きな変更時)
   ```bash
   bun run build
   ```

## 注意事項

- `pkgs/contract/src/managed/` 配下はコンパイル生成物なので直接編集しない
- `bun run sync-keys` は contract ビルド後に実行して ZK キーを app/public に同期
- Docker インフラが起動していないと CLI・フロントエンドの動作確認不可
- Proof Server (port 6300) への接続確認: `curl http://localhost:6300/version`
- Lace Wallet 拡張機能 (Chrome) が必要

## Kiro スペック駆動開発フロー

```
/kiro-spec-requirements {feature}   # 要件定義
/kiro-spec-design {feature}         # 設計
/kiro-spec-tasks {feature}          # タスク生成
/kiro-impl {feature}                # 実装
/kiro-spec-status {feature}         # 進捗確認
```

現在の実装スペック: `.kiro/specs/midnight-rps-dapp/`
- Phase: requirements-generated (承認待ち)
