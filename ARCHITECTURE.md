# システム構成

## データベース

- MySQL 8 を Docker Compose (`docker-compose.yml`) で起動する。
- ホスト側ポートは **3307**（コンテナ内は 3306）。同一ホストの別プロジェクト（`ledger-db`）が 3306 を使用しているための回避。
- 起動: `docker compose up -d` / 停止: `docker compose down`
- 接続情報は `.env` の `DATABASE_URL` で管理する（`.env.example` に雛形あり）。

## ORM

- Prisma 7 を使用（`prisma/schema.prisma`）。
- Prisma 7 では接続文字列は `prisma.config.ts` 経由で読み込まれる（`schema.prisma` の `datasource` ブロックには直接書かない）。`prisma.config.ts` は `dotenv/config` を import して `.env` を読み込む。
- 生成された Prisma Client の出力先は `lib/generated/prisma`（gitignore 対象、コミットしない）。
- マイグレーションは `prisma/migrations` にコミットする。

### マイグレーションの実行方法

- `schema.prisma` を編集 → 以下のコマンドでマイグレーションを作成・適用するのが基本の流れ。

```bash
# スキーマ変更時（開発環境）
# schema.prisma との差分から migrations/ 配下に SQL を生成し、DB に適用、Prisma Client も再生成する
pnpm exec prisma migrate dev --name <わかりやすい名前>

# 生成される SQL を先に確認・編集してから適用したい場合
pnpm exec prisma migrate dev --name <名前> --create-only
pnpm exec prisma migrate dev

# 本番/CI など、差分検出はせず既存の migrations/ を適用するだけの場合
pnpm exec prisma migrate deploy

# スキーマもDBも変えず、Prisma Client の型だけ再生成したい場合
pnpm exec prisma generate

# 開発DBを作り直す場合（破壊的。ローカル DB の中身は全て消える）
pnpm exec prisma migrate reset
```

- `prisma migrate dev` はスキーマ差分検出のためにシャドウDBを一時作成する。そのため `DATABASE_URL` の DB ユーザーには `CREATE` 権限が必要（Docker Compose の `MYSQL_USER`/`MYSQL_PASSWORD` で作成されるユーザーはデフォルトでは対象DBのみの権限のため、必要に応じて `GRANT ALL PRIVILEGES ON *.* TO '<user>'@'%';` を付与する）。

## デプロイ

- 本番は Vercel（Next.js）+ TiDB Cloud（MySQL互換）。
- TiDB Cloud への接続は TLS 必須。`DATABASE_URL` の末尾に `?ssl=true&connectTimeout=10000` を付与する（Prisma 7 は `@prisma/adapter-mariadb` 経由で `mariadb` ドライバーを使っており、`ssl=true` で標準的なTLS検証が有効になる）。この値は Vercel のプロジェクト環境変数として設定し、リポジトリにはコミットしない。
  - `mariadb` ドライバーの `connectTimeout` デフォルトは1000msと短く、TLSハンドシェイクを挟むTiDB Cloudへの接続では間に合わず `pool timeout: failed to retrieve a connection from pool after 10000ms`（エラーコード `45028`）になることがある。`connectTimeout` をクエリパラメータで延長して回避する。
- `package.json` の `build` スクリプトは `prisma migrate deploy && next build`。Vercelのビルドのたびに未適用のマイグレーションをTiDBへ自動適用する（`postinstall` の `prisma generate` はPrisma Clientのコード生成のみで、テーブル作成は行わない）。
  - Preview環境でも同じ `DATABASE_URL`（本番TiDB）を使っている場合、Previewデプロイのビルド時にも本番DBへマイグレーションが適用される点に注意。Preview用に別クラスタ/別DBを分けたい場合は、Vercel環境変数のスコープをProduction/Previewで分ける。

### バッチ処理（NDL同期）

- `POST /api/books/sync`（`app/api/books/sync/route.ts`）を毎朝 5:00 (JST) に実行するため、Vercel Cron Jobs を `vercel.json` で設定している。
  - Vercel Cron は UTC 基準・GETリクエストで叩くため、`schedule` は `0 20 * * *`（前日20:00 UTC = 当日5:00 JST）、ハンドラーには `GET` も実装している。
- 環境変数 `CRON_SECRET` を設定すると、Vercel が Cron 実行時に `Authorization: Bearer <CRON_SECRET>` を自動付与し、ハンドラー側で検証することで第三者による無認可実行を防ぐ（未設定時はローカル開発用に検証をスキップする）。
- Vercel Hobby プランは serverless function の実行時間上限が短い（`maxDuration` は最大60秒）ため、`route.ts` に `export const maxDuration = 60` を設定している。NDLの月間該当件数が多い場合はこの上限に収まらずタイムアウトする可能性があり、その場合は Pro プランへの変更や処理の分割を検討する。
