.DEFAULT_GOAL := help

.PHONY: help setup skills-update dev build lint lint-fix format format-check test storybook check

help: ## ターゲット一覧を表示する
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z-]+:.*## / {printf "  %-14s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## mise のツール (Node・Herdr) と依存パッケージを入れる
	@command -v mise >/dev/null 2>&1 || { echo "mise が必要です。https://mise.jdx.dev/getting-started.html を参照して導入してください"; exit 1; }
	mise trust
	mise install
	mise exec -- npm ci

skills-update: ## 外部スキルを最新版に更新する
	npx skills update -p -y

dev: ## 開発サーバーを起動する
	npm run dev

build: ## 本番ビルドする
	npm run build

lint: ## ESLint で検査する
	npm run lint

lint-fix: ## ESLint で自動修正する
	npm run lint:fix

format: ## Prettier で整形する
	npm run format

format-check: ## 整形されているか確認する (書き換えない)
	npm run format:check

test: ## テストを 1 回実行する
	npm run test

storybook: ## Storybook を起動する (ポート 6006)
	npm run storybook

check: ## lint・整形チェック・テスト・build をまとめて実行する
	$(MAKE) lint
	$(MAKE) format-check
	$(MAKE) test
	$(MAKE) build
