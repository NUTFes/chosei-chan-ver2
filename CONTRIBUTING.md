# Git 運用ルール

人間も AI エージェントも、この文書に従って開発します。

## ブランチ

- 常設のブランチは、デフォルトブランチの `develop` だけです。`main` とリリース用のブランチは作りません。
- 作業ブランチは `develop` から切り、PR で `develop` へ戻します。`develop` へ直接 push しません。
- 作業ブランチ名は `{prefix}/{name}/#{issueNo}_{内容}` にします。
  - 例: `docs/timdaik/#1_git-rules`
  - `{name}` は `git config user.name` の値です。空白は `-` に置き換えます。
  - `{内容}` は英小文字・数字をハイフンでつないだ 2〜4 語にします。
  - シェルでは `#` を含むブランチ名をクォートします (`git switch 'docs/timdaik/#1_git-rules'`)。
- Issue への着手は `start-issue` スキルで行います。ブランチは `.claude/skills/start-issue/start.sh <issue番号> <内容>` が作ります。
- `develop` に入った変更を取り消すときは、履歴を書き換えず `git revert` の PR を出します。

## prefix

ブランチ名とコミットメッセージで、次の prefix を使います。

| prefix     | 用途                                                       | PR に付くラベル |
| ---------- | ---------------------------------------------------------- | --------------- |
| `feat`     | 機能の追加・変更                                           | `enhancement`   |
| `fix`      | バグ修正                                                   | `bug`           |
| `docs`     | ドキュメントのみの変更                                     | `documentation` |
| `refactor` | 挙動を変えないコードの整理                                 | なし            |
| `test`     | テストの追加・修正                                         | なし            |
| `chore`    | 上のどれでもないもの (設定、CI、依存関係、スクリプトなど)   | なし            |

- Issue タイトルの `[xxx]` がこの表にない種別 (`[infra]` / `[research]` など) の場合、ブランチの prefix は `chore` にします。
- Issue タイトルに `[xxx]` がない場合、ブランチの prefix は `feat` にします。

## コミットメッセージ

- `{prefix}: #{issueNo} {message}` にします。例: `docs: #1 Git運用ルールを追加`
- `#{issueNo}` は Issue に紐づくときに付けます。紐づかない変更は `{prefix}: {message}` で構いません。
- 1 コミットの中身に合う prefix を選びます。ブランチの prefix と違っても構いません。
- 着手コミット (`chore: #{issueNo} 着手`) は `start.sh` が打ちます。

## Pull Request

- `develop` 向けに出します。着手時に `start.sh` が Draft で作ります。
- タイトルは Issue のタイトルと同じにします (例: `[docs] Git運用ルールの明文化`)。本文に `resolve #{issueNo}` を入れます。
- ラベルは prefix から付けます (上の表)。`start.sh` を通さずに PR を作った場合は手で付けます。
- マージは人間が行います。マージコミットを作る方法 (Create a merge commit) を使います。

## 整形

- push 時の自動整形コミットは行いません。push の前に手元で次のコマンドを実行します。

  ```bash
  npm run format -- "src/**/*.{ts,tsx,js,jsx}"
  ```

## リリース

- マージされた時点で本番に反映される前提です。タグは反映の関門ではなく、履歴に付ける目印です。
- リリースを切るのは人間だけです。エージェントはタグを打ちません。
- タグは `v2.{MINOR}.{PATCH}` にします。初回は `v2.0.0` (ver2 の初公開) です。
  - MINOR: 利用者に見える機能が入ったリリース (`feat` の PR を含む)
  - PATCH: 修正だけのリリース (`fix` のみ)
  - `docs` / `refactor` / `test` / `chore` だけの変更ではリリースを切りません。
- 機能のまとまりが `develop` に入ったときに切ります。マイルストーンの完了と重なることが多いですが、縛られません。

手順は次のとおりです (コマンドの `v2.1.0` は、決めた番号に置き換えます)。

1. 前のタグ以降の変更を確認して番号を決めます。

   ```bash
   git fetch origin --tags
   git log "$(git describe --tags --abbrev=0 origin/develop)..origin/develop" --oneline
   ```

2. 下書きで作ります。タグは公開時に GitHub 側で作られるため、手元での `git tag` は不要です。

   ```bash
   gh release create v2.1.0 --target develop --generate-notes --draft
   ```

3. GitHub 上で下書きを確認し、先頭に変更点の要約を 2〜3 行足します。
4. 公開します。

   ```bash
   gh release edit v2.1.0 --draft=false
   ```

- リリースノートに載るのは、前のタグ以降にマージされた PR です。分類は PR のラベルと `.github/release.yml` で決まります。
- 公開後に間違いに気づいたら、タグを付け替えず次の番号で出し直します。
