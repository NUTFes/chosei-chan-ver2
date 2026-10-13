#!/usr/bin/env bash
# start-issue スキルの本体。Issue に着手し、壁打ちを始められる状態まで一気に用意する。
#   1. worktree とブランチの作成 (.claude/worktrees/issue-<issue番号>)
#   2. 着手コミット (空) → push → Draft PR 作成
#   3. 環境構築 (.env.local のコピー、npm ci)
#   4. Issue 本文と、依存関係から見た影響範囲の表示
# 着手コミットの時刻がスループット計測の開始時刻になる (docs/planning.md) ので、2 を時間のかかる 3 より先に行う。
#
# 使い方: .claude/skills/start-issue/start.sh <issue番号> [ブランチ名]
set -euo pipefail

if [ $# -lt 1 ]; then
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
  exit 1
fi

issue="${1#\#}"
title="$(gh issue view "$issue" --json title --jq .title)"

# ブランチ名の既定値は {prefix}/{name}/{issueNo}。prefix は Issue タイトルの [xxx] から取る
prefix="$(sed -n 's/^\[\([a-z]*\)\].*/\1/p' <<<"$title")"
name="$(git config user.name | tr ' ' '-')"
branch="${2:-${prefix:-feat}/${name}/${issue}}"

# どの worktree から実行しても、メインの作業ツリーの下に作る
root="$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")"
worktree="${root}/.claude/worktrees/issue-${issue}"

git fetch origin develop
git worktree add "$worktree" -b "$branch" origin/develop
cd "$worktree"
git commit --allow-empty -m "chore: #${issue} 着手"
git push -u origin "$branch"

body="$(sed "s/resolve #0/resolve #${issue}/" .github/pull_request_template.md)"
pr="$(gh pr create --draft --base develop --title "$title" --body "$body")"

# 環境変数ファイルは git 管理外なので、メインの作業ツリーにあれば持ってくる
if [ -f "${root}/.env.local" ]; then
  cp "${root}/.env.local" .env.local
fi
npm ci --no-audit --no-fund >/dev/null

echo
echo "===== Issue #${issue} ====="
gh issue view "$issue"
if [ -f "${root}/scripts/plan.mjs" ]; then
  echo
  echo "===== 影響範囲 ====="
  node "${root}/scripts/plan.mjs" impact "$issue" || echo "(影響範囲を取得できませんでした)"
fi

echo
echo "pr: ${pr}"
echo "worktree: ${worktree}"
