---
name: start-issue
description: Issue への着手から merge までを進める。Issue 番号を指定して実装を始めるとき (「#11 をやって」「Issue 11 に着手」など) に使う。worktree とブランチを切り、着手コミットと Draft PR を作ってから、壁打ち・実装・レビューへ進む。
---

# Issue に着手して merge まで進める

対象の Issue: $ARGUMENTS (指定がなければユーザーに番号を確認する)

工程と時間の目安は `docs/planning.md` の「見積もりの単位: 枠」にあります。1 枠 (1〜1.5h) に収まらないと分かった時点で、黙って続けずユーザーに伝えてください。

## 1. worktree を切って着手を記録する

何よりも先に実行します。Issue を読むのも壁打ちもこの後です (着手コミットの時刻がスループット計測の開始時刻になるため)。

```bash
scripts/start-issue.sh <issue番号>
```

worktree (`.claude/worktrees/issue-<issue番号>`) とブランチの作成、空の着手コミット、push、Draft PR の作成までを行い、最後に `worktree: <パス>` を出力します。

続けて、出力されたパスへ作業場所を移します。以降の作業はすべてこの worktree の中で行います。

- Claude Code: `EnterWorktree` に `path` を渡す
- それ以外: そのパスへ `cd` する

worktree には `node_modules` がないので、ビルドやテストを動かす前に `npm ci` を実行します。

すでに同じ Issue の worktree がある場合、スクリプトは失敗します。作り直さず、既存の worktree に入って続きから進めてください。

## 2. 仕様を確認し、壁打ちで詳細設計を詰める

- `gh issue view <issue番号>` で本文を読み、関連するコードを確認する
- `node scripts/plan.mjs impact <issue番号>` で先行と後続を確認する。未完了の先行があればユーザーに伝える
- 決まっていない点をユーザーに質問して詰める。コードを読めば分かることは質問しない
- 決まった設計は PR 本文の「概要」に書く

## 3. 初回実装

- 実装してコミットし、push する
- 設計と違う実装になったら、PR 本文も直す

## 4. AI セルフレビューと修正

- PR の差分をレビューし (Claude Code なら `/code-review`)、指摘を修正して push する
- PR 本文の「テスト項目」を埋め、`gh pr ready` で Draft を外す

## 5. 人間のレビューと修正

- ユーザーにレビューを依頼し、指摘を修正して push する。これを指摘がなくなるまで繰り返す
- レビュワーなど他の人が同じ PR にコミットすることがある。作業を再開するときは先に `git pull` する

## 6. マージと後片付け

- マージはユーザーが行う。指示されない限りエージェントはマージしない
- マージ後、worktree を片付ける

  ```bash
  git worktree remove .claude/worktrees/issue-<issue番号>
  ```
