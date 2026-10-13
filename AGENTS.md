# AGENTS.md

AI エージェント向けの入口です。技術スタック・コマンド・ディレクトリ構成などは #5 で追記します。

## マイルストーンとタスクの見積もり

ルールの本体は [docs/planning.md](docs/planning.md) にあります。マイルストーンの設計・再設計、Issue の追加、日程の相談を受けたときは、先に読んでください。

- 見積もりは外れる前提で、着手から merge までの実績を計測して直し続ける
- Issue 1 件 = 1 枠 (1〜1.5h)。1 日に着手するのは最大 3 枠、稼働日は平日のみ
- 計画の実体は GitHub (Milestones / Project #34 / Issue の依存関係) に置く。リポジトリに日程表を作らない
- Issue に着手するときは `start-issue` スキルを使う。仕様確認より先に実行する (着手コミットの時刻がスループット計測の開始時刻になる)

  ```bash
  /start-issue <issue番号>                          # Claude Code
  .claude/skills/start-issue/start.sh <issue番号>   # それ以外。続きは同じディレクトリの SKILL.md に従う
  ```

  worktree 作成 → 着手コミット (空) → push → Draft PR → 環境構築までを行う

- 作業は出力された worktree (`.claude/worktrees/issue-<issue番号>`) の中で行う
- 以降の作業はその PR に積む。別の PR を作り直さない
- Issue を起票するときは、Project への追加・`Size`・親 Epic・依存関係 (`Blocked by`) まで設定する
- 日程や Issue を変更する前後に、次のコマンドで確認する

  ```bash
  node scripts/plan.mjs status          # マイルストーンごとの残り枠・日ごとの枠数・警告
  node scripts/plan.mjs impact <issue>  # 指定 Issue の先行 / 後続 (影響範囲)
  node scripts/plan.mjs throughput      # 着手コミット → merge の実績と残り日数
  ```

- 期日の変更、マイルストーン間の移動、スコープの削減は人間が判断する。エージェントは影響範囲と選択肢を示す
