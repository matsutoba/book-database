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
