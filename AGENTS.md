# AGENTS.md

AI エージェント向けの入口です。技術スタック・コマンド・ディレクトリ構成などは #5 で追記します。

## マイルストーンとタスクの見積もり

ルールの本体は [docs/planning.md](docs/planning.md) にあります。マイルストーンの設計・再設計、Issue の追加、日程の相談を受けたときは、先に読んでください。

- 見積もりは外れる前提で、着手から merge までの実績を計測して直し続ける
- Issue 1 件 = 1 枠 (1〜1.5h)。1 日に着手するのは最大 3 枠、稼働日は平日のみ
- 計画の実体は GitHub (Milestones / Project #34 / Issue の依存関係) に置く。リポジトリに日程表を作らない
- Issue に着手するときは、最初に自分を assign する (スループット計測の開始時刻になる)

  ```bash
  gh issue edit <issue番号> --add-assignee @me
  ```

- PR 本文には `resolve #<issue番号>` を書く
- Issue を起票するときは、Project への追加・`Size`・親 Epic・依存関係 (`Blocked by`) まで設定する
- 日程や Issue を変更する前後に、次のコマンドで確認する

  ```bash
  node scripts/plan.mjs status          # マイルストーンごとの残り枠・日ごとの枠数・警告
  node scripts/plan.mjs impact <issue>  # 指定 Issue の先行 / 後続 (影響範囲)
  node scripts/plan.mjs throughput      # 実績ペースと残り日数
  ```

- 期日の変更、マイルストーン間の移動、スコープの削減は人間が判断する。エージェントは影響範囲と選択肢を示す
