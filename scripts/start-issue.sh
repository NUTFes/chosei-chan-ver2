#!/usr/bin/env bash
# Issue に着手する。worktree とブランチの作成 → 着手コミット (空) → push → Draft PR 作成までを行う。
# 着手コミットの時刻がスループット計測の開始時刻になる (docs/planning.md)。
# worktree は .claude/worktrees/issue-<issue番号> に作るので、複数の Issue を並列で進められる。
#
# 使い方: scripts/start-issue.sh <issue番号> [ブランチ名]
set -euo pipefail

if [ $# -lt 1 ]; then
  sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'
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
gh pr create --draft --base develop --title "$title" --body "$body"

echo "worktree: ${worktree}"
