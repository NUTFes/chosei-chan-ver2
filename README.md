![Frame 18](https://github.com/NUTFes/chosei-chan/assets/52590941/7b91db8b-5b4b-4528-87aa-82398cefeec0)

このリポジトリはハッカソンで作成した「調整ちゃん」のリポジトリです。

## Getting Started

`make setup` は、Herdr が未導入なら[公式インストーラ](https://herdr.dev/install.sh)で `~/.local/bin` にインストールし、続けて依存パッケージを入れます。インストール先は環境変数 `HERDR_INSTALL_DIR` で変更できます。

`~/.local/bin` (インストール先を変更した場合はそのディレクトリ) を PATH に追加してください。Herdr の更新は `herdr update` で行います。

```bash
make setup
make dev
```

`make` でターゲット一覧を表示できます。

## Storybook Usage

以下のコマンドでポート6006番にStorybookが起動します

```bash
make storybook
```

## ルール

Git 運用ルールは [CONTRIBUTING.md](CONTRIBUTING.md) を参照してください。
