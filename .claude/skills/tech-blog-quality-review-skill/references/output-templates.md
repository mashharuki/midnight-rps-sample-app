# Output Templates

## Template 1: Review Report

```markdown
# 技術ブログレビュー結果

## 総評
- 総合スコア: X/30
- 公開判定: Publish Ready / Needs Revision
- 最重要課題: [1行]

## 評価（6軸）
1. Reader Fit: X/5 - [根拠]
2. Structure and Flow: X/5 - [根拠]
3. Technical Accuracy: X/5 - [根拠]
4. Reproducibility: X/5 - [根拠]
5. Readability and Completion Rate: X/5 - [根拠]
6. Practical Value: X/5 - [根拠]

## 指摘事項（重大度順）
1. [Critical] 問題点 - 影響 - 修正方針
2. [Major] 問題点 - 影響 - 修正方針
3. [Minor] 問題点 - 影響 - 修正方針

## 改善アクション（優先順）
1. まず直すこと
2. 次に直すこと
3. 余力があれば直すこと
```

## Template 2: Rewrite Plan

```markdown
# 改稿プラン

## 新しい記事構成案
1. 導入（対象読者・課題・結論）
2. 背景（なぜこの問題が起きるか）
3. 解決手順（最小再現）
4. 応用/注意点（失敗例・制約）
5. まとめ（再掲 + 次アクション）

## Before/After 主要差分
- タイトル: [Before] -> [After]
- 導入: [Before] -> [After]
- 手順説明: [Before] -> [After]

## 追加すべき検証
- [ ] バージョン明記
- [ ] 実行コマンド検証
- [ ] 期待結果スクリーンショット/ログ
```
