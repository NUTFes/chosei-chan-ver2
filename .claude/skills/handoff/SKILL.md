---
name: handoff
description: 実装担当のエージェントへ Herdr 経由で作業を依頼し、終わるまで待つ。start-issue で実装計画を書き終えたあと、self-review で修正が必要な指摘を出したあとに使う。
---

# 実装担当へ依頼して、終わるまで待つ

設計・レビュー担当のセッションから、実装担当のエージェントを Herdr の隣のペインで動かします。
実装担当のエージェントの種類は `AGENTS.md` の「開発フローと責務分担」の表で決まります (現在は Codex = `--kind codex`)。

Herdr の操作は `herdr` スキルの決まりに従います。コマンドの書式は `herdr agent` / `herdr pane` の出力が正で、ID は必ず応答の JSON から読みます。

## 0. Herdr の中にいるか確認する

```bash
test "${HERDR_ENV:-}" = 1
```

失敗した場合は Herdr を操作しません。ユーザーに次を伝えて終わります。

- worktree のパスと PR の URL
- worktree で実装担当のエージェントを起動し、依頼文をそのまま渡してほしいこと
- 終わったら、このセッションで続き (`self-review` スキル) を頼んでほしいこと

## 1. 実装担当のエージェントを用意する

エージェント名は `impl-<issue番号>` です (例: `impl-11`)。Issue ごとに 1 つ作り、修正の依頼でも同じエージェントを使い続けます。

```bash
herdr agent list
```

- `impl-<issue番号>` がすでにいれば、それを使う (2 へ進む)
- いなければ、自分のペインを分割して起動する。作業ディレクトリは Issue の worktree にする

  ```bash
  herdr pane layout --pane "$HERDR_PANE_ID"   # 横長なら right、縦長なら down に分割する
  herdr pane split --current --direction right --cwd <worktreeのパス> --no-focus
  herdr agent start impl-<issue番号> --kind codex --pane <応答の .result.pane.pane_id>
  ```

`agent start` が `agent_not_ready` を返したら、起動時の確認画面で止まっています。`herdr agent read impl-<issue番号>` で内容を確認し、ユーザーに伝えて対応を待ちます。

## 2. 依頼して待つ

```bash
herdr agent prompt impl-<issue番号> "<依頼文>" --wait --timeout 1800000
```

- 依頼文は呼び出し元のスキルが指定したものをそのまま使う。実装の中身は Issue と PR に書いてあるので、依頼文には書き足さない
- タイムアウトは 30 分。1 枠 (1〜1.5h) のうち実装に使える時間を超えたら、待ち続けずに状況を確認する

## 3. 結果を確認する

```bash
herdr agent get impl-<issue番号>
herdr agent read impl-<issue番号> --source recent-unwrapped --lines 120
```

| 状態                     | 対応                                                                                           |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `idle` / `done`          | PR に新しい「実装報告」のコメントがあることを確認し、呼び出し元のスキルの続きへ進む            |
| `blocked`                | 承認や質問で止まっている。内容を読んでユーザーに伝える。自分では承認も回答もしない             |
| タイムアウト / `unknown` | 画面を読んで状況をユーザーに伝える。同じ依頼をもう一度送らない (届いていないとは限らない)      |

実装報告がないまま `idle` になっている場合は、実装担当が途中で止まっています。画面を読み、理由をユーザーに伝えます。

## 守ること

- フォーカスは動かさない (`--no-focus`)。ユーザーは自分で実装担当のペインに移って口を挟める
- 自分で作っていないペインやエージェントは閉じない。`impl-<issue番号>` のペインも、マージ後にユーザーが片付ける
- 実装担当の代わりにコードを直さない。止まった理由が計画の不足なら、設計 (`start-issue` スキルの「計画を直すとき」) へ戻す
